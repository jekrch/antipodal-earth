import React, { useState, useRef, useEffect } from 'react';
import type { RefObject } from 'react';
import Globe from 'react-globe.gl';
import type { GlobeMethods } from 'react-globe.gl';
import { MapPin, Globe2, RotateCw, Info, X, Navigation } from 'lucide-react';
import '../index.css'; // Assuming this contains your Tailwind directives and custom animations

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

const GlobeViewer: React.FC = () => {
  const globeEl = useRef<GlobeMethods | undefined>(undefined);
  const antipodalGlobeEl = useRef<GlobeMethods | undefined>(undefined);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const antipodalContainerRef = useRef<HTMLDivElement>(null);

  const [globeReady, setGlobeReady] = useState(false);
  const [antipodalGlobeReady, setAntipodalGlobeReady] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 400, height: 400 });
  const [antipodalDimensions, setAntipodalDimensions] = useState({ width: 400, height: 400 });
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pointOfView, setPointOfView] = useState<PointOfView>(KANSAS_LOCATION);

  const initialAnimationToKansasDone = useRef(false);
  const ipLookupAttempted = useRef(false);
  const previousPovRef = useRef<PointOfView>(KANSAS_LOCATION);
  const expectAnimatedMoveRef = useRef(false); // To signal an animated programmatic move


  const getAntipodal = (coords: LocationCoordinates): LocationCoordinates => ({
    lat: -coords.lat,
    lng: coords.lng < 0 ? coords.lng + 180 : coords.lng - 180,
    altitude: coords.altitude,
  });

  const currentPoint = pointOfView.lat !== undefined && pointOfView.lng !== undefined ?
    [{
      lat: pointOfView.lat,
      lng: pointOfView.lng,
      name: 'Current Location',
      color: '#3b82f6',
      size: 0.8
    }] : [];

  const antipodalPoint = pointOfView.lat !== undefined && pointOfView.lng !== undefined ?
    [{
      ...getAntipodal({ lat: pointOfView.lat, lng: pointOfView.lng, altitude: pointOfView.altitude }),
      name: 'Antipodal Point',
      color: '#10b981',
      size: 0.8
    }] : [];

  // Effect 1: Initial setup - Animate to Kansas ONCE, then try IP lookup.
  useEffect(() => {
    if (globeReady && antipodalGlobeReady && !initialAnimationToKansasDone.current) {
      console.log("EFFECT 1: Initializing to Kansas.");
      initialAnimationToKansasDone.current = true; 
      
      // Direct animation to Kansas, not through Effect 2 for this very first move.
      if (globeEl.current) {
        globeEl.current.pointOfView(KANSAS_LOCATION, 1000);
      }
      if (antipodalGlobeEl.current) {
        antipodalGlobeEl.current.pointOfView(getAntipodal(KANSAS_LOCATION), 1000);
      }

      setTimeout(() => {
        if (!ipLookupAttempted.current) {
          ipLookupAttempted.current = true;
          console.log("EFFECT 1 (post-delay): Attempting IP lookup.");
          setIsLoading(true);
          fetch('https://ipapi.co/json/')
            .then(response => response.json())
            .then(data => {
              if (data.latitude && data.longitude) {
                const userLocation = {
                  lat: data.latitude,
                  lng: data.longitude,
                  altitude: 2.5, // Fixed altitude for IP location
                };
                console.log("IP Lookup successful, preparing animated move to:", userLocation);
                expectAnimatedMoveRef.current = true; // Signal that the next POV change should be animated
                setPointOfView(userLocation); 
              } else {
                console.warn('IP-based geolocation returned no coordinates. Sticking with Kansas.');
              }
            })
            .catch(error => {
              console.warn('IP-based geolocation failed. Sticking with Kansas.', error);
            })
            .finally(() => {
              setIsLoading(false);
            });
        }
      }, 1500); 
    }
  }, [globeReady, antipodalGlobeReady]);


  // Effect 2: Sync globes to pointOfView state.
  useEffect(() => {
    // Don't run if Kansas animation hasn't been flagged as started,
    // to prevent interference with Effect 1's direct pointOfView calls for initial Kansas.
    if (!initialAnimationToKansasDone.current) {
      console.log("EFFECT 2: Skipped, initial Kansas animation not yet flagged as done.");
      return;
    }

    const currentPov = { lat: pointOfView.lat, lng: pointOfView.lng, altitude: pointOfView.altitude };
    if (currentPov.lat === undefined || currentPov.lng === undefined) {
      console.log("EFFECT 2: Skipped, current POV lat/lng undefined.");
      return;
    }

    let transitionDuration = 0; 
    if (expectAnimatedMoveRef.current) {
      console.log("EFFECT 2: Performing expected animated move to POV:", currentPov);
      transitionDuration = 1000;
      expectAnimatedMoveRef.current = false; // Consume the flag
    } else {
      console.log("EFFECT 2: Performing snap/user-driven move to POV:", currentPov);
    }
    
    if (globeEl.current && globeReady) {
      globeEl.current.pointOfView(currentPov as LocationCoordinates, transitionDuration);
    }
    if (antipodalGlobeEl.current && antipodalGlobeReady) {
      antipodalGlobeEl.current.pointOfView(getAntipodal(currentPov as LocationCoordinates), transitionDuration);
    }

    previousPovRef.current = { ...currentPov };

  }, [pointOfView, globeReady, antipodalGlobeReady]);
  

  // Handle container resize
  useEffect(() => {
    const handleResize = () => { /* ... same as before ... */ };
    handleResize(); window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(handleResize);
    if (mainContainerRef.current) resizeObserver.observe(mainContainerRef.current);
    if (antipodalContainerRef.current) resizeObserver.observe(antipodalContainerRef.current);
    return () => { window.removeEventListener('resize', handleResize); resizeObserver.disconnect(); };
  }, []);

  const handleMainPovChange = (newPov: PointOfView) => {
    console.log("Main globe user interaction (zoom/drag):", newPov);
    // User interaction should override any pending animated move and snap immediately.
    expectAnimatedMoveRef.current = false; 
    setPointOfView(newPov);
  };

  const handleAntipodalPovChange = (newPovFromAntipodal: PointOfView) => {
    if (newPovFromAntipodal.lat !== undefined && newPovFromAntipodal.lng !== undefined && newPovFromAntipodal.altitude !== undefined) {
      console.log("Antipodal globe user interaction (zoom/drag):", newPovFromAntipodal);
      // User interaction should override any pending animated move and snap immediately.
      expectAnimatedMoveRef.current = false; 
      const mainPov = getAntipodal(newPovFromAntipodal as LocationCoordinates);
      setPointOfView(mainPov);
    }
  };

  const resetToUserLocation = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      if (data.latitude && data.longitude) {
        const userLocation = {
          lat: data.latitude,
          lng: data.longitude,
          altitude: 2.5, // Fixed altitude for "My Location"
        };
        console.log("Reset to User Location, preparing animated move to:", userLocation);
        expectAnimatedMoveRef.current = true; // Signal that this POV change should be animated
        setPointOfView(userLocation); 
      } else {
        console.warn('IP-based geolocation failed on reset (no data). Reverting to Kansas.');
        expectAnimatedMoveRef.current = true; // Also animate back to Kansas if IP fails here
        setPointOfView(KANSAS_LOCATION); 
      }
    } catch (error) {
      console.warn('IP-based geolocation failed on reset. Reverting to Kansas.');
      expectAnimatedMoveRef.current = true; // Animate back to Kansas
      setPointOfView(KANSAS_LOCATION);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-neutral-950 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neutral-950/30 to-neutral-950 pointer-events-none" />

      <div className="relative h-full flex flex-col lg:flex-row gap-0">
        {/* Main Globe Panel */}
        <div className="flex-1 relative overflow-hidden border-b lg:border-b-0 lg:border-r border-neutral-800">
          <div className="h-full flex flex-col">
            <div className="absolute top-0 left-0 right-0 z-10 p-4 lg:p-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Primary</h2>
              </div>
            </div>
            <div ref={mainContainerRef} className="flex-1 relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <Globe
                  ref={globeEl as RefObject<GlobeMethods>}
                  globeImageUrl="//unpkg.com/three-globe/example/img/earth-day.jpg"
                  bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
                  backgroundImageUrl=""
                  backgroundColor="rgba(0,0,0,0)"
                  pointsData={currentPoint}
                  pointLat="lat"
                  pointLng="lng"
                  pointLabel="name"
                  pointColor="color"
                  pointAltitude={0.015}
                  pointRadius="size"
                  onGlobeReady={() => { console.log("Main globe ready."); setGlobeReady(true);}}
                  onZoom={handleMainPovChange as any}
                  enablePointerInteraction={true}
                  atmosphereColor="#3b82f6"
                  atmosphereAltitude={0.18}
                  width={dimensions.width}
                  height={dimensions.height}
                  rendererConfig={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Antipodal Globe Panel */}
        <div className="flex-1 relative overflow-hidden border-b lg:border-b-0 lg:border-r border-neutral-800">
          <div className="h-full flex flex-col">
            <div className="absolute top-0 left-0 right-0 z-10 p-4 lg:p-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Antipodal</h2>
              </div>
            </div>
            <div ref={antipodalContainerRef} className="flex-1 relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <Globe
                  ref={antipodalGlobeEl as RefObject<GlobeMethods>}
                  globeImageUrl="//unpkg.com/three-globe/example/img/earth-day.jpg"
                  bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
                  backgroundImageUrl=""
                  backgroundColor="rgba(0,0,0,0)"
                  pointsData={antipodalPoint}
                  pointLat="lat"
                  pointLng="lng"
                  pointLabel="name"
                  pointColor="color"
                  pointAltitude={0.015}
                  pointRadius="size"
                  onGlobeReady={() => { console.log("Antipodal globe ready."); setAntipodalGlobeReady(true);}}
                  onZoom={handleAntipodalPovChange as any}
                  enablePointerInteraction={true}
                  atmosphereColor="#10b981"
                  atmosphereAltitude={0.18}
                  width={antipodalDimensions.width}
                  height={antipodalDimensions.height}
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
                <h1 className="text-2xl lg:text-4xl font-light text-neutral-100 lg:mb-2">
                  Antipodal Earth
                </h1>
                <p className="text-sm lg:text-base text-neutral-400 font-normal">
                  Explore Earth's opposite points
                </p>
              </div>
            </div>
            <div className="w-full max-w-xl lg:max-w-xs">
              <div className="flex flex-row items-stretch gap-x-4 lg:flex-col lg:items-stretch lg:gap-x-0 lg:gap-y-6">
                <div className="flex-1 w-full lg:flex-none space-y-3 lg:space-y-4">
                  <div className="group">
                    <div className="flex items-center gap-2 mb-1 sm:mb-2">
                      <MapPin size={12} className="text-blue-400" />
                      <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Primary</span>
                    </div>
                    <div className="bg-neutral-800/50 backdrop-blur-md rounded-lg sm:rounded-xl p-2.5 sm:p-3 border border-neutral-700/80 
                                    transition-all duration-300 group-hover:border-blue-500/70 group-hover:shadow-xl group-hover:shadow-blue-500/10">
                      <div className="font-mono text-sm sm:text-base text-neutral-100 tabular-nums">
                        {pointOfView.lat?.toFixed(3) ?? '0.000'}°, {pointOfView.lng?.toFixed(3) ?? '0.000'}°
                      </div>
                    </div>
                  </div>
                  {pointOfView.lat !== undefined && pointOfView.lng !== undefined && (
                    <div className="group">
                      <div className="flex items-center gap-2 mb-1 sm:mb-2">
                        <Globe2 size={12} className="text-emerald-400" />
                        <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Antipodal</span>
                      </div>
                      <div className="bg-neutral-800/50 backdrop-blur-md rounded-lg sm:rounded-xl p-2.5 sm:p-3 border border-neutral-700/80
                                      transition-all duration-300 group-hover:border-emerald-500/70 group-hover:shadow-xl group-hover:shadow-emerald-500/10">
                        <div className="font-mono text-sm sm:text-base text-neutral-100 tabular-nums">
                          {(-pointOfView.lat).toFixed(3)}°, {(pointOfView.lng < 0 ? pointOfView.lng + 180 : pointOfView.lng - 180).toFixed(3)}°
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex-1 w-full lg:flex-none flex flex-col justify-center space-y-2 lg:space-y-2.5 lg:justify-start">
                  <button
                    onClick={resetToUserLocation}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-blue-600/80 hover:bg-blue-500/90 backdrop-blur-sm
                                rounded-md sm:rounded-lg text-xs sm:text-sm font-medium text-blue-100 hover:text-white transition-all duration-300 
                                border border-blue-500/50 hover:border-blue-400/70
                                disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-blue-500/40"
                  >
                    <Navigation size={13} className={isLoading ? 'animate-spin' : ''} />
                    {isLoading ? 'Locating...' : 'My Location'}
                  </button>
                  <button
                    onClick={() => setShowModal(true)}
                    className="w-full flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-neutral-700/40 hover:bg-neutral-700/60 backdrop-blur-sm
                                rounded-md sm:rounded-lg text-xs sm:text-sm font-medium text-neutral-300 hover:text-neutral-100 transition-all duration-300 
                                border border-neutral-600/70 hover:border-neutral-500/90"
                  >
                    <Info size={13} />
                    How it works
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal section */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-lg animate-fadeIn">
          <div className="bg-neutral-800/70 backdrop-blur-xl rounded-2xl p-7 max-w-md w-full border border-neutral-700 shadow-2xl animate-slideUp">
            <div className="flex justify-between items-start mb-5">
              <h2 className="text-xl font-medium text-neutral-100">About Antipode</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-neutral-500 hover:text-neutral-200 transition-colors p-1 -mr-1 -mt-1 rounded-md hover:bg-neutral-700/50"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4 text-neutral-300 text-sm leading-relaxed">
              <p>
                An antipode is the point on Earth's surface directly opposite to your location. 
                If you could dig straight through the center of the Earth, you'd emerge at your antipodal point.
              </p>
              <div className="space-y-3 pt-2">
                <h3 className="text-neutral-100 font-semibold">Navigation</h3>
                <ul className="space-y-2.5">
                  <li className="flex items-start gap-2.5">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>Drag either globe to rotate and explore</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>Scroll or pinch to zoom in and out</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>Both globes sync automatically - moving one moves the other</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>Click "My Location" to return to your current position</span>
                  </li>
                </ul>
              </div>
              <p className="pt-2 text-neutral-500 text-xs">
                Fun fact: Most of Earth's land has its antipode in water. Only about 4% of land is antipodal to other land!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobeViewer;