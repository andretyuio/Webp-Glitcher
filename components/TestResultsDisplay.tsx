import React from 'react';
import { TestResults, FilterKey } from '../types';

interface TestResultsDisplayProps {
  results: TestResults;
}

const nameMappings: Record<FilterKey, string> = {
    channelShift: 'Channel Shift',
    noise: 'Noise',
    slitScan: 'Wavy Distortion',
    crt: 'CRT Effect',
    pixelate: 'Pixelate',
    hueRotate: 'Hue Rotate',
    blur: 'Blur',
    colorControls: 'Color Controls',
    jpegGlitch: 'JPEG Glitch',
    sliceShift: 'Slice Shift',
    imageEffects: 'Image Effects',
};

const StatusIcon = ({ status, reason }: { status: 'passing' | 'failing' | 'untested', reason?: string }) => {
  switch (status) {
    case 'passing':
      return <span title="Passing" className="text-green-400">✓</span>;
    case 'failing':
      return <span title={reason || 'Failing'} className="text-red-400 font-bold cursor-help">!</span>;
    case 'untested':
    default:
      return <span title="Testing..." className="text-yellow-400">…</span>;
  }
};

const TestResultsDisplay: React.FC<TestResultsDisplayProps> = ({ results }) => {
  const allUntested = Object.values(results).every(r => r.status === 'untested');
  if (allUntested) return null;

  return (
    <div className="mb-6 p-4 bg-gray-700/50 rounded-lg">
      <h3 className="text-lg font-bold text-white mb-3">Filter Status</h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {Object.entries(results).map(([key, result]) => (
          <div key={key} className="flex items-center justify-between bg-gray-800/50 px-2 py-1 rounded">
            <span className="text-gray-300">{nameMappings[key as FilterKey]}</span>
            <StatusIcon status={result.status} reason={result.reason} />
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-3 text-center italic">
        This is an automatic check to ensure filters are working in your browser.
      </p>
    </div>
  );
};

export default TestResultsDisplay;