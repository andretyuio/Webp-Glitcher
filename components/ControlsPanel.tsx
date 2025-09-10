import React from 'react';
import FileUpload from './FileUpload';
import FilterControls from './FilterControls';
import ControlSlider from './ControlSlider';
import { OverlayType, FilterSettings, TransformSettings, ImageEffectsSettings, OverlaySettings, CrosshairType, TerminalTheme } from '../types';

type LoadingStatus = 'idle' | 'loading' | 'ready' | 'error';

interface ControlsPanelProps {
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  imageUrl: string | null;
  isRecording: boolean;
  isPaused: boolean;
  isAnimated: boolean;
  loadingStatus: LoadingStatus;
  analysisError: string | null;
  recordingError: string | null;
  handleRetry: () => void;
  overlay: OverlayType;
  setOverlay: React.Dispatch<React.SetStateAction<OverlayType>>;
  overlaySettings: OverlaySettings;
  setOverlaySettings: React.Dispatch<React.SetStateAction<OverlaySettings>>;
  filters: FilterSettings;
  setFilters: React.Dispatch<React.SetStateAction<FilterSettings>>;
  transforms: TransformSettings;
  setTransforms: React.Dispatch<React.SetStateAction<TransformSettings>>;
  startRecording: () => void;
  stopRecording: () => void;
  resetAll: () => void;
  handleDownloadFrame: () => void;
  handleTogglePause: () => void;
}

