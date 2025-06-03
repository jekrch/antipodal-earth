import React from 'react';
import { X, ChevronDown, Info } from 'lucide-react';
import { FaGithub } from 'react-icons/fa';
import type { PrehistoricMapOption } from '../types';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  secondaryGlobeMode: 'antipodal' | 'prehistoric_same_point';
  selectedPrehistoricMap: PrehistoricMapOption | null;
  prehistoricMapOptions: PrehistoricMapOption[];
  onSecondaryGlobeOptionChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onAttributionClick: (text: string, event: React.MouseEvent) => void;
  showMapTiles: boolean;
  onMapTilesToggle: (checked: boolean) => void;
}

const InfoModal: React.FC<InfoModalProps> = ({
  isOpen,
  onClose,
  secondaryGlobeMode,
  selectedPrehistoricMap,
  prehistoricMapOptions,
  onSecondaryGlobeOptionChange,
  onAttributionClick,
  showMapTiles,
  onMapTilesToggle,
}) => {
  if (!isOpen) return null;

  const currentYear = new Date().getFullYear();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-lg animate-fadeIn">
      <div className="bg-neutral-800/70 backdrop-blur-xl rounded-2xl p-7 max-w-md w-full border border-neutral-700 shadow-2xl animate-slideUp">
        <div className="flex justify-between items-start mb-5">
          <h2 className="text-xl font-medium text-neutral-100">Options & Info</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-200 transition-colors p-1 -mr-1 -mt-1 rounded-md hover:bg-neutral-700/50">
            <X size={20} />
          </button>
        </div>
        <div className="mb-6 space-y-3">
          <h3 className="text-neutral-100 font-semibold">Secondary Globe Display</h3>
          <div className="relative">
            <select
              value={secondaryGlobeMode === 'antipodal' ? 'antipodal' : selectedPrehistoricMap?.url || ''}
              onChange={onSecondaryGlobeOptionChange}
              className="w-full appearance-none bg-neutral-700/60 border border-neutral-600 text-neutral-100 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 pr-8"
            >
              <option value="antipodal">Modern Antipodal View</option>
              {prehistoricMapOptions.map(map => (<option key={map.url} value={map.url}>{map.name}</option>))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          </div>
          <p className="text-xs text-neutral-500">
            {secondaryGlobeMode === 'antipodal' ? "Shows the point directly opposite the primary globe's center." : "Shows the same central point as the primary globe, but on an ancient Earth map."}
          </p>
          {secondaryGlobeMode === 'prehistoric_same_point' && selectedPrehistoricMap && (
            <div className="text-xs text-neutral-500 mt-2 space-y-1">
              <div className="flex items-center gap-1">
                <button onClick={(e) => onAttributionClick(selectedPrehistoricMap.attribution, e)} className="cursor-pointer underline decoration-dotted decoration-neutral-400 hover:decoration-neutral-300 text-neutral-300 hover:text-neutral-100 flex items-center bg-transparent border-none p-0 text-xs">
                  <Info size={13} className="inline mr-1 flex-shrink-0" /> CC Attribution
                </button>
              </div>
              <p className="mt-1">Note: Prehistoric map accuracy varies. Locations are overlaid on ancient continental arrangements.</p>
            </div>
          )}
        </div>

        <div className="mb-4">
          <h3 className="text-neutral-100 font-semibold mb-2">Map Overlay</h3>
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={showMapTiles}
              onChange={(e) => onMapTilesToggle(e.target.checked)}
              className="w-4 h-4 rounded border-neutral-600 bg-neutral-700/60 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 focus:ring-offset-neutral-800"
            />
            <div className="flex-1">
              <span className="text-sm text-neutral-100 group-hover:text-white transition-colors">
                Show street map overlay
              </span>
              <p className="text-xs text-neutral-500 mt-0.5">
                Displays OpenStreetMap data on modern Earth-based globes
              </p>
            </div>
          </label>
        </div>

        {/* <div className="space-y-3 text-neutral-300 text-sm leading-relaxed">
          {secondaryGlobeMode === 'antipodal' ? ( <p> An antipode is the point on Earth's surface directly opposite your location. If you could dig straight through the Earth's center, you'd emerge there. Interestingly, most of Earth's land has its antipode in water; only about 4% of land is antipodal to other land! </p> ) : selectedPrehistoricMap ? ( <p> This map depicts Earth during the <strong className="text-neutral-100">{selectedPrehistoricMap.name.split('(')[0].trim()}</strong> {selectedPrehistoricMap.name.match(/\(([^)]+)\)/)?.[1] ? <span className="text-neutral-200">{` (approximately ${selectedPrehistoricMap.name.match(/\(([^)]+)\)/)?.[1]})`}</span> : ''}. Continental configurations and coastlines were vastly different from today. Locations are overlaid using modern coordinates, offering a glimpse into deep time. </p> ) : null}
          <div className="pt-2">
            <h3 className="text-neutral-100 font-semibold mb-1.5">Controls</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-neutral-300">
              <li>Drag globes to rotate.</li> <li>Scroll or pinch to zoom.</li> <li>Globes are synced.</li> <li>Use "My Location" to re-center.</li>
            </ul>
          </div>
        </div> */}

        <div className="mt-6 pt-4 border-t border-neutral-700/70 flex justify-between items-center text-xs">
          <p className="text-neutral-500">
            © {currentYear}{' '}
            <a
              href="https://jacobkrch.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-neutral-200 transition-colors hover:underline"
            >
              Jacob Krch
            </a>
          </p>
          <a
            href="https://github.com/jekrch/juxtaglobe"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View source code on GitHub"
            className="text-neutral-500 hover:text-neutral-200 transition-colors -mb-4 -mt-2"
          >
            <FaGithub size={28} />
          </a>
        </div>
      </div>
    </div>
  );
};

export default InfoModal;