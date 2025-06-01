import React, { useState, useRef, useEffect } from 'react';
import type { GlobeMethods } from 'react-globe.gl';
import { MapPin, Globe2, Navigation, Settings, ExternalLink } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';

import InfoModal from './InfoModal';
import { KANSAS_LOCATION, prehistoricMapOptions } from '../utils/mapData';
import type { PointOfView, LocationCoordinates, PrehistoricMapOption } from '../types';
import GlobePanel from './GlobalPanel';

const GlobeViewer: React.FC = () => {
    const globeEl = useRef<GlobeMethods | undefined>(undefined);
    const secondaryGlobeEl = useRef<GlobeMethods | undefined>(undefined);
    const secondaryGlobePanelRef = useRef<HTMLDivElement>(null); // For secondary globe panel
    const primaryGlobePanelRef = useRef<HTMLDivElement>(null);   // For primary globe panel

    const [globeReady, setGlobeReady] = useState(false);
    const [secondaryGlobeReady, setSecondaryGlobeReady] = useState(false);
    const [primaryGlobeDimensions, setPrimaryGlobeDimensions] = useState({ width: 400, height: 400 });
    const [secondaryGlobeDimensions, setSecondaryGlobeDimensions] = useState({ width: 400, height: 400 });

    const [showInfoModal, setShowInfoModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [pointOfView, setPointOfView] = useState<PointOfView>(KANSAS_LOCATION);

    const [secondaryGlobeMode, setSecondaryGlobeMode] = useState<'antipodal' | 'prehistoric_same_point'>('antipodal');
    const [selectedPrehistoricMap, setSelectedPrehistoricMap] = useState<PrehistoricMapOption | null>(null);

    const initialAnimationToKansasDone = useRef(false);
    const ipLookupAttempted = useRef(false);
    const expectAnimatedMoveRef = useRef(false);
    const activeInteractionGlobeRef = useRef<'main' | 'secondary' | null>(null);

    const [attributionPopover, setAttributionPopover] = useState<{ text: string; x: number; y: number } | null>(null);
    const attributionPopoverRef = useRef<HTMLDivElement>(null);

    const { mapSlug: mapSlugFromParams } = useParams<{ mapSlug?: string }>();
    const navigate = useNavigate();

    useEffect(() => {
        let determinedMode: 'antipodal' | 'prehistoric_same_point' = 'antipodal';
        let determinedMap: PrehistoricMapOption | null = null;
        let needsUrlCorrection = false;
        let correctPath = `/${mapSlugFromParams || 'antipodal'}`;

        if (mapSlugFromParams) {
            const lowerMapSlug = mapSlugFromParams.toLowerCase();
            if (lowerMapSlug === 'antipodal') {
                determinedMode = 'antipodal';
                determinedMap = null;
                correctPath = '/antipodal';
            } else {
                const mapFromSlug = prehistoricMapOptions.find(m => m.slug === lowerMapSlug);
                if (mapFromSlug) {
                    determinedMode = 'prehistoric_same_point';
                    determinedMap = mapFromSlug;
                    correctPath = `/${mapFromSlug.slug}`;
                } else {
                    determinedMode = 'antipodal';
                    determinedMap = null;
                    needsUrlCorrection = true;
                    correctPath = '/antipodal';
                }
            }
        } else {
            determinedMode = 'antipodal';
            determinedMap = null;
            if (!mapSlugFromParams) {
                needsUrlCorrection = true;
                correctPath = '/antipodal';
            }
        }

        setSecondaryGlobeMode(determinedMode);
        setSelectedPrehistoricMap(determinedMap);

        const currentPathname = window.location.pathname.toLowerCase();
        if (needsUrlCorrection || currentPathname !== correctPath.toLowerCase()) {
            if (mapSlugFromParams || currentPathname === '/') {
                navigate(correctPath, { replace: true });
            }
        }
    }, [mapSlugFromParams, navigate]);

    const getAntipodal = (coords: LocationCoordinates): LocationCoordinates => ({ lat: -coords.lat, lng: coords.lng < 0 ? coords.lng + 180 : coords.lng - 180, altitude: coords.altitude });

    const primaryGlobePointData = (): any[] => {
        if (pointOfView.lat === undefined || pointOfView.lng === undefined) return [];
        return [{ lat: pointOfView.lat, lng: pointOfView.lng, name: 'Current Location', color: '#3b82f6', size: 0.8 }];
    }

    const secondaryGlobePointData = (): any[] => {
        if (pointOfView.lat === undefined || pointOfView.lng === undefined) return [];
        if (secondaryGlobeMode === 'prehistoric_same_point') {
            return [{ lat: pointOfView.lat, lng: pointOfView.lng, name: `Location on ${selectedPrehistoricMap?.name.split('(')[0].trim() || 'Prehistoric Map'}`, color: '#f97316', size: 0.8 }];
        } else {
            return [{ ...getAntipodal({ lat: pointOfView.lat, lng: pointOfView.lng, altitude: pointOfView.altitude }), name: 'Antipodal Point', color: '#10b981', size: 0.8 }];
        }
    };

    useEffect(() => {
        if (!globeReady || !secondaryGlobeReady || initialAnimationToKansasDone.current) {
            return;
        }
        initialAnimationToKansasDone.current = true;
        if (globeEl.current) { globeEl.current.pointOfView(KANSAS_LOCATION, 0); }
        if (secondaryGlobeEl.current) { const initialSecondaryPov = secondaryGlobeMode === 'prehistoric_same_point' && selectedPrehistoricMap ? KANSAS_LOCATION : getAntipodal(KANSAS_LOCATION); secondaryGlobeEl.current.pointOfView(initialSecondaryPov, 0); }
        setPointOfView(KANSAS_LOCATION);
        setTimeout(() => { if (!ipLookupAttempted.current) { ipLookupAttempted.current = true; setIsLoading(true); fetch('https://ipapi.co/json/').then(response => response.json()).then(data => { if (data.latitude && data.longitude) { const userLocation = { lat: data.latitude, lng: data.longitude, altitude: 2.5 }; expectAnimatedMoveRef.current = true; setPointOfView(userLocation); } }).catch(error => console.warn('IP-based geolocation failed.', error)).finally(() => setIsLoading(false)); } }, 1500);
    }, [globeReady, secondaryGlobeReady, secondaryGlobeMode, selectedPrehistoricMap]);

    useEffect(() => {
        if (!initialAnimationToKansasDone.current) return;

        const currentPovValues = { lat: pointOfView.lat, lng: pointOfView.lng, altitude: pointOfView.altitude };
        if (currentPovValues.lat === undefined || currentPovValues.lng === undefined) return;

        const currentTargetPov = currentPovValues as LocationCoordinates;
        let transitionDuration = expectAnimatedMoveRef.current ? 1000 : 0;

        if (expectAnimatedMoveRef.current) {
            expectAnimatedMoveRef.current = false;
        }

        if (globeEl.current && globeReady && activeInteractionGlobeRef.current !== 'main') {
            const globeCurrentView = globeEl.current.pointOfView();
            if (Math.abs(globeCurrentView.lat - currentTargetPov.lat) > 0.001 ||
                Math.abs(globeCurrentView.lng - currentTargetPov.lng) > 0.001 ||
                (currentTargetPov.altitude && globeCurrentView.altitude && Math.abs(globeCurrentView.altitude - currentTargetPov.altitude) > 0.01)) {
                globeEl.current.pointOfView(currentTargetPov, transitionDuration);
            }
        }

        if (secondaryGlobeEl.current && secondaryGlobeReady && activeInteractionGlobeRef.current !== 'secondary') {
            const targetPovForSecondary = secondaryGlobeMode === 'prehistoric_same_point' ? currentTargetPov : getAntipodal(currentTargetPov);
            const secondaryGlobeCurrentView = secondaryGlobeEl.current.pointOfView();
            if (Math.abs(secondaryGlobeCurrentView.lat - targetPovForSecondary.lat) > 0.001 ||
                Math.abs(secondaryGlobeCurrentView.lng - targetPovForSecondary.lng) > 0.001 ||
                (targetPovForSecondary.altitude && secondaryGlobeCurrentView.altitude && Math.abs(secondaryGlobeCurrentView.altitude - targetPovForSecondary.altitude) > 0.01)) {
                secondaryGlobeEl.current.pointOfView(targetPovForSecondary, transitionDuration);
            }
        }
        activeInteractionGlobeRef.current = null;
    }, [pointOfView, globeReady, secondaryGlobeReady, secondaryGlobeMode]);


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
        };
        setTimeout(handleResize, 100);
        window.addEventListener('resize', handleResize);
        const resizeObserver = new ResizeObserver(handleResize);
        if (secondaryGlobePanelRef.current) resizeObserver.observe(secondaryGlobePanelRef.current);
        if (primaryGlobePanelRef.current) resizeObserver.observe(primaryGlobePanelRef.current);
        return () => { window.removeEventListener('resize', handleResize); resizeObserver.disconnect(); };
    }, []);

    const handleUserPovChange = (newPov: PointOfView, globeIdentifier: 'main' | 'secondary') => {
        if (newPov.lat === undefined || newPov.lng === undefined || newPov.altitude === undefined) return;

        expectAnimatedMoveRef.current = false;
        activeInteractionGlobeRef.current = globeIdentifier;

        if (globeIdentifier === 'main') {
            setPointOfView(newPov as LocationCoordinates);
        } else {
            if (secondaryGlobeMode === 'prehistoric_same_point') {
                setPointOfView(newPov as LocationCoordinates);
            } else {
                setPointOfView(getAntipodal(newPov as LocationCoordinates));
            }
        }
    };

    const resetToUserLocation = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();
            const loc = (data.latitude && data.longitude) ? { lat: data.latitude, lng: data.longitude, altitude: 2.5 } : KANSAS_LOCATION;
            activeInteractionGlobeRef.current = null;
            expectAnimatedMoveRef.current = true;
            setPointOfView(loc);
        } catch (error) {
            console.warn('Failed to reset to user location, defaulting to Kansas.', error);
            activeInteractionGlobeRef.current = null;
            expectAnimatedMoveRef.current = true;
            setPointOfView(KANSAS_LOCATION);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSecondaryGlobeOptionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const value = event.target.value;
        let newPath: string;
        if (value === 'antipodal') {
            newPath = '/antipodal';
        } else {
            const map = prehistoricMapOptions.find(m => m.url === value);
            if (map) {
                newPath = `/${map.slug}`;
            } else {
                newPath = '/antipodal';
            }
        }
        if (window.location.pathname.toLowerCase() !== newPath.toLowerCase()) {
            activeInteractionGlobeRef.current = null;
            navigate(newPath);
        }
    };

    const handleAttributionClick = (text: string, event: React.MouseEvent) => { event.stopPropagation(); setAttributionPopover({ text, x: event.clientX, y: event.clientY }); };
    useEffect(() => { const handleClickOutside = (event: MouseEvent) => { if (attributionPopoverRef.current && !attributionPopoverRef.current.contains(event.target as Node)) { setAttributionPopover(null); } }; if (attributionPopover) { document.addEventListener('mousedown', handleClickOutside); } else { document.removeEventListener('mousedown', handleClickOutside); } return () => { document.removeEventListener('mousedown', handleClickOutside); }; }, [attributionPopover]);
    useEffect(() => { if (!showInfoModal) { setAttributionPopover(null); } }, [showInfoModal]);

    const secondaryGlobeImageUrl = secondaryGlobeMode === 'prehistoric_same_point' && selectedPrehistoricMap ? selectedPrehistoricMap.url : "//unpkg.com/three-globe/example/img/earth-day.jpg";
    const secondaryGlobeAtmosphereColor = secondaryGlobeMode === 'prehistoric_same_point' ? '#f97316' : '#10b981';
    const secondaryGlobeLabel = secondaryGlobeMode === 'antipodal' ? 'Antipodal' : (selectedPrehistoricMap?.name.split('(')[0].trim() || 'Prehistoric View');
    const secondaryGlobeLabelColor = secondaryGlobeMode === 'antipodal' ? 'bg-emerald-500' : 'bg-orange-500';

    let juxtaGlobeSubtitle = "Compare Earth's present with its past or its opposite point.";
    if (secondaryGlobeMode === 'antipodal') {
        juxtaGlobeSubtitle = "Showing modern Earth alongside its antipodal point.";
    } else if (selectedPrehistoricMap) {
        const mapNamePart = selectedPrehistoricMap.name.split('(')[0].trim();
        const mapAgePart = selectedPrehistoricMap.name.match(/\(([^)]+)\)/)?.[1];
        juxtaGlobeSubtitle = `Comparing modern Earth with the ${mapNamePart} ${mapAgePart ? ` (${mapAgePart})` : ''}.`;
    }

    let displaySecondaryLat: number | undefined, displaySecondaryLng: number | undefined;
    if (pointOfView.lat !== undefined && pointOfView.lng !== undefined) {
        if (secondaryGlobeMode === 'antipodal') {
            const antipodal = getAntipodal({ lat: pointOfView.lat, lng: pointOfView.lng });
            displaySecondaryLat = antipodal.lat;
            displaySecondaryLng = antipodal.lng;
        } else {
            displaySecondaryLat = pointOfView.lat;
            displaySecondaryLng = pointOfView.lng;
        }
    }

    return (
        <div className="fixed inset-0 w-full h-full bg-neutral-950 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neutral-950/30 to-neutral-950 pointer-events-none" />
            <div className="relative h-full flex flex-col lg:flex-row gap-0">
                <GlobePanel
                    panelRef={secondaryGlobePanelRef as any}
                    globeRef={secondaryGlobeEl}
                    globeImageUrl={secondaryGlobeImageUrl}
                    bumpImageUrl={secondaryGlobeMode === 'antipodal' ? "//unpkg.com/three-globe/example/img/earth-topology.png" : ""}
                    pointsData={secondaryGlobePointData()}
                    onGlobeReady={() => setSecondaryGlobeReady(true)}
                    onZoom={(pov: any) => handleUserPovChange(pov, 'secondary')}
                    atmosphereColor={secondaryGlobeAtmosphereColor}
                    dimensions={secondaryGlobeDimensions}
                    labelText={secondaryGlobeLabel}
                    labelColorIndicatorClass={secondaryGlobeLabelColor}
                />

                <GlobePanel
                    panelRef={primaryGlobePanelRef as any}
                    globeRef={globeEl}
                    globeImageUrl="//unpkg.com/three-globe/example/img/earth-day.jpg"
                    bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
                    pointsData={primaryGlobePointData()}
                    onGlobeReady={() => setGlobeReady(true)}
                    onZoom={(pov: any) => handleUserPovChange(pov, 'main')}
                    atmosphereColor="#3b82f6"
                    dimensions={primaryGlobeDimensions}
                    labelText="Primary"
                    labelColorIndicatorClass="bg-blue-500"
                />

                <div className="flex-1 lg:flex-1 relative overflow-hidden">
                    <div className="h-full flex flex-col justify-center items-center p-4 md:p-6 lg:p-10">
                        <div className="mb-4 md:mb-6 lg:mb-10 text-center">
                            <div className="flex flex-row items-baseline justify-center gap-x-2 lg:flex-col lg:items-center">
                                <h1 className="text-lg lg:text-4xl font-light text-neutral-100 lg:mb-2">JuxtaGlobe</h1>
                                <p className="text-sm lg:text-base text-neutral-400 font-normal">{juxtaGlobeSubtitle}</p>
                            </div>
                        </div>
                        <div className="w-full max-w-xl lg:max-w-xs">
                            <div className="flex flex-row items-stretch gap-x-4 lg:flex-col lg:items-stretch lg:gap-x-0 lg:gap-y-6">
                                <div className="flex-1 w-full lg:flex-none space-y-3 lg:space-y-4">
                                    {pointOfView.lat !== undefined && pointOfView.lng !== undefined && (
                                        <div className="group">
                                            <div className="flex items-center justify-between mb-1 sm:mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Globe2 size={12} className={secondaryGlobeMode === 'antipodal' ? "text-emerald-400" : "text-orange-400"} />
                                                    <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                                        {secondaryGlobeMode === 'antipodal'
                                                            ? 'Antipodal Point'
                                                            : (selectedPrehistoricMap?.name.split('(')[0].trim() || 'Historic Point')}
                                                    </span>
                                                </div>
                                                {displaySecondaryLat !== undefined && displaySecondaryLng !== undefined && (
                                                    <a
                                                        href={`https://www.google.com/maps/search/?api=1&query=${displaySecondaryLat},${displaySecondaryLng}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        title="Open in Google Maps"
                                                        className={`text-neutral-500 ${secondaryGlobeMode === 'antipodal' ? 'hover:text-emerald-400' : 'hover:text-orange-400'} transition-colors`}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <ExternalLink size={13} strokeWidth={2.25} />
                                                    </a>
                                                )}
                                            </div>
                                            <div className={`bg-neutral-800/50 backdrop-blur-md rounded-lg sm:rounded-xl p-2.5 sm:p-3 border border-neutral-700/80 transition-all duration-300 ${secondaryGlobeMode === 'antipodal' ? 'group-hover:border-emerald-500/70 group-hover:shadow-emerald-500/10' : 'group-hover:border-orange-500/70 group-hover:shadow-orange-500/10'}`}>
                                                <div className="font-mono text-xs sm:text-sm text-neutral-100 tabular-nums">
                                                    {displaySecondaryLat !== undefined && displaySecondaryLng !== undefined
                                                        ? `${displaySecondaryLat.toFixed(3)}°, ${displaySecondaryLng.toFixed(3)}°`
                                                        : '---.-° ---.-°'}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="group">
                                        <div className="flex items-center justify-between mb-1 sm:mb-2">
                                            <div className="flex items-center gap-2">
                                                <MapPin size={12} className="text-blue-400" />
                                                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Primary View</span>
                                            </div>
                                            {pointOfView.lat !== undefined && pointOfView.lng !== undefined && (
                                                <a
                                                    href={`https://www.google.com/maps/search/?api=1&query=${pointOfView.lat},${pointOfView.lng}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    title="Open in Google Maps"
                                                    className="text-neutral-500 hover:text-blue-400 transition-colors"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <ExternalLink size={13} strokeWidth={2.25} />
                                                </a>
                                            )}
                                        </div>
                                        <div className="bg-neutral-800/50 backdrop-blur-md rounded-lg sm:rounded-xl p-2.5 sm:p-3 border border-neutral-700/80 transition-all duration-300 group-hover:border-blue-500/70 group-hover:shadow-xl group-hover:shadow-blue-500/10">
                                            <div className="font-mono text-xs sm:text-sm text-neutral-100 tabular-nums">
                                                {pointOfView.lat?.toFixed(3) ?? '---.-'}°, {pointOfView.lng?.toFixed(3) ?? '---.-'}°
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1 w-full lg:flex-none flex flex-col justify-center space-y-2 lg:space-y-2.5 lg:justify-start">
                                    <button onClick={resetToUserLocation} disabled={isLoading} className="w-full flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-blue-600/80 hover:bg-blue-500/90 backdrop-blur-sm rounded-md sm:rounded-lg text-xs sm:text-sm font-medium text-blue-100 hover:text-white transition-all duration-300 border border-blue-500/50 hover:border-blue-400/70 disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-blue-500/40">
                                        <Navigation size={13} className={isLoading ? 'animate-spin' : ''} /> {'My Location'}
                                    </button>
                                    <button onClick={() => setShowInfoModal(true)} className="w-full flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-neutral-700/40 hover:bg-neutral-700/60 backdrop-blur-sm rounded-md sm:rounded-lg text-xs sm:text-sm font-medium text-neutral-300 hover:text-neutral-100 transition-all duration-300 border border-neutral-600/70 hover:border-neutral-500/90">
                                        <Settings size={13} /> Display Options
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <InfoModal
                isOpen={showInfoModal}
                onClose={() => setShowInfoModal(false)}
                secondaryGlobeMode={secondaryGlobeMode}
                selectedPrehistoricMap={selectedPrehistoricMap}
                prehistoricMapOptions={prehistoricMapOptions}
                onSecondaryGlobeOptionChange={handleSecondaryGlobeOptionChange}
                onAttributionClick={handleAttributionClick}
            />

            {attributionPopover && (
                <div
                    ref={attributionPopoverRef}
                    style={{ position: 'fixed', top: `${attributionPopover.y + 10}px`, left: `${attributionPopover.x + 10}px`, zIndex: 60 }}
                    className="bg-neutral-700/90 backdrop-blur-sm border border-neutral-600 p-3 rounded-lg shadow-xl text-xs text-neutral-100 max-w-[280px] sm:max-w-xs animate-fadeIn"
                >
                    <div className="flex justify-between items-center mb-2"> <span className="font-semibold text-sm text-neutral-100">Map Attribution</span> <button onClick={() => setAttributionPopover(null)} className="text-neutral-400 hover:text-neutral-100 bg-transparent border-none p-0 leading-none text-xl hover:bg-neutral-600/50 rounded-full w-5 h-5 flex items-center justify-center" aria-label="Close attribution"> × </button> </div> <p className="text-neutral-200 leading-normal">{attributionPopover.text}</p>
                </div>
            )}
        </div>
    );
};

export default GlobeViewer;