const ControlsPanel: React.FC<ControlsPanelProps> = (props) => {
    const { 
        onFileChange, imageUrl, isRecording, isPaused, isAnimated, loadingStatus, analysisError,
        recordingError, handleRetry, overlay, setOverlay, overlaySettings, setOverlaySettings, 
        filters, setFilters, transforms, setTransforms, startRecording, stopRecording, 
        resetAll, handleDownloadFrame, handleTogglePause
    } = props;
    
    const showAnalysisError = loadingStatus === 'error' && analysisError;
    const showLoadingMessage = loadingStatus === 'loading';
    const disableRecording = loadingStatus !== 'ready' || !!recordingError;

    const handleOverlaySettingChange = (
      type: 'hud' | 'cam' | 'terminal', 
      key: string, 
      value: string | number
    ) => {
      setOverlaySettings(prev => ({
        ...prev,
        [type]: {
          ...prev[type],
          [key]: value,
        }
      }))
    }

    return (
        <div className="lg:col-span-1 bg-gray-800 rounded-lg shadow-2xl p-6 h-fit sticky top-8">
            <h2 className="text-2xl font-bold mb-4 border-b-2 border-cyan-500 pb-2">Controls</h2>
            <FileUpload onFileChange={onFileChange} />
            {imageUrl && (
              <>
                <fieldset disabled={isRecording} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="overlay-select" className="block text-sm font-medium mb-2 text-cyan-400">Overlays</label>
                      <select
                        id="overlay-select"
                        value={overlay}
                        onChange={(e) => setOverlay(e.target.value as OverlayType)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      >
                        <option value="none">None</option>
                        <option value="hud">Camera HUD</option>
                        <option value="cam">Security Cam</option>
                        <option value="vcr">VCR</option>
                        <option value="scope">Scope</option>
                        <option value="terminal">Terminal</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="image-effects-select" className="block text-sm font-medium mb-2 text-cyan-400">Image Effects</label>
                      <select
                          id="image-effects-select"
                          value={filters.imageEffects.type}
                          onChange={(e) => {
                              const type = e.target.value as ImageEffectsSettings['type'];
                              setFilters(prev => ({...prev, imageEffects: {...prev.imageEffects, type, active: type !== 'none'}}));
                          }}
                          className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      >
                          <option value="none">None</option>
                          <option value="sepia">Sepia</option>
                          <option value="grayscale">Grayscale</option>
                          <option value="invert">Invert</option>
                      </select>
                    </div>
                  </div>

                  {/* --- DYNAMIC OVERLAY CONTROLS --- */}
                  {overlay === 'hud' && (
                    <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 space-y-3">
                      <h3 className="text-md font-bold text-cyan-400 -mb-1">HUD Overlay Settings</h3>
                      <ControlSlider label="Font Size" value={overlaySettings.hud.fontSize} onChange={(val) => handleOverlaySettingChange('hud', 'fontSize', val)} min={8} max={48} step={1} />
                      <div>
                        <label htmlFor="hud-topLeft" className="input-label">Top-Left Text</label>
                        <input type="text" id="hud-topLeft" value={overlaySettings.hud.topLeft} onChange={(e) => handleOverlaySettingChange('hud', 'topLeft', e.target.value)} className="text-input" />
                      </div>
                      <div>
                        <label htmlFor="hud-topRight" className="input-label">Top-Right Text</label>
                        <input type="text" id="hud-topRight" value={overlaySettings.hud.topRight} onChange={(e) => handleOverlaySettingChange('hud', 'topRight', e.target.value)} className="text-input" />
                      </div>
                      <div>
                        <label htmlFor="hud-bottomLeft" className="input-label">Bottom-Left Text</label>
                        <input type="text" id="hud-bottomLeft" value={overlaySettings.hud.bottomLeft} onChange={(e) => handleOverlaySettingChange('hud', 'bottomLeft', e.target.value)} className="text-input" />
                      </div>
                      <div>
                        <label htmlFor="hud-crosshair" className="input-label">Crosshair</label>
                        <select id="hud-crosshair" value={overlaySettings.hud.crosshair} onChange={(e) => handleOverlaySettingChange('hud', 'crosshair', e.target.value as CrosshairType)} className="select-input">
                          <option value="none">None</option>
                          <option value="classic">Classic</option>
                          <option value="dot">Dot</option>
                          <option value="plus">Plus</option>
                          <option value="circle">Circle</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between">
                         <label htmlFor="hud-color" className="input-label">Color</label>
                         <input type="color" id="hud-color" value={overlaySettings.hud.color} onChange={(e) => handleOverlaySettingChange('hud', 'color', e.target.value)} className="w-12 h-8 p-1 bg-gray-700 border border-gray-600 rounded cursor-pointer"/>
                      </div>
                      <div className="pt-2 border-t border-gray-700">
                        <label htmlFor="overlay-time-hud" className="input-label">Time</label>
                        <input type="text" id="overlay-time-hud" value={overlaySettings.time} onChange={(e) => setOverlaySettings(prev => ({ ...prev, time: e.target.value }))} className="text-input" />
                      </div>
                      <div>
                        <label htmlFor="overlay-date-hud" className="input-label">Date</label>
                        <input type="text" id="overlay-date-hud" value={overlaySettings.date} onChange={(e) => setOverlaySettings(prev => ({ ...prev, date: e.target.value }))} className="text-input" />
                      </div>
                    </div>
                  )}

                  {overlay === 'cam' && (
                    <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 space-y-3">
                      <h3 className="text-md font-bold text-cyan-400 -mb-1">Security Cam Settings</h3>
                       <ControlSlider label="Font Size" value={overlaySettings.cam.fontSize} onChange={(val) => handleOverlaySettingChange('cam', 'fontSize', val)} min={4} max={24} step={0.5} />
                       <div>
                        <label htmlFor="cam-id" className="input-label">Camera ID</label>
                        <input type="text" id="cam-id" value={overlaySettings.cam.camId} onChange={(e) => handleOverlaySettingChange('cam', 'camId', e.target.value)} className="text-input" />
                      </div>
                      <div className="flex items-center justify-between">
                         <label htmlFor="cam-color" className="input-label">Color</label>
                         <input type="color" id="cam-color" value={overlaySettings.cam.color} onChange={(e) => handleOverlaySettingChange('cam', 'color', e.target.value)} className="w-12 h-8 p-1 bg-gray-700 border border-gray-600 rounded cursor-pointer"/>
                      </div>
                      <div className="pt-2 border-t border-gray-700">
                        <label htmlFor="overlay-time-cam" className="input-label">Time</label>
                        <input type="text" id="overlay-time-cam" value={overlaySettings.time} onChange={(e) => setOverlaySettings(prev => ({ ...prev, time: e.target.value }))} className="text-input" />
                      </div>
                      <div>
                        <label htmlFor="overlay-date-cam" className="input-label">Date</label>
                        <input type="text" id="overlay-date-cam" value={overlaySettings.date} onChange={(e) => setOverlaySettings(prev => ({ ...prev, date: e.target.value }))} className="text-input" />
                      </div>
                    </div>
                  )}
                  
                  {overlay === 'terminal' && (
                    <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 space-y-3">
                        <h3 className="text-md font-bold text-cyan-400 -mb-1">Terminal Settings</h3>
                        <ControlSlider label="Font Size" value={overlaySettings.terminal.fontSize} onChange={(val) => handleOverlaySettingChange('terminal', 'fontSize', val)} min={8} max={24} step={1} />
                        <div>
                          <label htmlFor="terminal-title" className="input-label">Window Title</label>
                          <input type="text" id="terminal-title" value={overlaySettings.terminal.title} onChange={(e) => handleOverlaySettingChange('terminal', 'title', e.target.value)} className="text-input" />
                        </div>
                        <div>
                          <label htmlFor="terminal-user" className="input-label">User/Prompt</label>
                          <input type="text" id="terminal-user" value={overlaySettings.terminal.user} onChange={(e) => handleOverlaySettingChange('terminal', 'user', e.target.value)} className="text-input" />
                        </div>
                        <div>
                          <label htmlFor="terminal-command" className="input-label">Command</label>
                          <input type="text" id="terminal-command" value={overlaySettings.terminal.command} onChange={(e) => handleOverlaySettingChange('terminal', 'command', e.target.value)} className="text-input" />
                        </div>
                        <div>
                          <label htmlFor="terminal-theme" className="input-label">Theme</label>
                          <select id="terminal-theme" value={overlaySettings.terminal.theme} onChange={(e) => handleOverlaySettingChange('terminal', 'theme', e.target.value as TerminalTheme)} className="select-input">
                            <option value="green">Green</option>
                            <option value="amber">Amber</option>
                            <option value="blue">Blue</option>
                            <option value="white">White</option>
                          </select>
                        </div>
                    </div>
                  )}
                  
                  <FilterControls 
                    settings={filters} 
                    onChange={setFilters} 
                    transforms={transforms}
                    onTransformChange={setTransforms}
                  />
                </fieldset>

                <div className="mt-6 space-y-3">
                    <>
                      {isRecording ? (
                        <button
                          onClick={stopRecording}
                          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 animate-pulse"
                          aria-label="Stop recording animation"
                        >
                          Recording...
                        </button>
                      ) : (
                        <button
                          onClick={startRecording}
                          disabled={disableRecording}
                          className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
                          aria-label="Start recording and download animation"
                          title={!isAnimated ? "Video recording is available for static images." : ""}
                        >
                          Record & Download Video (.webm)
                        </button>
                      )}
                      <p className="text-xs text-gray-500 text-center -mt-1">
                        {isAnimated 
                            ? "Records one full loop, then downloads."
                            : "Records for 5 seconds, then downloads."
                        }
                      </p>
                    </>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={handleDownloadFrame}
                      disabled={isRecording}
                      className={`bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 ${isAnimated ? 'flex-1' : 'w-full'}`}
                    >
                      Download Frame (.png)
                    </button>
                    {isAnimated && (
                        <button
                            onClick={handleTogglePause}
                            disabled={isRecording}
                            className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
                        >
                            {isPaused ? 'Play' : 'Pause'}
                        </button>
                    )}
                  </div>
                  
                  <button
                    onClick={resetAll}
                    disabled={isRecording}
                    className="w-full bg-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
                  >
                    Reset All
                  </button>
                </div>

                <div className="mt-4 space-y-2">
                    {showAnalysisError && !isRecording && (
                        <div className="p-3 rounded-lg bg-red-900/50 border border-red-700 text-red-300 text-center">
                            <p className="font-bold text-sm">Analysis Failed</p>
                            <p className="text-xs mt-1">{analysisError}</p>
                            <button onClick={handleRetry} className="text-sm mt-2 text-cyan-400 hover:text-cyan-300 font-bold underline">
                                Click here to retry analysis
                            </button>
                        </div>
                    )}
                    {recordingError && !isRecording && (
                        <div className="p-3 rounded-lg bg-red-900/50 border border-red-700 text-red-300 text-center">
                            <p className="font-bold text-sm">Recording Unavailable</p>
                            <p className="text-xs mt-1">{recordingError}</p>
                        </div>
                    )}
                    {(showLoadingMessage || (loadingStatus === 'ready' && !isAnimated)) && !isRecording && (
                      <div className="mt-4 p-3 rounded-lg bg-gray-700/50 border border-gray-600 text-gray-300 text-center">
                          <p className="font-bold text-sm">
                              {showLoadingMessage ? 'Analyzing File...' : 'Static Image Loaded'}
                          </p>
                          <p className="text-xs mt-1">
                              {showLoadingMessage
                                  ? 'Determining image properties...'
                                  : 'Effects are live. Recording is enabled.'}
                          </p>
                      </div>
                    )}
                </div>
              </>
            )}
            <style>{`
                .input-label { display: block; text-transform: capitalize; font-size: 0.875rem; line-height: 1.25rem; font-weight: 500; color: #9ca3af; margin-bottom: 0.25rem; }
                .text-input, .select-input { width: 100%; background-color: #374151; border: 1px solid #4b5563; border-radius: 0.375rem; padding: 0.5rem 0.75rem; color: #ffffff; font-size: 0.875rem; line-height: 1.25rem; outline: none; }
                .text-input:focus, .select-input:focus { ring: 1; border-color: #22d3ee; box-shadow: 0 0 0 1px #22d3ee; }
                .select-input { -webkit-appearance: none; -moz-appearance: none; appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; padding-right: 2.5rem; }
                input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
                input[type="color"]::-webkit-color-swatch { border: none; border-radius: 0.25rem; }
                input[type="color"]::-moz-color-swatch { border: none; border-radius: 0.25rem; }
            `}</style>
        </div>
    );
};

export default ControlsPanel;