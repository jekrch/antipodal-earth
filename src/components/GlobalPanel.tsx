import React, { useEffect } from 'react';
import Globe from 'react-globe.gl';
import type { GlobeMethods } from 'react-globe.gl';
import type { PointOfView } from '../types';

interface GlobePanelProps {
  panelRef: React.RefObject<HTMLDivElement>;
  globeRef: React.RefObject<GlobeMethods | undefined>;
  globeImageUrl: string;
  bumpImageUrl?: string;
  pointsData: any[];
  onGlobeReady: () => void;
  onZoom: (pov: PointOfView) => void;
  atmosphereColor: string;
  dimensions: { width: number; height: number };
  labelText: string;
  labelColorIndicatorClass: string;
  showMapTiles?: boolean;
  zoomSpeed?: number;
}

const GlobePanel: React.FC<GlobePanelProps> = ({
  panelRef,
  globeRef,
  globeImageUrl,
  bumpImageUrl = "",
  pointsData,
  onGlobeReady,
  onZoom,
  atmosphereColor,
  dimensions,
  labelText,
  labelColorIndicatorClass,
  showMapTiles = false,
  zoomSpeed = 20,
}) => {
  // Only show map tiles if the globe image URL contains "earth" (case-insensitive)
  const isEligibleForMapTiles = globeImageUrl.toLowerCase().includes('earth');
  const shouldShowTiles = showMapTiles && isEligibleForMapTiles;

  useEffect(() => {
    // Access the Three.js controls after the globe is ready
    if (globeRef.current) {
      const globe = globeRef.current;
      // Access the underlying Three.js controls
      const controls = (globe as any).controls();
      if (controls) {
        controls.zoomSpeed = zoomSpeed;
        controls.rotateSpeed = 1;
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.enablePan = false;
        controls.autoRotate = false;
      }
    }
  }, [globeRef, zoomSpeed]);

  return (
    <div className="flex-1 relative overflow-hidden border-b lg:border-b-0 lg:border-r border-neutral-800">
      <div className="h-full flex flex-col">
        <div className="absolute top-0 left-0 right-0 z-10 p-4 lg:p-6">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 ${labelColorIndicatorClass} rounded-full animate-pulsex`} />
            <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              {labelText}
            </h2>
          </div>
        </div>
        <div ref={panelRef} className="flex-1 relative select-none">
          {(dimensions.width > 0 && dimensions.height > 0) && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Globe
                ref={globeRef}
                globeImageUrl={globeImageUrl}
                bumpImageUrl={bumpImageUrl}
                backgroundImageUrl=""
                backgroundColor="rgba(0,0,0,0)"
                pointsData={[]} // Empty array - no globe points
                pointLat="lat"
                pointLng="lng"
                pointLabel="name"
                pointColor=""
                pointAltitude={0}
                pointRadius="size"              
                onGlobeReady={() => {
                  onGlobeReady();
                  // Set controls after globe is ready
                  if (globeRef.current) {
                    const globe = globeRef.current;
                    const controls = (globe as any).controls();
                    if (controls) {
                      controls.zoomSpeed = zoomSpeed;
                      controls.rotateSpeed = 1;
                      controls.enableDamping = true;
                      controls.dampingFactor = 0.1;
                      controls.enablePan = false;
                      controls.autoRotate = false;                    
                    }
                  }
                }}
                onZoom={onZoom}
                enablePointerInteraction={true}
                atmosphereColor={atmosphereColor}
                atmosphereAltitude={0.18}
                width={dimensions.width}
                height={dimensions.height}
                rendererConfig={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
                globeTileEngineUrl={shouldShowTiles ? (x, y, l) => `https://tile.openstreetmap.org/${l}/${x}/${y}.png` : undefined}
              />
              {/* Static dot overlay - always in the center */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`w-3 h-3 rounded-full shadow-lg shadow-red-500/50 ${labelColorIndicatorClass}`} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobePanel;