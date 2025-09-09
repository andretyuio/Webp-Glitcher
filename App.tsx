
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { FilterSettings, FilterKey, OverlayType, TransformSettings, ImageEffectsSettings, TestResults, FilterSetting } from './types';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import FilterControls from './components/FilterControls';
import ImagePreview from './components/ImagePreview';
import TestResultsDisplay from './components/TestResultsDisplay';

// A valid, 2x2 colored PNG for robust filter testing.
// The previous 1x1 transparent GIF was too simple and caused all tests to incorrectly fail.
const TEST_IMAGE_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mP8z8AARNjG//+HGAEAfg4ClmoOM0EAAAAASUVORK5CYII=";

const initialFilterSettings: FilterSettings = {
  channelShift: { active: false, rOffset: 2, gOffset: 0, bOffset: -2, rDirection: 'horizontal', gDirection: 'horizontal', bDirection: 'horizontal', rSpeed: 1, gSpeed: 1, bSpeed: 1 },
  noise: { active: false, amount: 0.2, type: 'fractalNoise', animate: true, animationSpeed: 1, octaves: 3, opacity: 0.5 },
  slitScan: { active: false, amount: 15, direction: 'vertical', animationSpeed: 1, density: 10, animate: true },
  crt: { active: false, lineThickness: 1.5, scanlineOpacity: 0.1, vignette: 0.4, animateScanlines: false, scanlineSpeed: 2, curvature: 0.1, glowAmount: 0.5 },
  pixelate: { active: false, size: 4, animate: false, animationSpeed: 1, type: 'blocky', animationMinSize: 50, animationMaxSize: 100 },
  hueRotate: { active: false, angle: 15, animate: true, speed: 5 },
  blur: { active: false, type: 'gaussian', amountX: 2, amountY: 2, isLocked: true, amount: 5, angle: 45, animate: false, animationSpeed: 1, animationMinAmount: 0, animationMaxAmount: 10, animationType: 'pulse' },
  colorControls: { active: false, brightness: 1, contrast: 1, saturation: 1.1 },
  jpegGlitch: { active: false, blockSize: 8, amount: 20, iterations: 1 },
  sliceShift: { active: false, sliceHeight: 10, offsetAmount: 25, direction: 'horizontal', animate: false, animationSpeed: 1, animationType: 'scroll' },
  imageEffects: { active: false, type: 'none', strength: 100 }
};

const initialTransformSettings: TransformSettings = {
  flipHorizontal: false,
  flipVertical: false,
  reverse: false,
};

const initialTestResults: TestResults = Object.keys(initialFilterSettings).reduce((acc, key) => {
    acc[key as FilterKey] = { status: 'untested' };
    return acc;
}, {} as TestResults);


const presets: Record<string, Partial<FilterSettings>> = {
  'none': initialFilterSettings,
  'broken-vhs': {
    channelShift: { active: true, rOffset: 4, gOffset: 0, bOffset: -3, rDirection: 'horizontal', gDirection: 'horizontal', bDirection: 'horizontal', rSpeed: 2, gSpeed: 1.8, bSpeed: 2.2 },
    noise: { active: true, amount: 0.1, type: 'grain', animate: true, animationSpeed: 2, octaves: 2, opacity: 0.4 },
    sliceShift: { active: true, sliceHeight: 4, offsetAmount: 15, direction: 'horizontal', animate: true, animationSpeed: 0.5, animationType: 'scroll' },
    crt: { active: true, lineThickness: 2, scanlineOpacity: 0.15, vignette: 0.5, animateScanlines: true, scanlineSpeed: 3, curvature: 0.1, glowAmount: 0.3 },
    colorControls: { active: true, brightness: 1, contrast: 1.1, saturation: 0.8 },
  },
  'cyberpunk': {
    channelShift: { active: true, rOffset: 8, gOffset: 2, bOffset: -10, rDirection: 'horizontal', gDirection: 'vertical', bDirection: 'horizontal', rSpeed: 0.5, gSpeed: 0.8, bSpeed: 0.6 },
    hueRotate: { active: true, angle: 280, animate: true, speed: 20 },
    crt: { active: true, lineThickness: 1, scanlineOpacity: 0.1, vignette: 0.3, animateScanlines: false, scanlineSpeed: 2, curvature: 0, glowAmount: 0.8 },
    colorControls: { active: true, brightness: 1.1, contrast: 1.4, saturation: 1.5 },
  },
  'ghosting': {
    blur: { active: true, type: 'motion', amount: 15, angle: 0, animate: true, animationSpeed: 0.5, amountX: 0, amountY: 0, isLocked: true, animationMinAmount: 5, animationMaxAmount: 20, animationType: 'pulse' },
    channelShift: { active: true, rOffset: 10, gOffset: -10, bOffset: 10, rDirection: 'both', gDirection: 'both', bDirection: 'both', rSpeed: 3, gSpeed: 3, bSpeed: 3 },
    colorControls: { active: true, brightness: 1, contrast: 1, saturation: 0.2 },
    noise: { active: true, amount: 0.05, type: 'turbulence', animate: true, animationSpeed: 0.5, octaves: 1, opacity: 0.3 },
  },
  'meltdown': {
    jpegGlitch: { active: true, blockSize: 5, amount: 80, iterations: 3 },
    sliceShift: { active: true, sliceHeight: 5, offsetAmount: 100, direction: 'horizontal', animate: false, animationSpeed: 1, animationType: 'scroll' },
    pixelate: { active: true, size: 8, animate: true, animationSpeed: 2, type: 'blocky', animationMinSize: 10, animationMaxSize: 100 },
    colorControls: { active: true, brightness: 1, contrast: 1.5, saturation: 2 },
  }
};

const overlays: Record<OverlayType, string> = {
    none: '',
    hud: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400' fill='none' stroke='rgba(0,255,255,0.7)' stroke-width='1.5'><path d='M50 20 L20 20 L20 50 M350 20 L380 20 L380 50 M50 380 L20 380 L20 350 M350 380 L380 380 L380 350' /><circle cx='200' cy='200' r='180' stroke-dasharray='4 8' /><circle cx='200' cy='200' r='100' /><path d='M200 100 L200 80 M200 300 L200 320 M100 200 L80 200 M300 200 L320 200' /><text x='20' y='390' font-family='monospace' font-size='10' fill='rgba(0,255,255,0.7)'>REC ● 21:42:07</text><text x='340' y='390' font-family='monospace' font-size='10' fill='rgba(0,255,255,0.7)'>TRGT_LOCK</text></svg>`)}`,
    cam: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'><text x='10' y='25' font-family='monospace' font-size='16' fill='rgba(255,255,100,0.8)'>CAM_01</text><text x='300' y='25' font-family='monospace' font-size='16' fill='rgba(255,255,100,0.8)'>PLAY</text><text x='10' y='390' font-family='monospace' font-size='12' fill='rgba(255,255,100,0.8)'>10:31:55 AM</text><text x='320' y='390' font-family='monospace' font-size='12' fill='rgba(255,255,100,0.8)'>12/08/1998</text></svg>`)}`,
    vintage: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'><defs><radialGradient id='vignette' cx='50%' cy='50%' r='50%'><stop offset='20%' stop-color='rgba(0,0,0,0)'/><stop offset='100%' stop-color='rgba(0,0,0,0.9)'/></radialGradient></defs><rect width='100%' height='100%' fill='url(%23vignette)' /></svg>`)}`,
};


function App() {
  const [imageUrl, setImageUrl] = useState<string | null>(TEST_IMAGE_BASE64);
  const [filters, setFilters] = useState<FilterSettings>(initialFilterSettings);
  const [transforms, setTransforms] = useState<TransformSettings>(initialTransformSettings);
  const [overlay, setOverlay] = useState<OverlayType>('none');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [noiseSeed, setNoiseSeed] = useState(0);
  const [sliceShiftSeed, setSliceShiftSeed] = useState(0);
  const [sliceShiftAnimatedScale, setSliceShiftAnimatedScale] = useState(0);
  const [scanlineOffset, setScanlineOffset] = useState(0);
  const [selectedPreset, setSelectedPreset] = useState('none');
  const [presetStrength, setPresetStrength] = useState(100);
  const [testResults, setTestResults] = useState<TestResults>(initialTestResults);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Effect for self-testing filters on mount
  useEffect(() => {
    const runTests = async () => {
      const testImage = new Image();
      testImage.src = TEST_IMAGE_BASE64;
      try {
        await testImage.decode();
      } catch (e) {
        console.error("Failed to load test image for diagnostics.", e);
        const reason = e instanceof Error ? e.message : String(e);
        const failedResult = { status: 'failing' as const, reason: `Test image error: The source image cannot be decoded. (${reason})` };
        const results = (Object.keys(initialFilterSettings) as FilterKey[]).reduce((acc, key) => {
            acc[key] = failedResult;
            return acc;
        }, {} as TestResults);
        setTestResults(results);
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = testImage.width;
      canvas.height = testImage.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      // Draw original image and get its data
      ctx.filter = 'none';
      ctx.drawImage(testImage, 0, 0);
      const originalData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

      // FIX: Use a type assertion because the 'results' object is built dynamically.
      const results = {} as TestResults;
      const filterKeys = Object.keys(initialFilterSettings) as FilterKey[];
      
      const arraysAreEqual = (a: Uint8ClampedArray, b: Uint8ClampedArray) => {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
          if (a[i] !== b[i]) return false;
        }
        return true;
      };

      for (const key of filterKeys) {
        // Special case: 'imageEffects' is not a failure if type is 'none'.
        if (key === 'imageEffects' && filters.imageEffects.type === 'none') {
            results[key] = { status: 'passing' };
            continue;
        }
        
        // Explicitly clear the canvas before each test to ensure no data from previous tests contaminates the result.
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const activeFilterUrls = `url(#${key})`;
        ctx.filter = activeFilterUrls;
        ctx.drawImage(testImage, 0, 0);
        const newData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

        if (arraysAreEqual(originalData, newData)) {
          results[key] = { status: 'failing', reason: 'Filter produced no change.' };
        } else {
          results[key] = { status: 'passing' };
        }
      }
      setTestResults(results);
    };

    // Ensure defs are in the DOM before running test
    setTimeout(runTests, 100);
  }, []); // Run only once on mount

  useEffect(() => {
    const needsAnimation = filters.noise.animate || filters.crt.animateScanlines || filters.sliceShift.animate;
    
    if (!needsAnimation) {
      return;
    }

    let animationFrameId: number;
    const animateFilters = (time: number) => {
      const timeInSeconds = time / 1000;
      
      if (filters.noise.animate) {
        setNoiseSeed(timeInSeconds * filters.noise.animationSpeed);
      }
      if (filters.crt.animateScanlines) {
        setScanlineOffset(timeInSeconds * filters.crt.scanlineSpeed * 5);
      }
      if (filters.sliceShift.animate) {
        switch(filters.sliceShift.animationType) {
            case 'random':
                setSliceShiftSeed(Math.random() * 1000);
                break;
            case 'pulse':
                const pulse = (Math.sin(timeInSeconds * filters.sliceShift.animationSpeed * 2) + 1) / 2; // Varies between 0 and 1
                setSliceShiftAnimatedScale(pulse * filters.sliceShift.offsetAmount);
                break;
            case 'scroll':
            default:
                 setSliceShiftSeed(timeInSeconds * filters.sliceShift.animationSpeed);
                 break;
        }
      }
      animationFrameId = requestAnimationFrame(animateFilters);
    };

    animationFrameId = requestAnimationFrame(animateFilters);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [filters.noise, filters.crt, filters.sliceShift]);


  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'image/webp') {
      const objectUrl = URL.createObjectURL(file);
      if (imageUrl && imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
      }
      setImageUrl(objectUrl);
      if (videoRef.current) {
        videoRef.current.src = objectUrl;
        videoRef.current.load();
      }
    } else {
      alert('Please upload a valid .webp file.');
    }
  }, [imageUrl]);

  const resetAll = useCallback(() => {
    setFilters(initialFilterSettings);
    setTransforms(initialTransformSettings);
    setOverlay('none');
    setSelectedPreset('none');
    setPresetStrength(100);
  }, []);
  
  const handlePresetChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const presetName = event.target.value;
    setSelectedPreset(presetName);
    setPresetStrength(100); // Reset strength on new preset selection
    setTransforms(initialTransformSettings); // Reset transforms
  }, []);

  useEffect(() => {
    const lerp = (start: number, end: number, amt: number) => start + (end - start) * amt;
    const strength = presetStrength / 100;
    
    if (selectedPreset === 'none') {
        setFilters(prev => ({ ...initialFilterSettings, imageEffects: prev.imageEffects }));
        return;
    }

    const presetSettings = presets[selectedPreset];
    if (!presetSettings) return;

    const newState = JSON.parse(JSON.stringify(initialFilterSettings));

    for (const key in presetSettings) {
        const k = key as FilterKey;
        const presetValue = presetSettings[k] as FilterSetting | undefined;
        if (!presetValue) continue;

        newState[k].active = strength > 0;

        for (const prop in presetValue) {
            if(prop === 'active') continue;
            const initialValue = (initialFilterSettings as any)[k][prop];
            if (typeof presetValue[prop] === 'number' && typeof initialValue === 'number') {
                newState[k][prop] = lerp(initialValue, presetValue[prop], strength);
            } else {
                 newState[k][prop] = strength > 0.5 ? presetValue[prop] : initialValue;
            }
        }
    }
    setFilters(prev => ({ ...newState, imageEffects: prev.imageEffects }));

  }, [selectedPreset, presetStrength]);


  const handleDownload = useCallback(async () => {
    if (!imageUrl || !videoRef.current || videoDuration === 0) {
        alert('Please upload an image and wait for it to load.');
        return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);

    const canvas = document.createElement('canvas');
    const videoElement = videoRef.current;
    const { videoWidth, videoHeight } = videoElement;
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    const ctx = canvas.getContext('2d', { alpha: false });

    if (!ctx) {
        alert('Failed to get canvas context.');
        setIsDownloading(false);
        return;
    }
    
    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'glitched-animation.webm';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsDownloading(false);
        setDownloadProgress(0);
    };

    const tempSvgContainer = document.createElement('div');
    tempSvgContainer.setAttribute('style', 'position:absolute; top: -9999px; left: -9999px; width:0; height:0; overflow:hidden;');
    const defsNode = document.getElementById('svg-filter-defs');
    if (!defsNode) {
      alert("Filter definitions not found!");
      setIsDownloading(false);
      return;
    }
    tempSvgContainer.innerHTML = `<svg>${defsNode.outerHTML}</svg>`;
    document.body.appendChild(tempSvgContainer);
    
    const overlayImage = new Image();
    let overlayLoaded = false;
    if (overlay !== 'none') {
      overlayImage.src = overlays[overlay];
      try {
        await overlayImage.decode();
        overlayLoaded = true;
      } catch (e) {
        console.error("Overlay image failed to load", e);
      }
    }

    let frameId: number;
    let startTime: number | null = null;
    videoElement.currentTime = 0;
    
    recorder.start();
    videoElement.play();

    const renderFrame = (timestamp: number) => {
        if(startTime === null) startTime = timestamp;
        const elapsedTime = (timestamp - startTime) / 1000;
        
        if (elapsedTime >= videoDuration) {
            if(recorder?.state === 'recording') recorder.stop();
            cancelAnimationFrame(frameId);
            document.body.removeChild(tempSvgContainer);
            videoElement.pause();
            videoElement.currentTime = 0;
            return;
        }

        const activeFilterUrls = Object.entries(filters)
            .filter(([, settings]) => settings.active && !(settings.type === 'none'))
            .map(([key]) => `url(#${key})`)
            .join(' ');

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        
        const scaleX = transforms.flipHorizontal ? -1 : 1;
        const scaleY = transforms.flipVertical ? -1 : 1;
        const transX = transforms.flipHorizontal ? canvas.width : 0;
        const transY = transforms.flipVertical ? canvas.height : 0;
        
        ctx.translate(transX, transY);
        ctx.scale(scaleX, scaleY);
        
        ctx.filter = activeFilterUrls;
        ctx.drawImage(videoElement, 0, 0, videoWidth, videoHeight);
        
        ctx.restore();
        
        if (overlay !== 'none' && overlayLoaded) {
            ctx.filter = 'none';
            ctx.drawImage(overlayImage, 0, 0, canvas.width, canvas.height);
        }
        
        setDownloadProgress((elapsedTime / videoDuration) * 100);
        frameId = requestAnimationFrame(renderFrame);
    };

    frameId = requestAnimationFrame(renderFrame);

  }, [imageUrl, filters, videoDuration, overlay, transforms]);


  const filterUrls = Object.entries(filters)
    .filter(([, settings]) => settings.active && !(settings.type === 'none'))
    .map(([key]) => `url(#${key})`)
    .join(' ');
    
  const getMotionBlurStdDeviation = () => {
      const angleRad = (filters.blur.angle * Math.PI) / 180;
      const x = Math.abs(filters.blur.amount * Math.cos(angleRad));
      const y = Math.abs(filters.blur.amount * Math.sin(angleRad));
      return `${x} ${y}`;
  }

  const getChannelShiftAnimateProps = (direction: string, offset: number, speed: number) => {
    if (speed <= 0) speed = 1;
    const attributeName = direction !== 'vertical' ? 'dx' : 'dy';
    const values = `${offset};-${offset};${offset}`;
    const dur = `${2 / speed}s`;
    return { attributeName, values, dur };
  };
  
  const getSlitScanAnimateProps = () => {
    const { direction, animationSpeed } = filters.slitScan;
    if (animationSpeed <= 0) return {};
    const attributeName = direction === 'vertical' ? 'dy' : 'dx';
    const values = `0;100;0`;
    const dur = `${5 / animationSpeed}s`;
    return { attributeName, values, dur, repeatCount: "indefinite" };
  };

  const getImageEffectsMatrix = () => {
    switch(filters.imageEffects.type) {
      case 'sepia': return "0.393 0.769 0.189 0 0 0.349 0.686 0.168 0 0 0.272 0.534 0.131 0 0 0 0 0 1 0";
      case 'invert': return "-1 0 0 0 1 0 -1 0 0 1 0 0 -1 0 1 0 0 0 1 0";
      default: return "1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0";
    }
  }
  
  const getPixelateAnimationValues = (attr: 'width' | 'height' | 'radius') => {
      if (filters.pixelate.animationSpeed <= 0) return '';
      const baseVal = attr === 'radius' ? filters.pixelate.size / 2 : filters.pixelate.size;
      const minVal = baseVal * (filters.pixelate.animationMinSize / 100);
      const maxVal = baseVal * (filters.pixelate.animationMaxSize / 100);
      return `${baseVal};${minVal};${maxVal};${baseVal}`;
  }
  
  const getBlurAnimationValues = () => {
    const { type, amountX, amountY, animationMinAmount, animationMaxAmount, animationType, amount, angle } = filters.blur;
    
    const getStdDev = (amtX: number, amtY: number) => `${amtX.toFixed(2)} ${amtY.toFixed(2)}`;
    
    const getMotionStdDev = (motionAmount: number) => {
        const angleRad = (angle * Math.PI) / 180;
        const x = Math.abs(motionAmount * Math.cos(angleRad));
        const y = Math.abs(motionAmount * Math.sin(angleRad));
        return getStdDev(x, y);
    };

    let baseVal: string, minVal: string, maxVal: string;

    if (type === 'gaussian') {
        baseVal = getStdDev(amountX, amountY);
        minVal = getStdDev(amountX * (animationMinAmount / 100), amountY * (animationMinAmount / 100));
        maxVal = getStdDev(amountX * (animationMaxAmount / 100), amountY * (animationMaxAmount / 100));
    } else { // motion
        baseVal = getMotionStdDev(amount);
        minVal = getMotionStdDev(amount * (animationMinAmount / 100));
        maxVal = getMotionStdDev(amount * (animationMaxAmount / 100));
    }

    switch (animationType) {
        case 'sweep':
            return `${minVal};${maxVal};${minVal}`;
        case 'flicker':
            const randomBetween = (minStr: string, maxStr: string) => {
                const [minX, minY] = minStr.split(' ').map(parseFloat);
                const [maxX, maxY] = maxStr.split(' ').map(parseFloat);
                const randX = Math.random() * (maxX - minX) + minX;
                const randY = Math.random() * (maxY - minY) + minY;
                return getStdDev(randX, randY);
            };
            const flickerValues = Array.from({ length: 5 }, () => randomBetween(minVal, maxVal));
            return [baseVal, ...flickerValues, baseVal].join(';');
        case 'pulse':
        default:
            return `${baseVal};${minVal};${maxVal};${baseVal}`;
    }
  }


  const getSliceShiftDispMapMatrix = () => {
    if (filters.sliceShift.direction === 'horizontal') {
      return "1 0 0 0 0  0 0 0 0 0.5  0 0 0 0 0  0 0 0 1 0";
    }
    // vertical
    return "0 0 0 0 0.5  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0";
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
      <Header />
      
      <video ref={videoRef} onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration)} className="hidden" playsInline muted loop crossOrigin="anonymous" src={imageUrl || undefined}/>

      <svg className="absolute w-0 h-0">
        <defs id="svg-filter-defs">
          {/* Channel Shift */}
          <filter id="channelShift" x="-50%" y="-50%" width="200%" height="200%">
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" in="SourceGraphic" result="r"/>
            <feColorMatrix type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" in="SourceGraphic" result="g"/>
            <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" in="SourceGraphic" result="b"/>
            
            <feOffset in="r" dx={filters.channelShift.rDirection !== 'vertical' ? filters.channelShift.rOffset : 0} dy={filters.channelShift.rDirection !== 'horizontal' ? filters.channelShift.rOffset : 0} result="r_offset">
                <animate {...getChannelShiftAnimateProps(filters.channelShift.rDirection, filters.channelShift.rOffset, filters.channelShift.rSpeed)} repeatCount="indefinite" />
            </feOffset>
            <feOffset in="g" dx={filters.channelShift.gDirection !== 'vertical' ? filters.channelShift.gOffset : 0} dy={filters.channelShift.gDirection !== 'horizontal' ? filters.channelShift.gOffset : 0} result="g_offset">
                <animate {...getChannelShiftAnimateProps(filters.channelShift.gDirection, filters.channelShift.gOffset, filters.channelShift.gSpeed)} repeatCount="indefinite" />
            </feOffset>
            <feOffset in="b" dx={filters.channelShift.bDirection !== 'vertical' ? filters.channelShift.bOffset : 0} dy={filters.channelShift.bDirection !== 'horizontal' ? filters.channelShift.bOffset : 0} result="b_offset">
                <animate {...getChannelShiftAnimateProps(filters.channelShift.bDirection, filters.channelShift.bOffset, filters.channelShift.bSpeed)} repeatCount="indefinite" />
            </feOffset>

            <feBlend mode="screen" in="r_offset" in2="g_offset" result="rg_blend"/>
            <feBlend mode="screen" in="rg_blend" in2="b_offset" result="all_blended"/>
            <feComposite in="all_blended" in2="SourceGraphic" operator="in" />
          </filter>

          {/* Noise */}
          <filter id="noise" x="-50%" y="-50%" width="200%" height="200%">
            <feTurbulence 
              type={filters.noise.type === 'grain' ? 'fractalNoise' : filters.noise.type} 
              baseFrequency={filters.noise.type === 'grain' ? '0.65' : `${filters.noise.amount} ${filters.noise.amount}`}
              numOctaves={filters.noise.octaves} 
              seed={noiseSeed} 
              stitchTiles="stitch" 
              result="turbulence"
            />
            <feColorMatrix in="turbulence" type="saturate" values="0" result="monochromeNoise"/>
            <feComponentTransfer in="monochromeNoise" result="transparentNoise">
              <feFuncA type="linear" slope={filters.noise.opacity} />
            </feComponentTransfer>
            <feBlend in="SourceGraphic" in2="transparentNoise" mode="overlay" result="blended" />
            <feComposite in="blended" in2="SourceGraphic" operator="in" />
          </filter>

          {/* Slit Scan (Wavy) */}
          <filter id="slitScan" x="-50%" y="-50%" width="200%" height="200%">
            <feTurbulence type="fractalNoise" baseFrequency={filters.slitScan.direction === 'vertical' ? `0.001 ${filters.slitScan.density / 1000}` : `${filters.slitScan.density / 1000} 0.001`} numOctaves="3" seed="10" result="staticWave" />
            <feOffset in="staticWave" dx="0" dy="0" result="scrollingWave">
                {filters.slitScan.animate && <animate {...getSlitScanAnimateProps()} />}
            </feOffset>
            <feDisplacementMap in="SourceGraphic" in2="scrollingWave" scale={filters.slitScan.amount} xChannelSelector="R" yChannelSelector="G" result="wavy"/>
            <feComposite in="wavy" in2="SourceGraphic" operator="in" />
          </filter>
          
          {/* CRT (Rebuilt) */}
          <filter id="crt" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
            {/* 1. Curvature */}
            <feTurbulence baseFrequency="0.005" numOctaves="1" seed="1" result="disp_map_turb" />
            <feDisplacementMap in="SourceGraphic" in2="disp_map_turb" scale={filters.crt.curvature * 100} result="curved" />
            
            {/* 2. Glow */}
            <feGaussianBlur in="curved" stdDeviation={filters.crt.glowAmount} result="glow_blur" />
            <feComposite in="curved" in2="glow_blur" operator="arithmetic" k1="0" k2="1.2" k3="0.5" k4="0" result="glow" />
            
            {/* 3. Scanlines */}
            <feTurbulence type="fractalNoise" baseFrequency={`0 ${scanlineOffset + (filters.crt.lineThickness * 0.5)}`} numOctaves="1" seed="5" result="scanline_turb" />
            <feComponentTransfer in="scanline_turb" result="scanline_map">
              <feFuncA type="table" tableValues={`0 ${1 - filters.crt.scanlineOpacity} 0`} />
            </feComponentTransfer>
            <feComposite in="glow" in2="scanline_map" operator="in" result="imageWithScanlines" />
            
            {/* 4. Vignette */}
            <feImage href={`data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><defs><radialGradient id='g' cx='50%' cy='50%' r='70%'><stop offset='${(1 - filters.crt.vignette) * 100}%' stop-color='white' stop-opacity='1'/><stop offset='100%' stop-color='white' stop-opacity='0'/></radialGradient></defs><rect width='100%' height='100%' fill='url(%23g)'/></svg>`)}`} result="vignetteMask" preserveAspectRatio="none"/>
            <feComposite in="imageWithScanlines" in2="vignetteMask" operator="in" />
          </filter>
          
          {/* Pixelate */}
          <filter id="pixelate" x="0" y="0" width="100%" height="100%">
            {filters.pixelate.type === 'crystal' ? (
                <>
                    <feTurbulence type="fractalNoise" baseFrequency={0.02 + filters.pixelate.size * 0.005} numOctaves="1" result="voronoi_noise" />
                    <feComponentTransfer in="voronoi_noise" result="voronoi_map">
                        <feFuncR type="discrete" tableValues="0 0.2 0.4 0.6 0.8 1.0" />
                        <feFuncG type="discrete" tableValues="0 0.2 0.4 0.6 0.8 1.0" />
                    </feComponentTransfer>
                    <feDisplacementMap in="SourceGraphic" in2="voronoi_map" scale={filters.pixelate.size * 2} xChannelSelector="R" yChannelSelector="G" />
                </>
            ) : (
                <>
                    <feFlood x="0" y="0" width="100%" height="100%" />
                    <feComposite width={filters.pixelate.size} height={filters.pixelate.size}>
                      {filters.pixelate.animate && <animate attributeName="width" values={getPixelateAnimationValues('width')} dur={`${1 / filters.pixelate.animationSpeed}s`} repeatCount="indefinite" />}
                      {filters.pixelate.animate && <animate attributeName="height" values={getPixelateAnimationValues('height')} dur={`${1 / filters.pixelate.animationSpeed}s`} repeatCount="indefinite" />}
                    </feComposite>
                    <feTile result="tiles" />
                    <feComposite in="SourceGraphic" in2="tiles" operator="in" result="pixelated" />
                    <feMorphology in="pixelated" operator="dilate" radius={filters.pixelate.size / 2} >
                        {filters.pixelate.animate && <animate attributeName="radius" values={getPixelateAnimationValues('radius')} dur={`${1 / filters.pixelate.animationSpeed}s`} repeatCount="indefinite" />}
                    </feMorphology>
                    {filters.pixelate.type === 'smooth' && <feGaussianBlur stdDeviation="0.5" />}
                </>
            )}
          </filter>
          
          {/* Hue Rotate */}
          <filter id="hueRotate">
            <feColorMatrix type="hueRotate" values={String(filters.hueRotate.angle)}>
              {filters.hueRotate.animate && <animate attributeName="values" from="0" to="360" dur={`${20 / filters.hueRotate.speed}s`} repeatCount="indefinite" />}
            </feColorMatrix>
          </filter>

          {/* Blur */}
          <filter id="blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={filters.blur.type === 'gaussian' ? `${filters.blur.amountX} ${filters.blur.amountY}` : getMotionBlurStdDeviation()}>
               {filters.blur.animate && <animate attributeName="stdDeviation" values={getBlurAnimationValues()} dur={`${2 / filters.blur.animationSpeed}s`} repeatCount="indefinite" />}
            </feGaussianBlur>
          </filter>
          
          {/* Color Controls */}
          <filter id="colorControls">
             <feColorMatrix type="saturate" values={String(filters.colorControls.saturation)} />
             <feComponentTransfer>
                <feFuncR type="gamma" amplitude={filters.colorControls.contrast} exponent={1 / filters.colorControls.brightness} offset="0" />
                <feFuncG type="gamma" amplitude={filters.colorControls.contrast} exponent={1 / filters.colorControls.brightness} offset="0" />
                <feFuncB type="gamma" amplitude={filters.colorControls.contrast} exponent={1 / filters.colorControls.brightness} offset="0" />
            </feComponentTransfer>
          </filter>

           {/* JPEG Glitch */}
          <filter id="jpegGlitch" x="-50%" y="-50%" width="200%" height="200%">
            <feTurbulence type="fractalNoise" baseFrequency={`${filters.jpegGlitch.blockSize / 1000} ${filters.jpegGlitch.blockSize / 1000}`} numOctaves="1" result="blocks"/>
            <feComponentTransfer in="blocks" result="sharpBlocks">
                <feFuncR type="discrete" tableValues="0 0.2 0.4 0.6 0.8 1" />
                <feFuncG type="discrete" tableValues="0 0.2 0.4 0.6 0.8 1" />
            </feComponentTransfer>
            <feDisplacementMap in="SourceGraphic" in2="sharpBlocks" scale={filters.jpegGlitch.amount} xChannelSelector="R" yChannelSelector="G" result="glitchPass1"/>
            <feDisplacementMap in="glitchPass1" in2="sharpBlocks" scale={filters.jpegGlitch.amount / (filters.jpegGlitch.iterations > 1 ? 2 : 1)} xChannelSelector="B" yChannelSelector="G" result="glitchPass2"/>
            <feDisplacementMap in="glitchPass2" in2="sharpBlocks" scale={filters.jpegGlitch.amount / (filters.jpegGlitch.iterations > 2 ? 4 : 1)} xChannelSelector="R" yChannelSelector="B" result="glitched" />
            <feComposite in="glitched" in2="SourceGraphic" operator="in" />
          </filter>

          {/* Slice Shift */}
          <filter id="sliceShift" x="-50%" y="-50%" width="200%" height="200%">
              <feTurbulence 
                  type="turbulence" 
                  baseFrequency={filters.sliceShift.direction === 'horizontal' ? `0.001 ${filters.sliceShift.sliceHeight / 200}` : `${filters.sliceShift.sliceHeight / 200} 0.001`} 
                  numOctaves="1" 
                  seed={sliceShiftSeed}
                  result="bands"
              />
               <feComponentTransfer in="bands" result="sharpBands">
                  <feFuncR type="discrete" tableValues="0 1" />
                  <feFuncG type="discrete" tableValues="0 1" />
                  <feFuncB type="discrete" tableValues="0 1" />
               </feComponentTransfer>
               <feColorMatrix in="sharpBands" type="matrix" values={getSliceShiftDispMapMatrix()} result="dispMap"/>
              <feDisplacementMap 
                  in="SourceGraphic" 
                  in2="dispMap" 
                  scale={filters.sliceShift.animate && filters.sliceShift.animationType === 'pulse' ? sliceShiftAnimatedScale : filters.sliceShift.offsetAmount}
                  xChannelSelector="R"
                  yChannelSelector="G"
                  result="shifted"
              />
              <feComposite in="SourceGraphic" in2="sharpBands" operator="out" result="unshifted"/>
              <feComposite in="shifted" in2="sharpBands" operator="in" result="shiftedOnly"/>
              <feMerge result="merged">
                <feMergeNode in="unshifted"/>
                <feMergeNode in="shiftedOnly"/>
              </feMerge>
              {/* Final clip to prevent any bleeding */}
              <feComposite in="merged" in2="SourceGraphic" operator="in" />
          </filter>
          
          {/* Image Effects */}
          <filter id="imageEffects">
            {filters.imageEffects.type === 'grayscale' ? (
                <feColorMatrix type="saturate" values="0" result="effect"/>
            ) : (
                <feColorMatrix type="matrix" values={getImageEffectsMatrix()} result="effect"/>
            )}
            <feComposite in="SourceGraphic" in2="effect" operator="arithmetic"
              k1="0" 
              k2={1 - (filters.imageEffects.strength / 100)} 
              k3={filters.imageEffects.strength / 100} 
              k4="0" 
            />
          </filter>

        </defs>
      </svg>
      
      <main className="container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-gray-800 rounded-lg shadow-2xl p-6 h-fit sticky top-8">
            <h2 className="text-2xl font-bold mb-4 border-b-2 border-cyan-500 pb-2">Controls</h2>
            <FileUpload onFileChange={handleFileChange} />
            <TestResultsDisplay results={testResults} />
            {imageUrl && (
              <>
                <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="preset-select" className="block text-sm font-medium mb-2 text-cyan-400">Presets</label>
                    <select
                      id="preset-select"
                      value={selectedPreset}
                      onChange={handlePresetChange}
                      className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="none">None</option>
                      <option value="broken-vhs">Broken VHS</option>
                      <option value="cyberpunk">Cyberpunk</option>
                      <option value="ghosting">Ghosting</option>
                      <option value="meltdown">Meltdown</option>
                    </select>
                  </div>
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
                      <option value="vintage">Vintage TV</option>
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
                  preset={selectedPreset}
                  presetStrength={presetStrength}
                  onPresetStrengthChange={setPresetStrength}
                />

                <div className="flex flex-col sm:flex-row gap-4 mt-6">
                  <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-900 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 relative overflow-hidden"
                  >
                    {isDownloading && (
                      <div 
                        className="absolute top-0 left-0 h-full bg-cyan-400/50" 
                        style={{ width: `${downloadProgress}%` }}
                      />
                    )}
                    <span className="relative z-10">{isDownloading ? `Processing... ${Math.round(downloadProgress)}%` : 'Download Animation (WebM)'}</span>
                  </button>
                  <button
                    onClick={resetAll}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
                  >
                    Reset All
                  </button>
                </div>
              </>
            )}
          </div>
          <div className="lg:col-span-2">
            <ImagePreview 
                imageUrl={imageUrl} 
                filterStyle={{ filter: filterUrls }} 
                isCurved={filters.crt.active && filters.crt.curvature > 0}
                overlayUrl={overlays[overlay]}
                flipHorizontal={transforms.flipHorizontal}
                flipVertical={transforms.flipVertical}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
