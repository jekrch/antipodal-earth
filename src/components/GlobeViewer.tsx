import React, { useState, useRef, useEffect } from 'react';
import type { RefObject } from 'react';
import Globe from 'react-globe.gl';
import type { GlobeMethods } from 'react-globe.gl';
import { MapPin, Globe2, Info, X, Navigation, Settings, ChevronDown } from 'lucide-react';
// Import hooks from react-router-dom
import { useParams, useNavigate } from 'react-router-dom';

interface PointOfView {
  lat?: number;
  lng?: number;
  altitude?: number;
}

interface LocationCoordinates {
  lat: number;
  lng: number;
  altitude?: number;
}

const KANSAS_LOCATION: LocationCoordinates = { lat: 39.8283, lng: -98.5795, altitude: 2.5 };

interface PrehistoricMapOption {
  name: string;
  url: string;
  attribution: string;
  ageMa: number;
  slug: string;
}

const extractMaFromName = (name: string): number => {
  const match = name.match(/~(\d+)\s*Ma/);
  return match ? parseInt(match[1], 10) : Infinity;
};

const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/\s*\(~?\d+\s*ma\)\s*/, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const prehistoricMapOptionsRaw: Omit<PrehistoricMapOption, 'ageMa' | 'slug'>[] = [
  { name: 'Early Jurassic - Pangea (~200 Ma)', url: 'https://upload.wikimedia.org/wikipedia/commons/9/9a/World_200ma_6.webp', attribution: 'C. R. Scotese, PALEOMAP Project. CC BY-SA 4.0. Via Wikimedia Commons.' },
  { name: 'Early Cretaceous (~120 Ma)', url: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Cretaceous_120ma_map_1.webp', attribution: 'C. R. Scotese, PALEOMAP Project. CC BY-SA 4.0. Via Wikimedia Commons.' },
  { name: 'Early Triassic (~240 Ma)', url: 'https://upload.wikimedia.org/wikipedia/commons/0/0d/Trias_240ma_5.webp', attribution: 'C. R. Scotese, PALEOMAP Project. CC BY-SA 4.0. Via Wikimedia Commons.' },
  { name: 'Middle Jurassic (~165 Ma)', url: 'https://upload.wikimedia.org/wikipedia/commons/6/60/Jura_165_ma_4.webp', attribution: 'C. R. Scotese, PALEOMAP Project. CC BY-SA 4.0. Via Wikimedia Commons.' },
];

const prehistoricMapOptions: PrehistoricMapOption[] = prehistoricMapOptionsRaw
  .map(option => ({
    ...option,
    ageMa: extractMaFromName(option.name),
    slug: generateSlug(option.name),
  }))
  .sort((a, b) => a.ageMa - b.ageMa);

const GlobeViewer: React.FC = () => {
  const globeEl = useRef<GlobeMethods | undefined>(undefined);
  const secondaryGlobeEl = useRef<GlobeMethods | undefined>(undefined);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const secondaryContainerRef = useRef<HTMLDivElement>(null);

  const [globeReady, setGlobeReady] = useState(false);
  const [secondaryGlobeReady, setSecondaryGlobeReady] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 400, height: 400 });
  const [secondaryDimensions, setSecondaryDimensions] = useState({ width: 400, height: 400 });

  const [showInfoModal, setShowInfoModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pointOfView, setPointOfView] = useState<PointOfView>(KANSAS_LOCATION);

  const [secondaryGlobeMode, setSecondaryGlobeMode] = useState<'antipodal' | 'prehistoric_same_point'>('antipodal');
  const [selectedPrehistoricMap, setSelectedPrehistoricMap] = useState<PrehistoricMapOption | null>(null);

  const initialAnimationToKansasDone = useRef(false);
  const ipLookupAttempted = useRef(false);
  const previousPovRef = useRef<PointOfView>(KANSAS_LOCATION);
  const expectAnimatedMoveRef = useRef(false);

  const [attributionPopover, setAttributionPopover] = useState<{ text: string; x: number; y: number } | null>(null);
  const attributionPopoverRef = useRef<HTMLDivElement>(null);

  // React Router hooks
  const { mapSlug: mapSlugFromParams } = useParams<{ mapSlug?: string }>();
  const navigate = useNavigate();

  // Effect to update globe state based on URL path parameter (mapSlugFromParams)
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
          correctPath = `/${mapFromSlug.slug}`; // Ensure consistent casing from slug
        } else {
          // Invalid map slug in URL, default to antipodal and correct URL
          console.warn(`Invalid map slug in URL: ${mapSlugFromParams}. Defaulting to antipodal.`);
          determinedMode = 'antipodal';
          determinedMap = null;
          needsUrlCorrection = true;
          correctPath = '/antipodal';
        }
      }
    } else {
      // This case should be handled by the redirect in App.tsx for "/"
      // but as a fallback, or if GlobeViewer is somehow rendered without a slug:
      determinedMode = 'antipodal';
      determinedMap = null;
      if (!mapSlugFromParams) { // If there was no slug (e.g. direct render without router parent on specific path)
         needsUrlCorrection = true; // Potentially, if not already on /antipodal
         correctPath = '/antipodal';
      }
    }

    setSecondaryGlobeMode(determinedMode);
    setSelectedPrehistoricMap(determinedMap);

    // Correct URL if the slug was invalid, casing was off, or if it was a root path needing default
    const currentPathname = window.location.pathname.toLowerCase();
    if (needsUrlCorrection || currentPathname !== correctPath.toLowerCase()) {
       if(mapSlugFromParams || currentPathname === '/'){ // Only navigate if there was a slug or it was genuinely root
            navigate(correctPath, { replace: true });
       }
    }
  }, [mapSlugFromParams, navigate]);


  const getAntipodal = (coords: LocationCoordinates): LocationCoordinates => ({ /* ... */ lat: -coords.lat, lng: coords.lng < 0 ? coords.lng + 180 : coords.lng - 180, altitude: coords.altitude });
  const currentPoint = pointOfView.lat !== undefined && pointOfView.lng !== undefined ? [{ lat: pointOfView.lat, lng: pointOfView.lng, name: 'Current Location', color: '#3b82f6', size: 0.8 }] : [];
  const secondaryGlobePointData = (): any[] => { /* ... */ if (pointOfView.lat === undefined || pointOfView.lng === undefined) return []; if (secondaryGlobeMode === 'prehistoric_same_point') { return [{ lat: pointOfView.lat, lng: pointOfView.lng, name: `Location on ${selectedPrehistoricMap?.name.split('(')[0].trim() || 'Prehistoric Map'}`, color: '#f97316', size: 0.8 }]; } else { return [{ ...getAntipodal({ lat: pointOfView.lat, lng: pointOfView.lng, altitude: pointOfView.altitude }), name: 'Antipodal Point', color: '#10b981', size: 0.8 }]; } };

  useEffect(() => {
    if (!globeReady || !secondaryGlobeReady || initialAnimationToKansasDone.current) {
        return;
    }    
    initialAnimationToKansasDone.current = true;
    // ... (rest of Kansas animation and IP lookup logic)
    if (globeEl.current) { globeEl.current.pointOfView(KANSAS_LOCATION, 0); }
    if (secondaryGlobeEl.current) { const initialSecondaryPov = secondaryGlobeMode === 'prehistoric_same_point' && selectedPrehistoricMap ? KANSAS_LOCATION : getAntipodal(KANSAS_LOCATION); secondaryGlobeEl.current.pointOfView(initialSecondaryPov, 0); }
    setPointOfView(KANSAS_LOCATION);
    setTimeout(() => { if (!ipLookupAttempted.current) { ipLookupAttempted.current = true; setIsLoading(true); fetch('https://ipapi.co/json/').then(response => response.json()).then(data => { if (data.latitude && data.longitude) { const userLocation = { lat: data.latitude, lng: data.longitude, altitude: 2.5 }; expectAnimatedMoveRef.current = true; setPointOfView(userLocation); } }).catch(error => console.warn('IP-based geolocation failed.', error)).finally(() => setIsLoading(false)); } }, 1500);
  }, [globeReady, secondaryGlobeReady, secondaryGlobeMode, selectedPrehistoricMap]);

  useEffect(() => { /* ... POV sync logic ... */ if (!initialAnimationToKansasDone.current) return; const currentPov = { lat: pointOfView.lat, lng: pointOfView.lng, altitude: pointOfView.altitude }; if (currentPov.lat === undefined || currentPov.lng === undefined) return; let transitionDuration = expectAnimatedMoveRef.current ? 1000 : 0; if (expectAnimatedMoveRef.current) expectAnimatedMoveRef.current = false; if (globeEl.current && globeReady) { const globeCurrentView = globeEl.current.pointOfView(); if (Math.abs(globeCurrentView.lat - currentPov.lat) > 0.001 || Math.abs(globeCurrentView.lng - currentPov.lng) > 0.001 || (currentPov.altitude && globeCurrentView.altitude && Math.abs(globeCurrentView.altitude - currentPov.altitude) > 0.01)) { globeEl.current.pointOfView(currentPov as LocationCoordinates, transitionDuration); } } if (secondaryGlobeEl.current && secondaryGlobeReady) { const targetPovForSecondary = secondaryGlobeMode === 'prehistoric_same_point' ? (currentPov as LocationCoordinates) : getAntipodal(currentPov as LocationCoordinates); const secondaryGlobeCurrentView = secondaryGlobeEl.current.pointOfView(); if (Math.abs(secondaryGlobeCurrentView.lat - targetPovForSecondary.lat) > 0.001 || Math.abs(secondaryGlobeCurrentView.lng - targetPovForSecondary.lng) > 0.001 || (targetPovForSecondary.altitude && secondaryGlobeCurrentView.altitude && Math.abs(secondaryGlobeCurrentView.altitude - targetPovForSecondary.altitude) > 0.01)) { secondaryGlobeEl.current.pointOfView(targetPovForSecondary, transitionDuration); } } previousPovRef.current = { ...currentPov }; }, [pointOfView, globeReady, secondaryGlobeReady, secondaryGlobeMode]);
  useEffect(() => { /* ... resize logic ... */ const handleResize = () => { setTimeout(() => { if (mainContainerRef.current) { const rect = mainContainerRef.current.getBoundingClientRect(); if (rect.width > 0 && rect.height > 0) setDimensions({ width: rect.width, height: rect.height }); } if (secondaryContainerRef.current) { const rect = secondaryContainerRef.current.getBoundingClientRect(); if (rect.width > 0 && rect.height > 0) setSecondaryDimensions({ width: rect.width, height: rect.height }); } }, 10); }; setTimeout(handleResize, 100); window.addEventListener('resize', handleResize); const resizeObserver = new ResizeObserver(handleResize); if (mainContainerRef.current) resizeObserver.observe(mainContainerRef.current); if (secondaryContainerRef.current) resizeObserver.observe(secondaryContainerRef.current); return () => { window.removeEventListener('resize', handleResize); resizeObserver.disconnect(); }; }, []);
  const handleUserPovChange = (newPov: PointOfView, globeIdentifier: 'main' | 'secondary') => { /* ... */ if (newPov.lat === undefined || newPov.lng === undefined || newPov.altitude === undefined) return; expectAnimatedMoveRef.current = false; if (globeIdentifier === 'main') { setPointOfView(newPov as LocationCoordinates); } else { if (secondaryGlobeMode === 'prehistoric_same_point') { setPointOfView(newPov as LocationCoordinates); } else { setPointOfView(getAntipodal(newPov as LocationCoordinates)); } } };
  const resetToUserLocation = async () => { /* ... */ setIsLoading(true); try { const response = await fetch('https://ipapi.co/json/'); const data = await response.json(); const loc = (data.latitude && data.longitude) ? { lat: data.latitude, lng: data.longitude, altitude: 2.5 } : KANSAS_LOCATION; expectAnimatedMoveRef.current = true; setPointOfView(loc); } catch (error) { expectAnimatedMoveRef.current = true; setPointOfView(KANSAS_LOCATION); } finally { setIsLoading(false); } };
  
  const handleSecondaryGlobeOptionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value; // This is 'antipodal' or a map.url
    // expectAnimatedMoveRef.current = true; // Not strictly needed here as POV doesn't change directly
    
    let newPath: string;
    if (value === 'antipodal') {
      newPath = '/antipodal';
    } else { // It's a map URL
      const map = prehistoricMapOptions.find(m => m.url === value);
      if (map) {
        newPath = `/${map.slug}`;
      } else {
        newPath = '/antipodal'; // Fallback
      }
    }
    // Navigate. This will change mapSlugFromParams, and the useEffect listening to it will update the state.
    if (window.location.pathname.toLowerCase() !== newPath.toLowerCase()) {
        navigate(newPath);
    }
  };

  const handleAttributionClick = (text: string, event: React.MouseEvent) => { /* ... */ event.stopPropagation(); setAttributionPopover({ text, x: event.clientX, y: event.clientY }); };
  useEffect(() => { /* ... attribution popover outside click ... */ const handleClickOutside = (event: MouseEvent) => { if (attributionPopoverRef.current && !attributionPopoverRef.current.contains(event.target as Node)) { setAttributionPopover(null); } }; if (attributionPopover) { document.addEventListener('mousedown', handleClickOutside); } else { document.removeEventListener('mousedown', handleClickOutside); } return () => { document.removeEventListener('mousedown', handleClickOutside); }; }, [attributionPopover]);
  useEffect(() => { /* ... close attribution popover with modal ... */ if (!showInfoModal) { setAttributionPopover(null); } }, [showInfoModal]);

  const secondaryGlobeImageUrl = secondaryGlobeMode === 'prehistoric_same_point' && selectedPrehistoricMap ? selectedPrehistoricMap.url : "//unpkg.com/three-globe/example/img/earth-day.jpg";
  const secondaryGlobeAtmosphereColor = secondaryGlobeMode === 'prehistoric_same_point' ? '#f97316' : '#10b981';
  let juxtaGlobeSubtitle = "Compare Earth's present with its past or its opposite point."; /* ... subtitle logic ... */ if (secondaryGlobeMode === 'antipodal') { juxtaGlobeSubtitle = "Showing modern Earth alongside its antipodal point."; } else if (selectedPrehistoricMap) { const mapNamePart = selectedPrehistoricMap.name.split('(')[0].trim(); const mapAgePart = selectedPrehistoricMap.name.match(/\(([^)]+)\)/)?.[1]; juxtaGlobeSubtitle = `Comparing modern Earth with the ${mapNamePart} ${mapAgePart ? ` (${mapAgePart})` : ''}.`; }

  // The JSX structure remains largely the same.
  // The <select> value will be driven by secondaryGlobeMode and selectedPrehistoricMap,
  // which are now updated by the useEffect listening to mapSlugFromParams.
  return (
    <div className="fixed inset-0 w-full h-full bg-neutral-950 overflow-hidden">
      {/* ... rest of your JSX structure, no changes needed here for routing logic ... */}
      {/* Ensure the <select> value is correctly set: */}
      {/*
        <select 
            value={secondaryGlobeMode === 'antipodal' ? 'antipodal' : selectedPrehistoricMap?.url || ''} 
            onChange={handleSecondaryGlobeOptionChange} ... >
            ...
        </select>
      */}
       <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neutral-950/30 to-neutral-950 pointer-events-none" />
      <div className="relative h-full flex flex-col lg:flex-row gap-0">
        {/* Secondary/Switchable Globe Panel (Left/Top) */}
        <div className="flex-1 relative overflow-hidden border-b lg:border-b-0 lg:border-r border-neutral-800">
          <div className="h-full flex flex-col">
            <div className="absolute top-0 left-0 right-0 z-10 p-4 lg:p-6">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 ${secondaryGlobeMode === 'antipodal' ? 'bg-emerald-500' : 'bg-orange-500'} rounded-full animate-pulse`} />
                <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  {secondaryGlobeMode === 'antipodal'
                    ? 'Antipodal'
                    : (selectedPrehistoricMap?.name.split('(')[0].trim() || 'Prehistoric View')}
                </h2>
              </div>
            </div>
            <div ref={mainContainerRef} className="flex-1 relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <Globe
                  ref={secondaryGlobeEl}
                  globeImageUrl={secondaryGlobeImageUrl}
                  bumpImageUrl={secondaryGlobeMode === 'antipodal' ? "//unpkg.com/three-globe/example/img/earth-topology.png" : ""}
                  backgroundImageUrl=""
                  backgroundColor="rgba(0,0,0,0)"
                  pointsData={secondaryGlobePointData()}
                  pointLat="lat" pointLng="lng" pointLabel="name" pointColor="color"
                  pointAltitude={0.015} pointRadius="size"
                  onGlobeReady={() => { setSecondaryGlobeReady(true); }}
                  onZoom={(pov: PointOfView) => handleUserPovChange(pov, 'secondary')}
                  enablePointerInteraction={true}
                  atmosphereColor={secondaryGlobeAtmosphereColor}
                  atmosphereAltitude={0.18}
                  width={dimensions.width} height={dimensions.height}
                  rendererConfig={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main/Primary Globe Panel (Center/Right) */}
        <div className="flex-1 relative overflow-hidden border-b lg:border-b-0 lg:border-r border-neutral-800">
          <div className="h-full flex flex-col">
            <div className="absolute top-0 left-0 right-0 z-10 p-4 lg:p-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Primary</h2>
              </div>
            </div>
            <div ref={secondaryContainerRef} className="flex-1 relative"> 
              <div className="absolute inset-0 flex items-center justify-center">
                <Globe
                  ref={globeEl}
                  globeImageUrl="//unpkg.com/three-globe/example/img/earth-day.jpg"
                  bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
                  backgroundImageUrl=""
                  backgroundColor="rgba(0,0,0,0)"
                  pointsData={currentPoint}
                  pointLat="lat" pointLng="lng" pointLabel="name" pointColor="color"
                  pointAltitude={0.015} pointRadius="size"
                  onGlobeReady={() => { setGlobeReady(true); }}
                  onZoom={(pov: PointOfView) => handleUserPovChange(pov, 'main')}
                  enablePointerInteraction={true}
                  atmosphereColor="#3b82f6"
                  atmosphereAltitude={0.18}
                  width={secondaryDimensions.width} height={secondaryDimensions.height}
                  rendererConfig={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Controls Panel */}
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
                  <div className="group">
                    <div className="flex items-center gap-2 mb-1 sm:mb-2">
                      <MapPin size={12} className="text-blue-400" />
                      <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Primary View</span>
                    </div>
                    <div className="bg-neutral-800/50 backdrop-blur-md rounded-lg sm:rounded-xl p-2.5 sm:p-3 border border-neutral-700/80 transition-all duration-300 group-hover:border-blue-500/70 group-hover:shadow-xl group-hover:shadow-blue-500/10">
                      <div className="font-mono text-xs sm:text-sm text-neutral-100 tabular-nums">
                        {pointOfView.lat?.toFixed(3) ?? '0.000'}°, {pointOfView.lng?.toFixed(3) ?? '0.000'}°
                      </div>
                    </div>
                  </div>
                  {pointOfView.lat !== undefined && pointOfView.lng !== undefined && (
                    <div className="group">
                      <div className="flex items-center gap-2 mb-1 sm:mb-2">
                        <Globe2 size={12} className={secondaryGlobeMode === 'antipodal' ? "text-emerald-400" : "text-orange-400"} />
                        <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                          {secondaryGlobeMode === 'antipodal'
                            ? 'Antipodal Point'
                            : (selectedPrehistoricMap?.name.split('(')[0].trim() || 'Historic Point')}
                        </span>
                      </div>
                      <div className={`bg-neutral-800/50 backdrop-blur-md rounded-lg sm:rounded-xl p-2.5 sm:p-3 border border-neutral-700/80 transition-all duration-300 ${secondaryGlobeMode === 'antipodal' ? 'group-hover:border-emerald-500/70 group-hover:shadow-emerald-500/10' : 'group-hover:border-orange-500/70 group-hover:shadow-orange-500/10'}`}>
                        <div className="font-mono text-xs sm:text-sm text-neutral-100 tabular-nums">
                          {secondaryGlobeMode === 'antipodal'
                            ? `${(-pointOfView.lat).toFixed(3)}°, ${(pointOfView.lng < 0 ? pointOfView.lng + 180 : pointOfView.lng - 180).toFixed(3)}°`
                            : `${pointOfView.lat?.toFixed(3)}°, ${pointOfView.lng?.toFixed(3)}°`}
                        </div>
                      </div>
                    </div>
                  )}
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

      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-lg animate-fadeIn">
          <div className="bg-neutral-800/70 backdrop-blur-xl rounded-2xl p-7 max-w-md w-full border border-neutral-700 shadow-2xl animate-slideUp">
            <div className="flex justify-between items-start mb-5">
              <h2 className="text-xl font-medium text-neutral-100">Options & Info</h2>
              <button onClick={() => setShowInfoModal(false)} className="text-neutral-500 hover:text-neutral-200 transition-colors p-1 -mr-1 -mt-1 rounded-md hover:bg-neutral-700/50">
                <X size={20} />
              </button>
            </div>
            <div className="mb-6 space-y-3">
              <h3 className="text-neutral-100 font-semibold">Secondary Globe Display</h3>
              <div className="relative">
                <select 
                  value={secondaryGlobeMode === 'antipodal' ? 'antipodal' : selectedPrehistoricMap?.url || ''} 
                  onChange={handleSecondaryGlobeOptionChange} 
                  className="w-full appearance-none bg-neutral-700/60 border border-neutral-600 text-neutral-100 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 pr-8"
                >
                  <option value="antipodal">Modern Antipodal View</option>
                  {prehistoricMapOptions.map(map => (<option key={map.url} value={map.url}>{map.name}</option>))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              </div>
              <p className="text-xs text-neutral-500">
                {/* ... description based on mode ... */}
                {secondaryGlobeMode === 'antipodal' ? "Shows the point directly opposite the primary globe's center." : "Shows the same central point as the primary globe, but on an ancient Earth map."}
              </p>
              {secondaryGlobeMode === 'prehistoric_same_point' && selectedPrehistoricMap && (
                <div className="text-xs text-neutral-500 mt-2 space-y-1">
                    {/* ... map attribution ... */}
                    <p>Map: <span className="text-neutral-300">{selectedPrehistoricMap.name}</span></p>
                    <div className="flex items-center gap-1"> <span className="text-neutral-400">Attribution:</span> <button onClick={(e) => handleAttributionClick(selectedPrehistoricMap.attribution, e)} className="cursor-pointer underline decoration-dotted decoration-neutral-400 hover:decoration-neutral-300 text-neutral-300 hover:text-neutral-100 flex items-center bg-transparent border-none p-0 text-xs"> <Info size={13} className="inline mr-1 flex-shrink-0" /> Click for details </button> </div> <p className="mt-1">Note: Prehistoric map accuracy varies. Locations are overlaid on ancient continental arrangements.</p>
                </div>
              )}
            </div>

            <div className="space-y-3 text-neutral-300 text-sm leading-relaxed">
              {/* ... info text based on mode ... */}
              {secondaryGlobeMode === 'antipodal' ? ( <p> An antipode is the point on Earth's surface directly opposite your location. If you could dig straight through the Earth's center, you'd emerge there. Interestingly, most of Earth's land has its antipode in water; only about 4% of land is antipodal to other land! </p> ) : selectedPrehistoricMap ? ( <p> This map depicts Earth during the <strong className="text-neutral-100">{selectedPrehistoricMap.name.split('(')[0].trim()}</strong> {selectedPrehistoricMap.name.match(/\(([^)]+)\)/)?.[1] ? <span className="text-neutral-200">{` (approximately ${selectedPrehistoricMap.name.match(/\(([^)]+)\)/)?.[1]})`}</span> : ''}. Continental configurations and coastlines were vastly different from today. Locations are overlaid using modern coordinates, offering a glimpse into deep time. </p> ) : null}
              <div className="pt-2">
                <h3 className="text-neutral-100 font-semibold mb-1.5">Controls</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-neutral-300">
                    {/* ... controls list ... */}
                    <li>Drag globes to rotate.</li> <li>Scroll or pinch to zoom.</li> <li>Globes are synced.</li> <li>Use "My Location" to re-center.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {attributionPopover && (
        <div
            ref={attributionPopoverRef}
            style={{ position: 'fixed', top: `${attributionPopover.y + 10}px`, left: `${attributionPopover.x + 10}px`, zIndex: 60 }}
            className="bg-neutral-700/90 backdrop-blur-sm border border-neutral-600 p-3 rounded-lg shadow-xl text-xs text-neutral-100 max-w-[280px] sm:max-w-xs animate-fadeIn"
        >
            {/* ... attribution popover content ... */}
            <div className="flex justify-between items-center mb-2"> <span className="font-semibold text-sm text-neutral-100">Map Attribution</span> <button onClick={() => setAttributionPopover(null)} className="text-neutral-400 hover:text-neutral-100 bg-transparent border-none p-0 leading-none text-xl hover:bg-neutral-600/50 rounded-full w-5 h-5 flex items-center justify-center" aria-label="Close attribution"> &times; </button> </div> <p className="text-neutral-200 leading-normal">{attributionPopover.text}</p>
        </div>
      )}
    </div>
  );
};

export default GlobeViewer;