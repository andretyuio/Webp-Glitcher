
export interface FilterSetting {
  active: boolean;
  [key: string]: any;
}

export interface ChannelShiftSettings extends FilterSetting {
  rOffset: number;
  gOffset: number;
  bOffset: number;
  rAngle: number;
  gAngle: number;
  bAngle: number;
  animate: boolean;
  animationSpeed: number;
  animationType: 'pulse' | 'flicker' | 'sweep' | 'wave';
  animationMinAmount: number;
  animationMaxAmount: number;
}

export interface NoiseSettings extends FilterSetting {
  amount: number;
  type: 'fractalNoise' | 'turbulence' | 'grain';
  animate: boolean;
  animationSpeed: number;
  octaves: number;
  opacity: number;
  blendMode: 'overlay' | 'screen' | 'difference';
}

export interface SlitScanSettings extends FilterSetting {
  amount: number;
  direction: 'horizontal' | 'vertical';
  animationSpeed: number;
  density: number;
  animate: boolean;
  animationType: 'pulse' | 'flicker' | 'sweep';
  animationMinAmount: number;
  animationMaxAmount: number;
}

export interface CrtSettings extends FilterSetting {
    lineThickness: number;
    scanlineOpacity: number;
    vignette: number;
    animateScanlines: boolean;
    scanlineSpeed: number;
    curvature: number;
    glowAmount: number;
}

export interface PixelateSettings extends FilterSetting {
    size: number;
    animate: boolean;
    animationSpeed: number;
    type: 'blocky' | 'crystal';
    animationMinAmount: number;
    animationMaxAmount: number;
    animationType: 'pulse' | 'flicker' | 'sweep';
}

export interface HueRotateSettings extends FilterSetting {
    angle: number;
}

export interface BlurSettings extends FilterSetting {
    type: 'gaussian' | 'motion';
    amountX: number; // for gaussian
    amountY: number; // for gaussian
    isLocked: boolean; // for gaussian
    amount: number;  // for motion
    angle: number;   // for motion
    animate: boolean;
    animationSpeed: number;
    animationMinAmount: number;
    animationMaxAmount: number;
    animationType: 'pulse' | 'flicker' | 'sweep';
}

export interface ColorControlsSettings extends FilterSetting {
    brightness: number;
    contrast: number;
    saturation: number;
}

export interface JpegGlitchSettings extends FilterSetting {
  blockSize: number;
  amount: number;
  iterations: number;
}

export interface SliceShiftSettings extends FilterSetting {
  sliceHeight: number;
  offsetAmount: number;
  direction: 'horizontal' | 'vertical';
  animate: boolean;
  animationSpeed: number;
  animationType: 'pulse' | 'flicker' | 'sweep';
  animationMinAmount: number;
  animationMaxAmount: number;
}

export interface ImageEffectsSettings extends FilterSetting {
  type: 'none' | 'sepia' | 'grayscale' | 'invert';
  strength: number;
}

export interface FilterSettings {
  channelShift: ChannelShiftSettings;
  noise: NoiseSettings;
  slitScan: SlitScanSettings;
  crt: CrtSettings;
  pixelate: PixelateSettings;
  hueRotate: HueRotateSettings;
  blur: BlurSettings;
  colorControls: ColorControlsSettings;
  jpegGlitch: JpegGlitchSettings;
  sliceShift: SliceShiftSettings;
  imageEffects: ImageEffectsSettings;
}

export type FilterKey = keyof FilterSettings;

export type OverlayType = 'none' | 'hud' | 'cam' | 'vcr' | 'scope' | 'terminal';

export interface TransformSettings {
  flipHorizontal: boolean;
  flipVertical: boolean;
}
