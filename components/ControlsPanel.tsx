import React from 'react';
import FileUpload from './FileUpload';
import FilterControls from './FilterControls';
import { OverlayType, FilterSettings, TransformSettings, ImageEffectsSettings } from '../types';

type LoadingStatus = 'idle' | 'loading' | 'ready' | 'error';

interface ControlsPanelProps {
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  imageUrl: string | null;
  isRecording: boolean;
  loadingStatus: LoadingStatus;
  analysisError: string | null;
  recordingError: string | null;
  handleRetry: () => void;
  overlay: OverlayType;
  setOverlay: React.Dispatch<React.SetStateAction<OverlayType>>;
  filters: FilterSettings;
  setFilters: React.Dispatch<React.SetStateAction<FilterSettings>>;
  transforms: TransformSettings;
  setTransforms: React.Dispatch<React.SetStateAction<TransformSettings>>;
  startRecording: () => void;
  stopRecording: () => void;
  resetAll: () => void;
}

const ControlsPanel: React.FC<ControlsPanelProps> = (props) => {
    const { 
        onFileChange, imageUrl, isRecording, loadingStatus, analysisError,
        recordingError, handleRetry, overlay, setOverlay, filters, setFilters, transforms,
        setTransforms, startRecording, stopRecording, resetAll
    } = props;
    
    const showAnalysisError = loadingStatus === 'error' && analysisError;
    const showLoadingMessage = loadingStatus === 'loading';
    const disableRecording = loadingStatus !== 'ready' || !!recordingError;

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
                  
                  <FilterControls 
                    settings={filters} 
                    onChange={setFilters} 
                    transforms={transforms}
                    onTransformChange={setTransforms}
                  />
                </fieldset>

                <div className="mt-6 space-y-4">
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
                    >
                      Record & Download Video (.webm)
                    </button>
                  )}
                  <p className="text-xs text-gray-500 text-center">
                    The video will be recorded for one full loop and then download automatically.
                  </p>
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
                    {showLoadingMessage && !isRecording && (
                        <div className="mt-4 p-3 rounded-lg bg-yellow-900/50 border border-yellow-700 text-yellow-300 text-center">
                            <p className="font-bold text-sm">Analyzing File...</p>
                            <p className="text-xs mt-1">Download will be enabled once analysis is complete.</p>
                        </div>
                    )}
                </div>
              </>
            )}
        </div>
    );
};

export default ControlsPanel;