import React from 'react';
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
}) => {
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
        <div ref={panelRef} className="flex-1 relative">
          {(dimensions.width > 0 && dimensions.height > 0) && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Globe
                ref={globeRef}
                globeImageUrl={globeImageUrl}
                bumpImageUrl={bumpImageUrl}
                backgroundImageUrl=""
                backgroundColor="rgba(0,0,0,0)"
                pointsData={pointsData}
                pointLat="lat"
                pointLng="lng"
                pointLabel="name"
                pointColor="color"
                pointAltitude={0.015}
                pointRadius="size"
                onGlobeReady={onGlobeReady}
                onZoom={onZoom}
                enablePointerInteraction={true}
                atmosphereColor={atmosphereColor}
                atmosphereAltitude={0.18}
                width={dimensions.width}
                height={dimensions.height}
                rendererConfig={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobePanel;