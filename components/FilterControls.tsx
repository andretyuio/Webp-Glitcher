import React from 'react';
import type { FilterSettings, FilterKey, NoiseSettings, ChannelShiftSettings, SlitScanSettings, BlurSettings, SliceShiftSettings, PixelateSettings, ImageEffectsSettings, TransformSettings } from '../types';
import ControlSlider from './ControlSlider';

interface FilterControlsProps {
  settings: FilterSettings;
  onChange: React.Dispatch<React.SetStateAction<FilterSettings>>;
  transforms: TransformSettings;
  onTransformChange: React.Dispatch<React.SetStateAction<TransformSettings>>;
  preset: string;
  presetStrength: number;
  onPresetStrengthChange: (value: number) => void;
}

const ButtonGroup = ({ label, options, selected, onChange }: { label: string, options: string[], selected: string, onChange: (value: string) => void }) => (
  <div>
    <span className="text-sm font-medium text-gray-300">{label}</span>
    <div className="grid grid-cols-3 gap-2 mt-2">
      {options.map(opt => (
        <button key={opt} onClick={() => onChange(opt)} className={`px-2 py-1 text-sm rounded capitalize ${selected === opt ? 'bg-cyan-500 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}>
          {opt}
        </button>
      ))}
    </div>
  </div>
);

const FilterControls: React.FC<FilterControlsProps> = ({ settings, onChange, transforms, onTransformChange, preset, presetStrength, onPresetStrengthChange }) => {
  const handleToggle = (filter: FilterKey) => {
    onChange(prev => ({
      ...prev,
      [filter]: { ...prev[filter], active: !prev[filter].active },
    }));
  };
  
  const handleSubToggle = (filter: FilterKey, property: string) => {
     onChange(prev => ({
      ...prev,
      [filter]: { ...prev[filter], [property]: !prev[filter][property] },
    }));
  }

  const handleValueChange = (filter: FilterKey, property: string, value: number | string) => {
    onChange(prev => {
        const newSettings = { ...prev };
        (newSettings[filter] as any)[property] = value;
        
        // Handle blur lock
        if (filter === 'blur' && newSettings.blur.isLocked) {
            if (property === 'amountX') newSettings.blur.amountY = value as number;
            if (property === 'amountY') newSettings.blur.amountX = value as number;
        }

        return newSettings;
    });
  };

  const handleTransformToggle = (property: keyof TransformSettings) => {
    onTransformChange(prev => ({ ...prev, [property]: !prev[property] }));
  }

  return (
    <div className="space-y-6">
      {/* Preset Strength */}
      {preset !== 'none' && (
         <div className="p-4 bg-cyan-900/50 rounded-lg">
          <ControlSlider label="Preset Strength" value={presetStrength} onChange={onPresetStrengthChange} min={0} max={100} step={1} />
        </div>
      )}
      
      {/* Effect Strength */}
      {settings.imageEffects.type !== 'none' && (
         <div className="p-4 bg-cyan-900/50 rounded-lg">
          <ControlSlider label="Effect Strength" value={settings.imageEffects.strength} onChange={val => handleValueChange('imageEffects', 'strength', val)} min={0} max={100} step={1} />
        </div>
      )}

      {/* Transform */}
      <div className="p-4 bg-gray-700/50 rounded-lg">
        <span className="text-lg font-bold text-white">Transform</span>
        <div className="mt-4 space-y-3">
            <label className="flex items-center justify-between cursor-pointer text-sm font-medium text-gray-300">
                <span>Flip Horizontal</span>
                <input type="checkbox" checked={transforms.flipHorizontal} onChange={() => handleTransformToggle('flipHorizontal')} className="toggle-checkbox-sm" />
            </label>
             <label className="flex items-center justify-between cursor-pointer text-sm font-medium text-gray-300">
                <span>Flip Vertical</span>
                <input type="checkbox" checked={transforms.flipVertical} onChange={() => handleTransformToggle('flipVertical')} className="toggle-checkbox-sm" />
            </label>
             <label className="flex items-center justify-between cursor-pointer text-sm font-medium text-gray-300">
                <span>Reverse Animation</span>
                <input type="checkbox" checked={transforms.reverse} onChange={() => handleTransformToggle('reverse')} className="toggle-checkbox-sm" />
            </label>
             <p className="text-xs text-gray-400 italic text-center">Reverse only applies to downloaded video.</p>
        </div>
      </div>

      {/* Channel Shift */}
      <div className="p-4 bg-gray-700/50 rounded-lg">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-lg font-bold text-white">Channel Shift</span>
          <input type="checkbox" checked={settings.channelShift.active} onChange={() => handleToggle('channelShift')} className="toggle-checkbox" />
        </label>
        {settings.channelShift.active && (
          <div className="mt-4 space-y-4">
            {/* Red Channel */}
            <div className='border-l-2 border-red-500 pl-3 space-y-3'>
                <p className='font-bold text-red-400'>Red Channel</p>
                <ControlSlider label="Offset" value={settings.channelShift.rOffset} onChange={val => handleValueChange( 'channelShift', 'rOffset', val)} min={-50} max={50} step={1} />
                <ControlSlider label="Speed" value={settings.channelShift.rSpeed} onChange={val => handleValueChange( 'channelShift', 'rSpeed', val)} min={0.1} max={5} step={0.1} />
                <ButtonGroup label="Direction" options={['horizontal', 'vertical', 'both']} selected={settings.channelShift.rDirection} onChange={val => handleValueChange('channelShift', 'rDirection', val as ChannelShiftSettings['rDirection'])} />
            </div>
             {/* Green Channel */}
            <div className='border-l-2 border-green-500 pl-3 space-y-3'>
                <p className='font-bold text-green-400'>Green Channel</p>
                <ControlSlider label="Offset" value={settings.channelShift.gOffset} onChange={val => handleValueChange('channelShift', 'gOffset', val)} min={-50} max={50} step={1} />
                <ControlSlider label="Speed" value={settings.channelShift.gSpeed} onChange={val => handleValueChange( 'channelShift', 'gSpeed', val)} min={0.1} max={5} step={0.1} />
                <ButtonGroup label="Direction" options={['horizontal', 'vertical', 'both']} selected={settings.channelShift.gDirection} onChange={val => handleValueChange('channelShift', 'gDirection', val as ChannelShiftSettings['gDirection'])} />
            </div>
             {/* Blue Channel */}
            <div className='border-l-2 border-blue-500 pl-3 space-y-3'>
                <p className='font-bold text-blue-400'>Blue Channel</p>
                <ControlSlider label="Offset" value={settings.channelShift.bOffset} onChange={val => handleValueChange('channelShift', 'bOffset', val)} min={-50} max={50} step={1} />
                <ControlSlider label="Speed" value={settings.channelShift.bSpeed} onChange={val => handleValueChange( 'channelShift', 'bSpeed', val)} min={0.1} max={5} step={0.1} />
                <ButtonGroup label="Direction" options={['horizontal', 'vertical', 'both']} selected={settings.channelShift.bDirection} onChange={val => handleValueChange('channelShift', 'bDirection', val as ChannelShiftSettings['bDirection'])} />
            </div>
          </div>
        )}
      </div>

      {/* Noise */}
      <div className="p-4 bg-gray-700/50 rounded-lg">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-lg font-bold text-white">Noise</span>
          <input type="checkbox" checked={settings.noise.active} onChange={() => handleToggle('noise')} className="toggle-checkbox" />
        </label>
        {settings.noise.active && (
          <div className="mt-4 space-y-3">
            <ControlSlider label="Amount" value={settings.noise.amount} onChange={val => handleValueChange('noise', 'amount', val)} min={0.01} max={1} step={0.005} />
            <ControlSlider label="Opacity" value={settings.noise.opacity} onChange={val => handleValueChange('noise', 'opacity', val)} min={0} max={1} step={0.05} />
            <ControlSlider label="Octaves" value={settings.noise.octaves} onChange={val => handleValueChange('noise', 'octaves', val)} min={1} max={10} step={1} />
            <ButtonGroup label="Type" options={['fractalNoise', 'turbulence', 'grain']} selected={settings.noise.type} onChange={val => handleValueChange('noise', 'type', val as NoiseSettings['type'])} />
            <label className="flex items-center justify-between cursor-pointer text-sm font-medium text-gray-300">
                <span>Animate</span>
                <input type="checkbox" checked={settings.noise.animate} onChange={() => handleSubToggle('noise', 'animate')} className="toggle-checkbox-sm" />
            </label>
            {settings.noise.animate && (
              <ControlSlider label="Animation Speed" value={settings.noise.animationSpeed} onChange={val => handleValueChange('noise', 'animationSpeed', val)} min={0.1} max={5} step={0.1} />
            )}
          </div>
        )}
      </div>

      {/* Wavy Distortion (Slit Scan) */}
      <div className="p-4 bg-gray-700/50 rounded-lg">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-lg font-bold text-white">Wavy Distortion</span>
          <input type="checkbox" checked={settings.slitScan.active} onChange={() => handleToggle('slitScan')} className="toggle-checkbox" />
        </label>
        {settings.slitScan.active && (
          <div className="mt-4 space-y-3">
            <ControlSlider label="Amount" value={settings.slitScan.amount} onChange={val => handleValueChange('slitScan', 'amount', val)} min={0} max={100} step={1} />
            <ControlSlider label="Wave Density" value={settings.slitScan.density} onChange={val => handleValueChange('slitScan', 'density', val)} min={1} max={50} step={0.5} />
            <ButtonGroup label="Direction" options={['vertical', 'horizontal']} selected={settings.slitScan.direction} onChange={val => handleValueChange('slitScan', 'direction', val as SlitScanSettings['direction'])} />
             <label className="flex items-center justify-between cursor-pointer text-sm font-medium text-gray-300">
                <span>Animate</span>
                <input type="checkbox" checked={settings.slitScan.animate} onChange={() => handleSubToggle('slitScan', 'animate')} className="toggle-checkbox-sm" />
            </label>
            {settings.slitScan.animate && (
                <ControlSlider label="Animation Speed" value={settings.slitScan.animationSpeed} onChange={val => handleValueChange('slitScan', 'animationSpeed', val)} min={0.1} max={5} step={0.1} />
            )}
          </div>
        )}
      </div>

      {/* JPEG Glitch */}
      <div className="p-4 bg-gray-700/50 rounded-lg">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-lg font-bold text-white">JPEG Glitch</span>
          <input type="checkbox" checked={settings.jpegGlitch.active} onChange={() => handleToggle('jpegGlitch')} className="toggle-checkbox" />
        </label>
        {settings.jpegGlitch.active && (
          <div className="mt-4 space-y-3">
            <ControlSlider label="Block Size" value={settings.jpegGlitch.blockSize} onChange={val => handleValueChange('jpegGlitch', 'blockSize', val)} min={1} max={50} step={1} />
            <ControlSlider label="Amount" value={settings.jpegGlitch.amount} onChange={val => handleValueChange('jpegGlitch', 'amount', val)} min={0} max={100} step={1} />
            <ControlSlider label="Iterations" value={settings.jpegGlitch.iterations} onChange={val => handleValueChange('jpegGlitch', 'iterations', val)} min={1} max={3} step={1} />
          </div>
        )}
      </div>

      {/* Slice Shift */}
      <div className="p-4 bg-gray-700/50 rounded-lg">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-lg font-bold text-white">Slice Shift</span>
          <input type="checkbox" checked={settings.sliceShift.active} onChange={() => handleToggle('sliceShift')} className="toggle-checkbox" />
        </label>
        {settings.sliceShift.active && (
          <div className="mt-4 space-y-3">
             <ButtonGroup label="Direction" options={['horizontal', 'vertical']} selected={settings.sliceShift.direction} onChange={val => handleValueChange('sliceShift', 'direction', val as SliceShiftSettings['direction'])} />
            <ControlSlider label="Slice Height" value={settings.sliceShift.sliceHeight} onChange={val => handleValueChange('sliceShift', 'sliceHeight', val)} min={1} max={100} step={1} />
            <ControlSlider label="Offset Amount" value={settings.sliceShift.offsetAmount} onChange={val => handleValueChange('sliceShift', 'offsetAmount', val)} min={0} max={200} step={1} />
            <label className="flex items-center justify-between cursor-pointer text-sm font-medium text-gray-300">
                <span>Animate</span>
                <input type="checkbox" checked={settings.sliceShift.animate} onChange={() => handleSubToggle('sliceShift', 'animate')} className="toggle-checkbox-sm" />
            </label>
            {settings.sliceShift.animate && (
              <>
                <ButtonGroup label="Animation Type" options={['scroll', 'random', 'pulse']} selected={settings.sliceShift.animationType} onChange={val => handleValueChange('sliceShift', 'animationType', val as SliceShiftSettings['animationType'])} />
                <ControlSlider label="Animation Speed" value={settings.sliceShift.animationSpeed} onChange={val => handleValueChange('sliceShift', 'animationSpeed', val)} min={0.1} max={5} step={0.1} />
              </>
            )}
          </div>
        )}
      </div>
      
      {/* Hue Rotate */}
      <div className="p-4 bg-gray-700/50 rounded-lg">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-lg font-bold text-white">Hue Rotate</span>
          <input type="checkbox" checked={settings.hueRotate.active} onChange={() => handleToggle('hueRotate')} className="toggle-checkbox" />
        </label>
        {settings.hueRotate.active && (
            <div className="mt-4 space-y-3">
                <ControlSlider label="Angle" value={settings.hueRotate.angle} onChange={val => handleValueChange('hueRotate', 'angle', val)} min={0} max={360} step={1} />
                <label className="flex items-center justify-between cursor-pointer text-sm font-medium text-gray-300">
                    <span>Animate</span>
                    <input type="checkbox" checked={settings.hueRotate.animate} onChange={() => handleSubToggle('hueRotate', 'animate')} className="toggle-checkbox-sm" />
                </label>
                {settings.hueRotate.animate && (
                    <ControlSlider label="Speed" value={settings.hueRotate.speed} onChange={val => handleValueChange('hueRotate', 'speed', val)} min={1} max={20} step={0.5} />
                )}
            </div>
        )}
      </div>
      
      {/* Blur */}
       <div className="p-4 bg-gray-700/50 rounded-lg">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-lg font-bold text-white">Blur</span>
          <input type="checkbox" checked={settings.blur.active} onChange={() => handleToggle('blur')} className="toggle-checkbox" />
        </label>
        {settings.blur.active && (
          <div className="mt-4 space-y-3">
             <ButtonGroup label="Type" options={['gaussian', 'motion']} selected={settings.blur.type} onChange={val => handleValueChange('blur', 'type', val as BlurSettings['type'])} />
             {settings.blur.type === 'gaussian' ? (
              <>
                 <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
                    <span>Lock Axes</span>
                    <input type="checkbox" checked={settings.blur.isLocked} onChange={() => handleSubToggle('blur', 'isLocked')} className="toggle-checkbox-sm" />
                </div>
                <ControlSlider label="Horizontal" value={settings.blur.amountX} onChange={val => handleValueChange('blur', 'amountX', val)} min={0} max={50} step={0.5} />
                <ControlSlider label="Vertical" value={settings.blur.amountY} onChange={val => handleValueChange('blur', 'amountY', val)} min={0} max={50} step={0.5} />
              </>
             ) : (
              <>
                <ControlSlider label="Amount" value={settings.blur.amount} onChange={val => handleValueChange('blur', 'amount', val)} min={0} max={100} step={1} />
                <ControlSlider label="Angle" value={settings.blur.angle} onChange={val => handleValueChange('blur', 'angle', val)} min={0} max={360} step={1} />
              </>
             )}
             <label className="flex items-center justify-between cursor-pointer text-sm font-medium text-gray-300">
                <span>Animate</span>
                <input type="checkbox" checked={settings.blur.animate} onChange={() => handleSubToggle('blur', 'animate')} className="toggle-checkbox-sm" />
            </label>
            {settings.blur.animate && (
                <>
                    <ButtonGroup label="Animation Type" options={['pulse', 'flicker', 'sweep']} selected={settings.blur.animationType} onChange={val => handleValueChange('blur', 'animationType', val as BlurSettings['animationType'])} />
                    <ControlSlider label="Animation Speed" value={settings.blur.animationSpeed} onChange={val => handleValueChange('blur', 'animationSpeed', val)} min={0.1} max={5} step={0.1} />
                    <ControlSlider label="Anim Min Amount (%)" value={settings.blur.animationMinAmount} onChange={val => handleValueChange('blur', 'animationMinAmount', val)} min={0} max={100} step={5} />
                    <ControlSlider label="Anim Max Amount (%)" value={settings.blur.animationMaxAmount} onChange={val => handleValueChange('blur', 'animationMaxAmount', val)} min={100} max={150} step={5} />
                </>
            )}
          </div>
        )}
      </div>
      
      {/* Color Controls */}
       <div className="p-4 bg-gray-700/50 rounded-lg">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-lg font-bold text-white">Color Controls</span>
          <input type="checkbox" checked={settings.colorControls.active} onChange={() => handleToggle('colorControls')} className="toggle-checkbox" />
        </label>
        {settings.colorControls.active && (
          <div className="mt-4 space-y-3">
            <ControlSlider label="Brightness" value={settings.colorControls.brightness} onChange={val => handleValueChange('colorControls', 'brightness', val)} min={0.1} max={2} step={0.05} />
            <ControlSlider label="Contrast" value={settings.colorControls.contrast} onChange={val => handleValueChange('colorControls', 'contrast', val)} min={0} max={2} step={0.05} />
            <ControlSlider label="Saturation" value={settings.colorControls.saturation} onChange={val => handleValueChange('colorControls', 'saturation', val)} min={0} max={2} step={0.05} />
          </div>
        )}
      </div>

      {/* CRT Effect */}
      <div className="p-4 bg-gray-700/50 rounded-lg">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-lg font-bold text-white">CRT Effect</span>
          <input type="checkbox" checked={settings.crt.active} onChange={() => handleToggle('crt')} className="toggle-checkbox" />
        </label>
        {settings.crt.active && (
          <div className="mt-4 space-y-3">
            <ControlSlider label="Curvature" value={settings.crt.curvature} onChange={val => handleValueChange('crt', 'curvature', val)} min={0} max={1} step={0.05} />
            <ControlSlider label="Glow" value={settings.crt.glowAmount} onChange={val => handleValueChange('crt', 'glowAmount', val)} min={0} max={5} step={0.1} />
            <ControlSlider label="Line Thickness" value={settings.crt.lineThickness} onChange={val => handleValueChange('crt', 'lineThickness', val)} min={0.1} max={5} step={0.1} />
            <ControlSlider label="Scanline Opacity" value={settings.crt.scanlineOpacity} onChange={val => handleValueChange('crt', 'scanlineOpacity', val)} min={0} max={0.5} step={0.01} />
            <ControlSlider label="Vignette" value={settings.crt.vignette} onChange={val => handleValueChange('crt', 'vignette', val)} min={0} max={1} step={0.05} />
             <label className="flex items-center justify-between cursor-pointer text-sm font-medium text-gray-300">
                <span>Animate Scanlines</span>
                <input type="checkbox" checked={settings.crt.animateScanlines} onChange={() => handleSubToggle('crt', 'animateScanlines')} className="toggle-checkbox-sm" />
            </label>
            {settings.crt.animateScanlines && (
              <ControlSlider label="Scanline Speed" value={settings.crt.scanlineSpeed} onChange={val => handleValueChange('crt', 'scanlineSpeed', val)} min={0.1} max={10} step={0.1} />
            )}
          </div>
        )}
      </div>

      {/* Pixelate */}
      <div className="p-4 bg-gray-700/50 rounded-lg">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-lg font-bold text-white">Pixelate</span>
          <input type="checkbox" checked={settings.pixelate.active} onChange={() => handleToggle('pixelate')} className="toggle-checkbox" />
        </label>
        {settings.pixelate.active && (
          <div className="mt-4 space-y-3">
            <ButtonGroup label="Type" options={['blocky', 'smooth', 'crystal']} selected={settings.pixelate.type} onChange={val => handleValueChange('pixelate', 'type', val as PixelateSettings['type'])} />
            <ControlSlider label="Size" value={settings.pixelate.size} onChange={val => handleValueChange('pixelate', 'size', val)} min={1} max={50} step={1} />
            {settings.pixelate.type !== 'crystal' && (
              <>
              <label className="flex items-center justify-between cursor-pointer text-sm font-medium text-gray-300">
                  <span>Animate</span>
                  <input type="checkbox" checked={settings.pixelate.animate} onChange={() => handleSubToggle('pixelate', 'animate')} className="toggle-checkbox-sm" />
              </label>
              {settings.pixelate.animate && (
                <>
                  <ControlSlider label="Animation Speed" value={settings.pixelate.animationSpeed} onChange={val => handleValueChange('pixelate', 'animationSpeed', val)} min={0.1} max={5} step={0.1} />
                  <ControlSlider label="Anim Min Size (%)" value={settings.pixelate.animationMinSize} onChange={val => handleValueChange('pixelate', 'animationMinSize', val)} min={0} max={100} step={5} />
                  <ControlSlider label="Anim Max Size (%)" value={settings.pixelate.animationMaxSize} onChange={val => handleValueChange('pixelate', 'animationMaxSize', val)} min={100} max={300} step={5} />
                </>
              )}
              </>
            )}
          </div>
        )}
      </div>
      <style>{`
        .toggle-checkbox { appearance: none; width: 3rem; height: 1.5rem; background-color: #4b5563; border-radius: 9999px; position: relative; cursor: pointer; transition: background-color 0.2s ease-in-out; }
        .toggle-checkbox:checked { background-color: #22d3ee; }
        .toggle-checkbox::before { content: ''; position: absolute; width: 1.25rem; height: 1.25rem; background-color: white; border-radius: 9999px; top: 0.125rem; left: 0.125rem; transition: transform 0.2s ease-in-out; }
        .toggle-checkbox:checked::before { transform: translateX(1.5rem); }
        .toggle-checkbox-sm { appearance: none; width: 2.25rem; height: 1.125rem; background-color: #4b5563; border-radius: 9999px; position: relative; cursor: pointer; transition: background-color 0.2s ease-in-out; }
        .toggle-checkbox-sm:checked { background-color: #22d3ee; }
        .toggle-checkbox-sm::before { content: ''; position: absolute; width: 0.875rem; height: 0.875rem; background-color: white; border-radius: 9999px; top: 0.125rem; left: 0.125rem; transition: transform 0.2s ease-in-out; }
        .toggle-checkbox-sm:checked::before { transform: translateX(1.125rem); }
      `}</style>
    </div>
  );
};

export default FilterControls;
