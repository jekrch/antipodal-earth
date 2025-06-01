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
  const [isLoading, setIsLoading] = useState(true);
  const [pointOfView, setPointOfView] = useState<PointOfView>({
    lat: 0,
    lng: 0,
    altitude: 2.5,
  });

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
      color: '#3b82f6', // Tailwind's blue-500
      size: 0.8 // This value's interpretation depends on react-globe.gl; adjust if needed
    }] : [];

  const antipodalPoint = pointOfView.lat !== undefined && pointOfView.lng !== undefined ?
    [{
      ...getAntipodal({ lat: pointOfView.lat, lng: pointOfView.lng }),
      name: 'Antipodal Point',
      color: '#10b981', // Tailwind's emerald-500
      size: 0.8 // This value's interpretation depends on react-globe.gl; adjust if needed
    }] : [];

  // Get user location on mount
  useEffect(() => {
    const getUserLocation = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        if (data.latitude && data.longitude) {
          const userLocation = {
            lat: data.latitude,
            lng: data.longitude,
            altitude: 2.5, // Default altitude
          };
          setPointOfView(userLocation);
          
          if (globeEl.current && globeReady) {
            globeEl.current.pointOfView(userLocation, 1000);
          }
          if (antipodalGlobeEl.current && antipodalGlobeReady) {
            antipodalGlobeEl.current.pointOfView(getAntipodal(userLocation), 1000);
          }
        }
      } catch (error) {
        console.warn('IP-based geolocation failed or was blocked. Using default location.');
        // Fallback to a default location if IP geolocation fails
        const defaultLocation = { lat: 37.7749, lng: -122.4194, altitude: 2.5 }; // San Francisco
        setPointOfView(defaultLocation);
        if (globeEl.current && globeReady) {
          globeEl.current.pointOfView(defaultLocation, 1000);
        }
        if (antipodalGlobeEl.current && antipodalGlobeReady) {
          antipodalGlobeEl.current.pointOfView(getAntipodal(defaultLocation), 1000);
        }
      } finally {
        setIsLoading(false);
      }
    };

    getUserLocation();
  }, [globeReady, antipodalGlobeReady]); // Added dependencies

  // Handle container resize
  useEffect(() => {
    const handleResize = () => {
      setTimeout(() => {
        if (mainContainerRef.current) {
          const rect = mainContainerRef.current.getBoundingClientRect();
          setDimensions({
            width: rect.width,
            height: rect.height,
          });
        }
        if (antipodalContainerRef.current) {
          const rect = antipodalContainerRef.current.getBoundingClientRect();
          setAntipodalDimensions({
            width: rect.width,
            height: rect.height,
          });
        }
      }, 100); // Debounce slightly
    };

    handleResize(); // Initial size
    window.addEventListener('resize', handleResize);
    
    const resizeObserver = new ResizeObserver(handleResize);
    if (mainContainerRef.current) {
      resizeObserver.observe(mainContainerRef.current);
    }
    if (antipodalContainerRef.current) {
      resizeObserver.observe(antipodalContainerRef.current);
    }
    
    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, []);

  // Handle main globe POV changes
  const handleMainPovChange = (newPov: PointOfView) => {
    setPointOfView(newPov);
    if (antipodalGlobeEl.current && antipodalGlobeReady && 
        newPov.lat !== undefined && newPov.lng !== undefined && newPov.altitude !== undefined) {
      const antipodalPov = getAntipodal({
        lat: newPov.lat,
        lng: newPov.lng,
        altitude: newPov.altitude,
      });
      antipodalGlobeEl.current.pointOfView(antipodalPov, 0); // No transition time for synced movement
    }
  };

  // Handle antipodal globe POV changes
  const handleAntipodalPovChange = (newPov: PointOfView) => {
    if (newPov.lat !== undefined && newPov.lng !== undefined && newPov.altitude !== undefined) {
      const mainPov = getAntipodal({
        lat: newPov.lat,
        lng: newPov.lng,
        altitude: newPov.altitude,
      });
      setPointOfView(mainPov);
      if (globeEl.current && globeReady) {
        globeEl.current.pointOfView(mainPov, 0); // No transition time for synced movement
      }
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
          altitude: 2.5,
        };
        setPointOfView(userLocation);
        if (globeEl.current) {
          globeEl.current.pointOfView(userLocation, 1000);
        }
        // Antipodal globe will be updated by the handleMainPovChange via setPointOfView effect
      }
    } catch (error) {
      console.warn('IP-based geolocation failed on reset. Using default location.');
      const defaultLocation = { lat: 0, lng: 0, altitude: 2.5 };
      setPointOfView(defaultLocation);
      if (globeEl.current) {
        globeEl.current.pointOfView(defaultLocation, 1000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-neutral-950 overflow-hidden"> {/* Darker base */}
      {/* Subtle gradient overlay, adjusted for new base */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neutral-950/30 to-neutral-950 pointer-events-none" />

      <div className="relative h-full flex flex-col lg:flex-row gap-0">
        {/* Main Globe Panel */}
        <div className="flex-1 relative overflow-hidden border-b lg:border-b-0 lg:border-r border-neutral-800"> {/* Softer border */}
          <div className="h-full flex flex-col">
            <div className="absolute top-0 left-0 right-0 z-10 p-4 lg:p-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" /> {/* Slightly larger dot */}
                <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Primary</h2> {/* Adjusted text */}
              </div>
            </div>
            
            <div ref={mainContainerRef} className="flex-1 relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <Globe
                  ref={globeEl as RefObject<GlobeMethods>}
                  globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
                  bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
                  backgroundImageUrl="" // Ensure no default bg image from lib
                  backgroundColor="rgba(0,0,0,0)" // Fully transparent globe bg
                  
                  pointsData={currentPoint}
                  pointLat="lat"
                  pointLng="lng"
                  pointLabel="name"
                  pointColor="color"
                  pointAltitude={0.015} // Slightly more lift
                  pointRadius="size" // Ensure 'size' in pointsData is appropriate (e.g., 0.5 to 1 for small markers)
                  
                  onGlobeReady={() => setGlobeReady(true)}
                  onZoom={handleMainPovChange as any} // Type assertion if necessary
                  enablePointerInteraction={true}
                  
                  atmosphereColor="#3b82f6" // Tailwind blue-500
                  atmosphereAltitude={0.18} // Slightly thicker atmosphere
                  
                  width={dimensions.width}
                  height={dimensions.height}
                  
                  rendererConfig={{ 
                    antialias: true, 
                    alpha: true,
                    preserveDrawingBuffer: true 
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Antipodal Globe Panel */}
        <div className="flex-1 relative overflow-hidden border-b lg:border-b-0 lg:border-r border-neutral-800"> {/* Softer border */}
          <div className="h-full flex flex-col">
            <div className="absolute top-0 left-0 right-0 z-10 p-4 lg:p-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> {/* Slightly larger dot */}
                <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Antipodal</h2> {/* Adjusted text */}
              </div>
            </div>
            
            <div ref={antipodalContainerRef} className="flex-1 relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <Globe
                  ref={antipodalGlobeEl as RefObject<GlobeMethods>}
                  globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
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
                  
                  onGlobeReady={() => setAntipodalGlobeReady(true)}
                  onZoom={handleAntipodalPovChange as any} // Type assertion if necessary
                  enablePointerInteraction={true}
                  
                  atmosphereColor="#10b981" // Tailwind emerald-500
                  atmosphereAltitude={0.18}
                  
                  width={antipodalDimensions.width}
                  height={antipodalDimensions.height}
                  
                  rendererConfig={{ 
                    antialias: true, 
                    alpha: true,
                    preserveDrawingBuffer: true 
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Controls Panel */}
        <div className="flex-1 lg:flex-1 relative overflow-hidden">
          <div className="h-full flex flex-col justify-center items-center p-6 lg:p-10"> {/* Slightly reduced padding */}
            <div className="mb-8 lg:mb-10 text-center">
              <h1 className="text-3xl lg:text-4xl font-light text-neutral-100 mb-2">
                Antipode
              </h1>
              <p className="text-sm text-neutral-500">
                Explore Earth's opposite points
              </p>
            </div>

            <div className="w-full max-w-xs space-y-6 mb-8 lg:mb-10"> {/* Reduced max-width for tighter look */}
              <div className="group">
                <div className="flex items-center gap-2.5 mb-2.5"> {/* Adjusted spacing */}
                  <MapPin size={14} className="text-blue-400" /> {/* Slightly lighter blue for icon */}
                  <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Primary Location</span>
                </div>
                <div className="bg-neutral-800/50 backdrop-blur-md rounded-xl p-4 border border-neutral-700/80 
                               transition-all duration-300 group-hover:border-blue-500/70 group-hover:shadow-xl group-hover:shadow-blue-500/10"> {/* Updated style */}
                  <div className="font-mono text-lg text-neutral-100 tabular-nums">
                    {pointOfView.lat?.toFixed(4) ?? '0.0000'}°, {pointOfView.lng?.toFixed(4) ?? '0.0000'}°
                  </div>
                </div>
              </div>

              {pointOfView.lat !== undefined && pointOfView.lng !== undefined && (
                <div className="group">
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <Globe2 size={14} className="text-emerald-400" /> {/* Slightly lighter emerald for icon */}
                    <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Antipodal Location</span>
                  </div>
                  <div className="bg-neutral-800/50 backdrop-blur-md rounded-xl p-4 border border-neutral-700/80
                                 transition-all duration-300 group-hover:border-emerald-500/70 group-hover:shadow-xl group-hover:shadow-emerald-500/10"> {/* Updated style */}
                    <div className="font-mono text-lg text-neutral-100 tabular-nums">
                      {(-pointOfView.lat).toFixed(4)}°, {(pointOfView.lng < 0 ? pointOfView.lng + 180 : pointOfView.lng - 180).toFixed(4)}°
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="w-full max-w-xs space-y-3">
              <button
                onClick={resetToUserLocation}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-5 py-2.5 
                           bg-blue-600/80 hover:bg-blue-500/90 backdrop-blur-sm
                           rounded-lg text-sm font-medium text-blue-100 hover:text-white transition-all duration-300 
                           border border-blue-500/50 hover:border-blue-400/70
                           disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-blue-500/40" // Enhanced primary button
              >
                <Navigation size={15} className={isLoading ? 'animate-spin_slow' : ''} /> {/* Custom slow spin or keep pulse */}
                {isLoading ? 'Locating...' : 'My Location'}
              </button>

              <button
                onClick={() => setShowModal(true)}
                className="w-full flex items-center justify-center gap-2 px-5 py-2.5
                           bg-neutral-700/40 hover:bg-neutral-700/60 backdrop-blur-sm
                           rounded-lg text-sm font-medium text-neutral-300 hover:text-neutral-100 transition-all duration-300 
                           border border-neutral-600/70 hover:border-neutral-500/90" // Enhanced secondary button
              >
                <Info size={15} />
                How it works
              </button>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-lg animate-fadeIn"> {/* Enhanced backdrop */}
          <div className="bg-neutral-800/70 backdrop-blur-xl rounded-2xl p-7 max-w-md w-full border border-neutral-700 shadow-2xl animate-slideUp"> {/* Enhanced modal style */}
            <div className="flex justify-between items-start mb-5">
              <h2 className="text-xl font-medium text-neutral-100">About Antipode</h2> {/* Adjusted title */}
              <button
                onClick={() => setShowModal(false)}
                className="text-neutral-500 hover:text-neutral-200 transition-colors p-1 -mr-1 -mt-1 rounded-md hover:bg-neutral-700/50" /* Added hover bg for button */
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
                <h3 className="text-neutral-100 font-semibold">Navigation</h3> {/* Bolder sub-heading */}
                <ul className="space-y-2.5">
                  <li className="flex items-start gap-2.5">
                    <span className="text-blue-400 mt-1">•</span> {/* Adjusted alignment and color */}
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