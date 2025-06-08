import React, { useState, useRef, useEffect } from 'react';
import type { GlobeMethods } from 'react-globe.gl';
import { MapPin, Globe2, Navigation, Settings, ExternalLink, Lock, Unlock } from 'lucide-react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';

import InfoModal from './InfoModal';
import { KANSAS_LOCATION, prehistoricMapOptions } from '../utils/mapData';
import type { PointOfView, LocationCoordinates, PrehistoricMapOption } from '../types';
import GlobePanel from './GlobalPanel';

const WIDE_LAYOUT_ALTITUDE_TARGET = KANSAS_LOCATION.altitude ?? 2.5;
const NARROW_LAYOUT_ALTITUDE_TARGET = 2;

const GlobeViewer: React.FC = () => {
    const globeEl = useRef<GlobeMethods | undefined>(undefined);
    const secondaryGlobeEl = useRef<GlobeMethods | undefined>(undefined);
    const secondaryGlobePanelRef = useRef<HTMLDivElement>(null);
    const primaryGlobePanelRef = useRef<HTMLDivElement>(null);

    const [globeReady, setGlobeReady] = useState(false);
    const [secondaryGlobeReady, setSecondaryGlobeReady] = useState(false);
    const [primaryGlobeDimensions, setPrimaryGlobeDimensions] = useState({ width: 400, height: 400 });
    const [secondaryGlobeDimensions, setSecondaryGlobeDimensions] = useState({ width: 400, height: 400 });

    const [showInfoModal, setShowInfoModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    function getAntipodal(coords: LocationCoordinates): LocationCoordinates {
        return { lat: -coords.lat, lng: coords.lng < 0 ? coords.lng + 180 : coords.lng - 180, altitude: coords.altitude };
    }

    const [pointOfView, setPointOfView] = useState<PointOfView>(KANSAS_LOCATION);
    const [secondaryPointOfView, setSecondaryPointOfView] = useState<PointOfView>(getAntipodal(KANSAS_LOCATION));
    const latestPovs = useRef({ primary: pointOfView, secondary: secondaryPointOfView });

    const [isDualModeLocked, setIsDualModeLocked] = useState(true);
    const povOffset = useRef({ lat: 0, lng: 0 });

    const [secondaryGlobeMode, setSecondaryGlobeMode] = useState<'antipodal' | 'prehistoric_same_point' | 'dual-point'>('antipodal');
    const [selectedPrehistoricMap, setSelectedPrehistoricMap] = useState<PrehistoricMapOption | null>(null);

    const [isNarrowLayout, setIsNarrowLayout] = useState(window.innerWidth < 1024);

    const initialAnimationToKansasDone = useRef(false);
    const ipLookupAttempted = useRef(false);
    const expectAnimatedMoveRef = useRef(false);
    const activeInteractionGlobeRef = useRef<'main' | 'secondary' | null>(null);
    const programmaticMoveInProgressRef = useRef(false);
    const syncThrottle = useRef<NodeJS.Timeout | null>(null);

    const [attributionPopover, setAttributionPopover] = useState<{ text: string; x: number; y: number } | null>(null);
    const attributionPopoverRef = useRef<HTMLDivElement>(null);

    const { mapSlug: mapSlugFromParams } = useParams<{ mapSlug?: string }>();
    const navigate = useNavigate();

    const [searchParams, setSearchParams] = useSearchParams();
    const [showMapTiles, setShowMapTiles] = useState(() => searchParams.get('map') === 't');

    useEffect(() => {
        latestPovs.current = { primary: pointOfView, secondary: secondaryPointOfView };
    }, [pointOfView, secondaryPointOfView]);

    useEffect(() => {
        const tilesParam = searchParams.get('map');
        const shouldShowTiles = tilesParam === 't';
        if (shouldShowTiles !== showMapTiles) setShowMapTiles(shouldShowTiles);
    }, [searchParams]);

    const handleMapTilesToggle = (checked: boolean) => {
        setShowMapTiles(checked);
        const newSearchParams = new URLSearchParams(searchParams);
        if (checked) newSearchParams.set('map', 't');
        else newSearchParams.delete('map');
        setSearchParams(newSearchParams, { replace: true });
    };

    useEffect(() => {
        const slug = mapSlugFromParams?.toLowerCase() || 'antipodal';
        let newMode: 'antipodal' | 'prehistoric_same_point' | 'dual-point' = 'antipodal';
        let newMap: PrehistoricMapOption | null = null;
        let targetPath = `/${slug}`;

        if (slug === 'antipodal') { /* Default */ }
        else if (slug === 'dual-point') newMode = 'dual-point';
        else {
            const map = prehistoricMapOptions.find(m => m.slug === slug);
            if (map) {
                newMode = 'prehistoric_same_point';
                newMap = map;
            } else targetPath = '/antipodal';
        }

        setSecondaryGlobeMode(newMode);
        setSelectedPrehistoricMap(newMap);

        const currentPath = window.location.pathname.endsWith('/')
            ? window.location.pathname.slice(0, -1)
            : window.location.pathname;

        if (currentPath.toLowerCase() !== targetPath) navigate(targetPath, { replace: true });
    }, [mapSlugFromParams, navigate]);

    useEffect(() => {
        if (secondaryGlobeMode === 'dual-point' && pointOfView.lat != null && pointOfView.lng != null && secondaryPointOfView.lat != null && secondaryPointOfView.lng != null) {
            povOffset.current = { lat: secondaryPointOfView.lat - pointOfView.lat, lng: secondaryPointOfView.lng - pointOfView.lng };
        }
    }, [pointOfView.lat, pointOfView.lng, secondaryPointOfView.lat, secondaryPointOfView.lng, secondaryGlobeMode]);

    const primaryGlobePointData = (): any[] => (pointOfView.lat != null && pointOfView.lng != null) ? [{ ...pointOfView, name: 'Current Location', color: '#3b82f6', size: 0.8 }] : [];
    const secondaryGlobePointData = (): any[] => {
        if (secondaryGlobeMode === 'dual-point') return (secondaryPointOfView.lat != null && secondaryPointOfView.lng != null) ? [{ ...secondaryPointOfView, name: 'Secondary Point', color: '#eab308', size: 0.8 }] : [];
        if (pointOfView.lat == null || pointOfView.lng == null) return [];
        if (secondaryGlobeMode === 'prehistoric_same_point') return [{ ...pointOfView, name: `Location on ${selectedPrehistoricMap?.name.split('(')[0].trim() || 'Prehistoric Map'}`, color: '#f97316', size: 0.8 }];
        return [{ ...getAntipodal(pointOfView as LocationCoordinates), name: 'Antipodal Point', color: '#10b981', size: 0.8 }];
    };

    function normalizeCoordinates(lat: number, lng: number): { lat: number; lng: number } {
        // Clamp latitude to avoid gimbal lock at poles
        const MAX_LAT = 89.9;
        const MIN_LAT = -89.9;

        let normalizedLat = lat;
        let normalizedLng = lng;

        // If latitude exceeds bounds, clamp it and adjust longitude for pole wrapping
        if (lat > MAX_LAT) {
            normalizedLat = MAX_LAT;
        } else if (lat < MIN_LAT) {
            normalizedLat = MIN_LAT;
        }

        // Normalize longitude to [-180, 180]
        while (normalizedLng > 180) normalizedLng -= 360;
        while (normalizedLng < -180) normalizedLng += 360;

        return { lat: normalizedLat, lng: normalizedLng };
    }


    const handleUserPovChange = (newPovFromEvent: PointOfView, globeIdentifier: 'main' | 'secondary') => {
        if (programmaticMoveInProgressRef.current) return;
        if (newPovFromEvent.lat == null || newPovFromEvent.lng == null || newPovFromEvent.altitude == null) return;

        const newPov = newPovFromEvent as LocationCoordinates;
        if (globeIdentifier === 'main') latestPovs.current.primary = newPov;
        else latestPovs.current.secondary = newPov;

        expectAnimatedMoveRef.current = false;
        activeInteractionGlobeRef.current = globeIdentifier;

        if (secondaryGlobeMode === 'dual-point') {
            if (isDualModeLocked) {
                if (globeIdentifier === 'main') {
                    // Normalize the calculated position to handle pole issues
                    const targetPos = normalizeCoordinates(
                        newPov.lat + povOffset.current.lat,
                        newPov.lng + povOffset.current.lng
                    );
                    secondaryGlobeEl.current?.pointOfView({
                        ...targetPos,
                        altitude: newPov.altitude
                    }, 0);
                } else {
                    const targetPos = normalizeCoordinates(
                        newPov.lat - povOffset.current.lat,
                        newPov.lng - povOffset.current.lng
                    );
                    globeEl.current?.pointOfView({
                        ...targetPos,
                        altitude: newPov.altitude
                    }, 0);
                }
            } else { // Unlocked, but sync zoom live
                if (globeIdentifier === 'main') {
                    secondaryGlobeEl.current?.pointOfView({
                        ...latestPovs.current.secondary,
                        altitude: newPov.altitude
                    }, 0);
                } else {
                    globeEl.current?.pointOfView({
                        ...latestPovs.current.primary,
                        altitude: newPov.altitude
                    }, 0);
                }
            }
        } else {
            if (globeIdentifier === 'main') {
                const targetPov = secondaryGlobeMode === 'prehistoric_same_point'
                    ? newPov
                    : getAntipodal(newPov);
                secondaryGlobeEl.current?.pointOfView(targetPov, 0);
            } else {
                const targetPov = secondaryGlobeMode === 'prehistoric_same_point'
                    ? newPov
                    : getAntipodal(newPov);
                globeEl.current?.pointOfView(targetPov, 0);
            }
        }

        if (syncThrottle.current) clearTimeout(syncThrottle.current);
        syncThrottle.current = setTimeout(() => {
            const lastMoved = activeInteractionGlobeRef.current;

            if (secondaryGlobeMode === 'dual-point') {
                if (isDualModeLocked) {
                    if (lastMoved === 'main') {
                        const finalPrimary = latestPovs.current.primary as LocationCoordinates;
                        setPointOfView(finalPrimary);

                        // Normalize when setting state too
                        const normalizedSecondary = normalizeCoordinates(
                            finalPrimary.lat + povOffset.current.lat,
                            finalPrimary.lng + povOffset.current.lng
                        );
                        setSecondaryPointOfView({
                            ...normalizedSecondary,
                            altitude: finalPrimary.altitude
                        });
                    } else {
                        const finalSecondary = latestPovs.current.secondary as LocationCoordinates;
                        setSecondaryPointOfView(finalSecondary);

                        const normalizedPrimary = normalizeCoordinates(
                            finalSecondary.lat - povOffset.current.lat,
                            finalSecondary.lng - povOffset.current.lng
                        );
                        setPointOfView({
                            ...normalizedPrimary,
                            altitude: finalSecondary.altitude
                        });
                    }
                } else { // Unlocked
                    const finalPrimary = { ...latestPovs.current.primary as LocationCoordinates };
                    const finalSecondary = { ...latestPovs.current.secondary as LocationCoordinates };
                    if (lastMoved === 'main') {
                        finalSecondary.altitude = finalPrimary.altitude;
                    } else {
                        finalPrimary.altitude = finalSecondary.altitude;
                    }
                    setPointOfView(finalPrimary);
                    setSecondaryPointOfView(finalSecondary);
                }
            } else {
                if (lastMoved === 'main') {
                    setPointOfView(latestPovs.current.primary);
                } else {
                    const pov = latestPovs.current.secondary as LocationCoordinates;
                    setPointOfView(secondaryGlobeMode === 'prehistoric_same_point'
                        ? pov
                        : getAntipodal(pov));
                }
            }
            syncThrottle.current = null;
        }, 100);
    };

    const handleDualModeLockToggle = () => {
        if (!isDualModeLocked) {
            // About to lock - ensure we use the latest positions
            if (syncThrottle.current) {
                clearTimeout(syncThrottle.current);
                syncThrottle.current = null;
            }

            // Force immediate state sync with latest positions
            const currentPrimary = latestPovs.current.primary;
            const currentSecondary = latestPovs.current.secondary;

            if (currentPrimary.lat != null && currentPrimary.lng != null &&
                currentSecondary.lat != null && currentSecondary.lng != null) {

                // Calculate offset based on current positions
                const newOffset = {
                    lat: currentSecondary.lat - currentPrimary.lat,
                    lng: currentSecondary.lng - currentPrimary.lng
                };

                // Update offset immediately
                povOffset.current = newOffset;

                // Ensure state is synced before locking
                setPointOfView(currentPrimary);
                setSecondaryPointOfView(currentSecondary);
            }
        }

        // Toggle the lock state
        setIsDualModeLocked(prev => !prev);
    };

    useEffect(() => {
        if (!globeReady || !secondaryGlobeReady || initialAnimationToKansasDone.current) return;

        initialAnimationToKansasDone.current = true;
        programmaticMoveInProgressRef.current = true;

        const initialAltitude = isNarrowLayout ? NARROW_LAYOUT_ALTITUDE_TARGET : WIDE_LAYOUT_ALTITUDE_TARGET;
        const kansasWithLayoutAltitude = { ...KANSAS_LOCATION, altitude: initialAltitude };
        let initialSecondaryPovBase = getAntipodal(KANSAS_LOCATION);
        if (secondaryGlobeMode === 'prehistoric_same_point' && selectedPrehistoricMap) initialSecondaryPovBase = KANSAS_LOCATION;

        const initialSecondaryPov = { ...initialSecondaryPovBase, altitude: initialAltitude };

        globeEl.current?.pointOfView(kansasWithLayoutAltitude, 0);
        secondaryGlobeEl.current?.pointOfView(initialSecondaryPov, 0);

        setPointOfView(kansasWithLayoutAltitude);
        setSecondaryPointOfView(initialSecondaryPov);
        latestPovs.current = { primary: kansasWithLayoutAltitude, secondary: initialSecondaryPov };

        setTimeout(() => { programmaticMoveInProgressRef.current = false; }, 100);

        setTimeout(() => {
            if (ipLookupAttempted.current) return;
            ipLookupAttempted.current = true;
            setIsLoading(true);
            fetch('https://ipapi.co/json/').then(res => res.json()).then(data => {
                if (data.latitude && data.longitude) {
                    expectAnimatedMoveRef.current = true;
                    setPointOfView(prev => ({ lat: data.latitude, lng: data.longitude, altitude: prev.altitude }));
                }
            }).catch(e => console.warn('IP-based geolocation failed.', e)).finally(() => setIsLoading(false));
        }, 1500);
    }, [globeReady, secondaryGlobeReady, secondaryGlobeMode, selectedPrehistoricMap, isNarrowLayout]);

    useEffect(() => {
        if (secondaryGlobeMode === 'dual-point' || !initialAnimationToKansasDone.current || activeInteractionGlobeRef.current !== null || programmaticMoveInProgressRef.current) return;
        const pov = pointOfView as LocationCoordinates;
        if (pov.lat == null || pov.lng == null || pov.altitude == null) return;
        const duration = expectAnimatedMoveRef.current ? 1000 : 0;
        globeEl.current?.pointOfView(pov, duration);
        const targetPov = secondaryGlobeMode === 'prehistoric_same_point' ? pov : getAntipodal(pov);
        secondaryGlobeEl.current?.pointOfView(targetPov, duration);
        if (expectAnimatedMoveRef.current) expectAnimatedMoveRef.current = false;
    }, [pointOfView]);

    useEffect(() => {
        if (secondaryGlobeMode !== 'dual-point' || !initialAnimationToKansasDone.current || activeInteractionGlobeRef.current !== null || programmaticMoveInProgressRef.current) return;
        secondaryGlobeEl.current?.pointOfView(secondaryPointOfView, expectAnimatedMoveRef.current ? 1000 : 0);
    }, [secondaryPointOfView]);


    useEffect(() => {
        const handleResize = () => {
            setTimeout(() => {
                if (secondaryGlobePanelRef.current) {
                    const rect = secondaryGlobePanelRef.current.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) setSecondaryGlobeDimensions({ width: rect.width, height: rect.height });
                }
                if (primaryGlobePanelRef.current) {
                    const rect = primaryGlobePanelRef.current.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) setPrimaryGlobeDimensions({ width: rect.width, height: rect.height });
                }
            }, 50);
            const currentlyNarrow = window.innerWidth < 1024;
            if (currentlyNarrow !== isNarrowLayout) setIsNarrowLayout(currentlyNarrow);
        };

        setTimeout(handleResize, 100);
        window.addEventListener('resize', handleResize);
        const resizeObserver = new ResizeObserver(handleResize);
        if (secondaryGlobePanelRef.current) resizeObserver.observe(secondaryGlobePanelRef.current);
        if (primaryGlobePanelRef.current) resizeObserver.observe(primaryGlobePanelRef.current);

        return () => { window.removeEventListener('resize', handleResize); resizeObserver.disconnect(); };
    }, [isNarrowLayout]);

    const resetToUserLocation = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();
            expectAnimatedMoveRef.current = true;
            const targetLat = data.latitude ?? KANSAS_LOCATION.lat;
            const targetLng = data.longitude ?? KANSAS_LOCATION.lng;
            setPointOfView(prev => ({ lat: targetLat, lng: targetLng, altitude: prev.altitude }));
            if (secondaryGlobeMode === 'dual-point' && isDualModeLocked) {
                setSecondaryPointOfView(prev => ({ lat: targetLat + povOffset.current.lat, lng: targetLng + povOffset.current.lng, altitude: prev.altitude }));
            }
            activeInteractionGlobeRef.current = null;
        } catch (error) {
            console.warn('Failed to reset to user location.', error);
            expectAnimatedMoveRef.current = true;
            setPointOfView(prev => ({ ...KANSAS_LOCATION, altitude: prev.altitude }));
            activeInteractionGlobeRef.current = null;
        } finally { setIsLoading(false); }
    };

    const handleSecondaryGlobeOptionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const value = event.target.value;
        let newPath = (value === 'antipodal' || value === 'dual-point') ? `/${value}` : `/${prehistoricMapOptions.find(m => m.url === value)?.slug || 'antipodal'}`;
        
        // add map tiles parameter if enabled
        if (showMapTiles) {
            const currentSearchParams = new URLSearchParams(searchParams);
            currentSearchParams.set('map', 't');
            newPath += `?${currentSearchParams.toString()}`;
        }

        if (window.location.pathname.toLowerCase() !== newPath.toLowerCase()) {
            activeInteractionGlobeRef.current = null;
            expectAnimatedMoveRef.current = true;
            navigate(newPath);
        }
    };

    const handleAttributionClick = (text: string, event: React.MouseEvent) => { event.stopPropagation(); setAttributionPopover({ text, x: event.clientX, y: event.clientY }); };
    useEffect(() => { const handleClickOutside = (event: MouseEvent) => { if (attributionPopoverRef.current && !attributionPopoverRef.current.contains(event.target as Node)) setAttributionPopover(null); }; if (attributionPopover) document.addEventListener('mousedown', handleClickOutside); else document.removeEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside); }, [attributionPopover]);
    useEffect(() => { if (!showInfoModal) setAttributionPopover(null); }, [showInfoModal]);

    useEffect(() => {
        const handleInteractionEnd = () => { if (syncThrottle.current) clearTimeout(syncThrottle.current); setTimeout(() => { activeInteractionGlobeRef.current = null; }, 150); };
        window.addEventListener('mouseup', handleInteractionEnd);
        window.addEventListener('touchend', handleInteractionEnd);
        window.addEventListener('touchcancel', handleInteractionEnd);
        return () => { window.removeEventListener('mouseup', handleInteractionEnd); window.removeEventListener('touchend', handleInteractionEnd); window.removeEventListener('touchcancel', handleInteractionEnd); if (syncThrottle.current) clearTimeout(syncThrottle.current); };
    }, []);

    const secondaryGlobeImageUrl = secondaryGlobeMode === 'prehistoric_same_point' && selectedPrehistoricMap ? selectedPrehistoricMap.url : "//unpkg.com/three-globe/example/img/earth-day.jpg";
    const secondaryGlobeAtmosphereColor = secondaryGlobeMode === 'prehistoric_same_point' ? '#f97316' : (secondaryGlobeMode === 'dual-point' ? '#eab308' : '#10b981');
    const secondaryGlobeLabel = secondaryGlobeMode === 'antipodal' ? 'Antipodal' : (secondaryGlobeMode === 'dual-point' ? 'Secondary' : selectedPrehistoricMap?.name.split('(')[0].trim() || 'Prehistoric');
    const secondaryGlobeLabelColor = secondaryGlobeMode === 'antipodal' ? 'bg-emerald-500' : (secondaryGlobeMode === 'dual-point' ? 'bg-yellow-500' : 'bg-orange-500');

    let juxtaGlobeSubtitle = "Compare Earth's present with its past or its opposite point.";
    if (secondaryGlobeMode === 'antipodal') juxtaGlobeSubtitle = "Showing modern Earth alongside its antipodal point.";
    else if (secondaryGlobeMode === 'dual-point') juxtaGlobeSubtitle = "Set two independent points and rotate them in sync.";
    else if (selectedPrehistoricMap) {
        const mapNamePart = selectedPrehistoricMap.name.split('(')[0].trim();
        const mapAgePart = selectedPrehistoricMap.name.match(/\(([^)]+)\)/)?.[1];
        juxtaGlobeSubtitle = `Comparing modern Earth with the ${mapNamePart}${mapAgePart ? ` (${mapAgePart})` : ''}.`;
    }

    let displaySecondaryLat: number | undefined, displaySecondaryLng: number | undefined;
    if (secondaryGlobeMode === 'dual-point') {
        displaySecondaryLat = secondaryPointOfView.lat;
        displaySecondaryLng = secondaryPointOfView.lng;
    } else if (pointOfView.lat != null && pointOfView.lng != null) {
        if (secondaryGlobeMode === 'antipodal') {
            const antipodalPoint = getAntipodal(pointOfView as LocationCoordinates);
            displaySecondaryLat = antipodalPoint.lat;
            displaySecondaryLng = antipodalPoint.lng;
        } else {
            displaySecondaryLat = pointOfView.lat;
            displaySecondaryLng = pointOfView.lng;
        }
    }


    const getSecondaryClassNames = (base: 'hover' | 'icon' | 'link') => {
        switch (secondaryGlobeMode) {
            case 'antipodal': return base === 'hover' ? 'group-hover:border-emerald-500/70 group-hover:shadow-emerald-500/10' : base === 'icon' ? 'text-emerald-400' : 'hover:text-emerald-400';
            case 'prehistoric_same_point': return base === 'hover' ? 'group-hover:border-orange-500/70 group-hover:shadow-orange-500/10' : base === 'icon' ? 'text-orange-400' : 'hover:text-orange-400';
            case 'dual-point': return base === 'hover' ? 'group-hover:border-yellow-500/70 group-hover:shadow-yellow-500/10' : base === 'icon' ? 'text-yellow-400' : 'hover:text-yellow-400';
            default: return '';
        }
    };

    const secondaryBoxName = secondaryGlobeMode === 'antipodal' ? 'Antipodal Point' : secondaryGlobeMode === 'prehistoric_same_point' ? selectedPrehistoricMap?.name.split('(')[0].trim() || 'Historic Point' : 'Secondary Point';

    return (
        <div className="fixed inset-0 w-full h-full bg-neutral-950 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neutral-950/30 to-neutral-950 pointer-events-none" />
            <div className="relative h-full flex flex-col lg:flex-row gap-0 select-none">
                <GlobePanel panelRef={secondaryGlobePanelRef as any} globeRef={secondaryGlobeEl} globeImageUrl={secondaryGlobeImageUrl} bumpImageUrl={(secondaryGlobeMode !== 'prehistoric_same_point') ? "//unpkg.com/three-globe/example/img/earth-topology.png" : ""} pointsData={secondaryGlobePointData()} onGlobeReady={() => setSecondaryGlobeReady(true)} onZoom={(pov) => handleUserPovChange(pov, 'secondary')} atmosphereColor={secondaryGlobeAtmosphereColor} dimensions={secondaryGlobeDimensions} labelText={secondaryGlobeLabel} labelColorIndicatorClass={secondaryGlobeLabelColor} showMapTiles={showMapTiles} />
                <GlobePanel panelRef={primaryGlobePanelRef as any} globeRef={globeEl} globeImageUrl="//unpkg.com/three-globe/example/img/earth-day.jpg" bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png" pointsData={primaryGlobePointData()} onGlobeReady={() => setGlobeReady(true)} onZoom={(pov) => handleUserPovChange(pov, 'main')} atmosphereColor="#3b82f6" dimensions={primaryGlobeDimensions} labelText="Primary" labelColorIndicatorClass="bg-blue-500" showMapTiles={showMapTiles} />
                <div className="flex-1 lg:flex-1 relative overflow-hidden">
                    <div className="h-full flex flex-col justify-center items-center p-4 md:p-6 lg:p-10">
                        <div className="mb-4 md:mb-6 lg:mb-10 text-center select-none">
                            <div className="flex flex-row items-center justify-center gap-x-4 md:gap-x-4 lg:flex-col lg:items-center lg:gap-x-0">
                                <h1 className="text-xl md:text-2xl lg:text-4xl font-light text-neutral-100 lg:mb-2 whitespace-nowrap">JuxtaGlobe</h1>
                                <div className="h-4 md:h-5 w-px bg-neutral-600 lg:hidden"></div>
                                <p className="text-sm md:text-sm lg:text-base text-neutral-400 font-normal max-w-[200px] md:max-w-[250px] lg:max-w-none text-left">{juxtaGlobeSubtitle}</p>
                            </div>
                        </div>
                        <div className="w-full max-w-xl lg:max-w-xs">
                            <div className="flex flex-row items-stretch gap-x-4 lg:flex-col lg:items-stretch lg:gap-x-0 lg:gap-y-4">
                                <div className="flex-1 w-full lg:flex-none space-y-3 lg:space-y-4">
                                    <div className="group"><div className="flex items-center justify-between mb-1 sm:mb-2"><div className="flex items-center gap-2"><Globe2 size={12} className={getSecondaryClassNames('icon')} /><span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">{secondaryBoxName}</span></div>{displaySecondaryLat != null && displaySecondaryLng != null && (<a href={`https://www.google.com/maps/@${displaySecondaryLat},${displaySecondaryLng},5z`} target="_blank" rel="noopener noreferrer" title="Open in Google Maps" className={`text-neutral-500 ${getSecondaryClassNames('link')} transition-colors`} onClick={(e) => e.stopPropagation()}><ExternalLink size={13} strokeWidth={2.25} /></a>)}</div><div className={`bg-neutral-800/50 backdrop-blur-md rounded-lg sm:rounded-xl p-2.5 sm:p-3 border border-neutral-700/80 transition-all duration-300 ${getSecondaryClassNames('hover')}`}><div className="font-mono text-xs sm:text-sm text-neutral-100 tabular-nums">{displaySecondaryLat != null && displaySecondaryLng != null ? `${displaySecondaryLat.toFixed(3)}°, ${displaySecondaryLng.toFixed(3)}°` : '---.-° ---.-°'}</div></div></div>
                                    <div className="group"><div className="flex items-center justify-between mb-1 sm:mb-2"><div className="flex items-center gap-2"><MapPin size={12} className="text-blue-400" /><span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Primary View</span></div>{pointOfView.lat != null && pointOfView.lng != null && (<a href={`https://www.google.com/maps/@${pointOfView.lat},${pointOfView.lng},5z`} target="_blank" rel="noopener noreferrer" title="Open in Google Maps" className="text-neutral-500 hover:text-blue-400 transition-colors" onClick={(e) => e.stopPropagation()}><ExternalLink size={13} strokeWidth={2.25} /></a>)}</div><div className="bg-neutral-800/50 backdrop-blur-md rounded-lg sm:rounded-xl p-2.5 sm:p-3 border border-neutral-700/80 transition-all duration-300 group-hover:border-blue-500/70 group-hover:shadow-xl group-hover:shadow-blue-500/10"><div className="font-mono text-xs sm:text-sm text-neutral-100 tabular-nums">{pointOfView.lat?.toFixed(3) ?? '---.-'}°, {pointOfView.lng?.toFixed(3) ?? '---.-'}°</div></div></div>
                                </div>
                                <div className="flex-1 w-full lg:flex-none flex flex-col justify-center space-y-2 lg:space-y-2.5 lg:justify-start">
                                    {secondaryGlobeMode === 'dual-point' && (<button onClick={() => handleDualModeLockToggle()} className="w-full flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-yellow-600/20 hover:bg-yellow-600/40 backdrop-blur-sm rounded-md sm:rounded-lg text-xs sm:text-sm font-medium text-yellow-200 hover:text-yellow-100 transition-all duration-300 border border-yellow-500/40 hover:border-yellow-500/60">{isDualModeLocked ? <Lock size={13} /> : <Unlock size={13} />} {isDualModeLocked ? 'Unlock Globes' : 'Lock Globes'}</button>)}
                                    <button onClick={resetToUserLocation} disabled={isLoading} className="w-full flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-blue-600/80 hover:bg-blue-500/90 backdrop-blur-sm rounded-md sm:rounded-lg text-xs sm:text-sm font-medium text-blue-100 hover:text-white transition-all duration-300 border border-blue-500/50 hover:border-blue-400/70 disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-blue-500/40"><Navigation size={13} className={isLoading ? 'animate-spin' : ''} /> {'My Location'}</button>
                                    <button onClick={() => setShowInfoModal(true)} className="w-full flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-neutral-700/40 hover:bg-neutral-700/60 backdrop-blur-sm rounded-md sm:rounded-lg text-xs sm:text-sm font-medium text-neutral-300 hover:text-neutral-100 transition-all duration-300 border border-neutral-600/70 hover:border-neutral-500/90"><Settings size={13} /> Display Options</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <InfoModal isOpen={showInfoModal} onClose={() => setShowInfoModal(false)} secondaryGlobeMode={secondaryGlobeMode} selectedPrehistoricMap={selectedPrehistoricMap} prehistoricMapOptions={prehistoricMapOptions} onSecondaryGlobeOptionChange={handleSecondaryGlobeOptionChange} onAttributionClick={handleAttributionClick} showMapTiles={showMapTiles} onMapTilesToggle={handleMapTilesToggle} />
            {attributionPopover && (<div ref={attributionPopoverRef} style={{ position: 'fixed', top: `${attributionPopover.y + 10}px`, left: `${attributionPopover.x + 10}px`, zIndex: 60 }} className="bg-neutral-700/90 backdrop-blur-sm border border-neutral-600 p-3 rounded-lg shadow-xl text-xs text-neutral-100 max-w-[280px] sm:max-w-xs animate-fadeIn"><div className="flex justify-between items-center mb-2"><span className="font-semibold text-sm text-neutral-100">Map Attribution</span><button onClick={() => setAttributionPopover(null)} className="text-neutral-400 hover:text-neutral-100 bg-transparent border-none p-0 leading-none text-xl hover:bg-neutral-600/50 rounded-full w-5 h-5 flex items-center justify-center" aria-label="Close attribution">×</button></div><p className="text-neutral-200 leading-normal">{attributionPopover.text}</p></div>)}
        </div>
    );
};

export default GlobeViewer;