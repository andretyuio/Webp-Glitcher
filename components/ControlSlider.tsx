import React from 'react';

interface ControlSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

const ControlSlider: React.FC<ControlSliderProps> = ({ label, value, onChange, min = 0, max = 100, step = 1 }) => {
  const precision = step && step < 1 ? (String(step).split('.')[1]?.length || 2) : 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <label className="text-sm font-medium text-gray-300">{label}</label>
        <span className="text-sm font-mono bg-gray-800 text-cyan-300 px-2 py-0.5 rounded">
          {value.toFixed(precision)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
      />
      <style>{`
        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          background: #22d3ee;
          cursor: pointer;
          border-radius: 50%;
          border: 2px solid #111827;
        }
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #22d3ee;
          cursor: pointer;
          border-radius: 50%;
           border: 2px solid #111827;
        }
      `}</style>
    </div>
  );
};

export default ControlSlider;
