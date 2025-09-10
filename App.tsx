
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { FilterSettings, OverlayType, TransformSettings, ImageEffectsSettings } from './types';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import FilterControls from './components/FilterControls';
import ImagePreview from './components/ImagePreview';
import saveAs from 'file-saver';

// Type declarations for the ImageDecoder API, which may not be in default TS lib definitions.
declare global {
  interface Window {
    ImageDecoder: typeof ImageDecoder;
  }
  class ImageDecoder {
    constructor(options: { data: BufferSource; type: string; });
    tracks: {
      ready: Promise<void>;
      selectedTrack: {
        codedWidth: number;
        codedHeight: number;
        frameCount: number;
      } | null;
    };
    decode(options: { frameIndex: number }): Promise<{ image: VideoFrame }>;
    close(): void;
  }

  // FIX: Add readonly modifier to properties to match the built-in VideoFrame interface, resolving modifier conflict errors.
  interface VideoFrame {
    readonly codedWidth: number;
    readonly codedHeight: number;
    readonly duration: number | null; // in microseconds
    close(): void;
  }

  // FIX: The 'preferCurrentTab' property on DisplayMediaStreamOptions is a valid but sometimes untyped
  // property in TypeScript's standard DOM libraries. This declaration augmentation adds the property
  // to the global interface to resolve the type error when calling navigator.mediaDevices.getDisplayMedia.
  interface DisplayMediaStreamOptions {
    preferCurrentTab?: boolean;
  }
}


const initialFilterSettings: FilterSettings = {
  channelShift: { active: false, rOffset: 2, gOffset: 0, bOffset: -2, rAngle: 0, gAngle: 0, bAngle: 0, animate: false, animationSpeed: 1, animationType: 'wave', animationMinAmount: 80, animationMaxAmount: 120 },
  noise: { active: false, amount: 0.2, type: 'fractalNoise', animate: true, animationSpeed: 1, octaves: 3, opacity: 0.5, blendMode: 'overlay' },
  slitScan: { active: false, amount: 15, direction: 'vertical', animationSpeed: 1, density: 10, animate: true, animationType: 'pulse', animationMinAmount: 80, animationMaxAmount: 120 },
  crt: { active: false, lineThickness: 2, scanlineOpacity: 0.4, vignette: 0.3, animateScanlines: true, scanlineSpeed: 2, curvature: 0.2, glowAmount: 0.5 },
  pixelate: { active: false, size: 4, animate: false, animationSpeed: 1, type: 'blocky', animationMinAmount: 50, animationMaxAmount: 150, animationType: 'pulse' },
  hueRotate: { active: false, angle: 0 },
  blur: { active: false, type: 'gaussian', amountX: 0, amountY: 0, isLocked: true, amount: 5, angle: 45, animate: false, animationSpeed: 1, animationMinAmount: 0, animationMaxAmount: 10, animationType: 'pulse' },
  colorControls: { active: false, brightness: 1, contrast: 1, saturation: 1 },
  jpegGlitch: { active: false, blockSize: 8, amount: 20, iterations: 1 },
  sliceShift: { active: false, sliceHeight: 10, offsetAmount: 25, direction: 'horizontal', animate: false, animationSpeed: 1, animationType: 'pulse', animationMinAmount: 0, animationMaxAmount: 150 },
  imageEffects: { active: false, type: 'none', strength: 100 }
};

const initialTransformSettings: TransformSettings = {
  flipHorizontal: false,
  flipVertical: false,
};

const overlays: Record<OverlayType, string> = {
    none: '',
    hud: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='100%' height='100%' viewBox='0 0 800 600' preserveAspectRatio='none'><g fill='none' stroke='rgba(255,255,255,0.8)' stroke-width='1.5'><rect x='350' y='250' width='100' height='100' /><path d='M340 300h-30 M460 300h30 M400 240v-30 M400 360v30' /></g><g font-family='monospace' fill='rgba(255,255,255,0.9)' font-size='16'><text x='20' y='35'>4K 60</text><text x='20' y='580'>[AF-C] [AWB]</text><g fill='rgba(255,80,80,0.9)'><circle cx='770' cy='30' r='8' /><text x='760' y='35' text-anchor='end'>REC 00:15:32</text></g></g></svg>`)}`,
    cam: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='100%' height='100%' viewBox='0 0 200 200' preserveAspectRatio='none'><g font-family='monospace' fill='rgba(255,255,100,0.8)'><text x='10' y='18' font-size='8'>CAM_01</text><text x='190' y='18' text-anchor='end' font-size='8'>PLAY</text><text x='10' y='192' font-size='6'>10:31:55 AM</text><text x='190' y='192' text-anchor='end' font-size='6'>12/08/1998</text></g></svg>`)}`,
    vcr: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='100%' height='100%' viewBox='0 0 400 300' preserveAspectRatio='none'><style>.vcr{font-family: monospace; fill: rgba(255,255,255,0.9); font-size: 24px; text-shadow: 2px 2px #000;}</style><text x='20' y='40' class='vcr'>▶ PLAY</text><text x='380' y='280' class='vcr' text-anchor='end'>SP</text></svg>`)}`,
    scope: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='100%' height='100%' viewBox='-1 -1 2 2' preserveAspectRatio='none'><defs><mask id='scope-mask'><rect width='2' height='2' x='-1' y='-1' fill='white'/><circle r='0.9' fill='black'/></mask></defs><rect width='2' height='2' x='-1' y='-1' fill='black' mask='url(#scope-mask)'/><line x1='-0.8' x2='0.8' y1='0' y2='0' stroke='rgba(255,0,0,0.7)' stroke-width='0.01'/><line x1='0' x2='0' y1='-0.8' y2='0.8' stroke='rgba(255,0,0,0.7)' stroke-width='0.01'/><line x1='-0.1' x2='0.1' y1='0' y2='0' stroke='rgba(255,0,0,0.7)' stroke-width='0.03'/><line x1='0' x2='0' y1='-0.1' y2='0.1' stroke='rgba(255,0,0,0.7)' stroke-width='0.03'/></svg>`)}`,
    terminal: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='100%' height='100%' viewBox='0 0 400 300' preserveAspectRatio='none'><style>.term{font-family: monospace; font-size: 12px;}</style><text x='10' y='20' class='term' fill='lime'>usr@glitch:~$ analyzing_stream.sh</text><rect x='10' y='280' width='100' height='12' fill='rgba(0,255,0,0.8)' /><text x='15' y='289' class='term' fill='black'>STATUS: OK</text><path d='M390 10 L390 30 L370 30 M390 290 L390 270 L370 270 M10 10 L10 30 L30 30 M10 290 L10 270 L30 270' stroke='rgba(0,255,0,0.6)' stroke-width='2' fill='none'/></svg>`)}`,
};

type LoadingStatus = 'idle' | 'loading' | 'ready' | 'error';

function App() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterSettings>(initialFilterSettings);
  const [transforms, setTransforms] = useState<TransformSettings>(initialTransformSettings);
  const [overlay, setOverlay] = useState<OverlayType>('none');
  const [isRecording, setIsRecording] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [imageDimensions, setImageDimensions] = useState<{width: number, height: number} | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<LoadingStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [decoder, setDecoder] = useState<ImageDecoder | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const durationResolvedRef = useRef(false);
  const loadingTimeoutRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  
  const clearLoadingTimeout = useCallback(() => {
    if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Cleanup timeout on component unmount
    return () => clearLoadingTimeout();
  }, [clearLoadingTimeout]);
  
  const startLoadingProcess = useCallback(() => {
    setLoadingStatus('loading');
    setErrorMessage(null);
    clearLoadingTimeout();
    loadingTimeoutRef.current = window.setTimeout(() => {
        if (durationResolvedRef.current === false) {
            setLoadingStatus('error');
            setErrorMessage("Analysis timed out. Your browser may not fully support programmatic analysis of this WebP animation. This can prevent the app from reading the animation's length, which is required to enable the download.");
        }
    }, 10000); // 10 second timeout
  }, [clearLoadingTimeout]);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || file.type !== 'image/webp') {
      if (file) alert('Please upload a valid .webp file.');
      return;
    }

    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
    if (decoder) {
        decoder.close();
    }
    setDecoder(null);

    const objectUrl = URL.createObjectURL(file);
    setImageUrl(objectUrl);
    setVideoDuration(0);
    setImageDimensions(null);
    setErrorMessage(null);
    setLoadingStatus('loading');

    // --- NEW: ImageDecoder Path (for modern browsers) ---
    if ('ImageDecoder' in window) {
      try {
        const data = await file.arrayBuffer();
        const newDecoder = new ImageDecoder({ data, type: file.type });
        await newDecoder.tracks.ready;
        const track = newDecoder.tracks.selectedTrack;

        if (!track || track.codedWidth === 0 || track.codedHeight === 0) {
          throw new Error("No valid video track found or dimensions are zero.");
        }
        
        setImageDimensions({ width: track.codedWidth, height: track.codedHeight });
        setDecoder(newDecoder);
        setVideoDuration(track.frameCount > 0 ? 1 : 0); // Use frameCount to signal duration exists
        setLoadingStatus('ready');
        return; // Success, skip fallback
      } catch (e) {
        console.error("ImageDecoder failed, attempting fallback:", e);
        // Reset state and fall through to the video tag method
        if (decoder) decoder.close();
        setDecoder(null);
        setImageDimensions(null);
      }
    }

    // --- FALLBACK: Video Tag Path ---
    console.log("ImageDecoder not found or failed, falling back to video element method.");
    durationResolvedRef.current = false;
    startLoadingProcess();
    if (videoRef.current) {
      videoRef.current.src = objectUrl;
      videoRef.current.load();
    }
  }, [imageUrl, startLoadingProcess, decoder]);

  const handleVideoError = useCallback((e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
      if (durationResolvedRef.current) return; // Don't process error if we already succeeded
      
      const video = e.currentTarget;
      let errorMsg = "An unknown error occurred while trying to load the animation.";
      if (video.error) {
          switch (video.error.code) {
              case video.error.MEDIA_ERR_ABORTED:
                  errorMsg = 'The loading process was aborted.';
                  break;
              case video.error.MEDIA_ERR_NETWORK:
                  errorMsg = 'A network error caused the animation to fail to load.';
                  break;
              case video.error.MEDIA_ERR_DECODE:
                  errorMsg = 'The animation could not be decoded. The file might be corrupted or in a format variant that is not fully supported by your browser for video playback.';
                  break;
              case video.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                  errorMsg = 'The WebP animation format is not supported as a video source by your browser. The application cannot process this file.';
                  break;
              default:
                  errorMsg = `An unexpected error occurred while loading the media. Error code: ${video.error.code}`;
          }
      }
      setLoadingStatus('error');
      setErrorMessage(errorMsg);
      clearLoadingTimeout();
      durationResolvedRef.current = true; // Mark as resolved to prevent timeout message overwriting this one
  }, [clearLoadingTimeout]);

  const handleVideoReady = useCallback((e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    if (durationResolvedRef.current) return;

    const video = e.currentTarget;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
        // This might be a transient state, so don't fail immediately unless it's the only info we get.
        // The timeout will catch persistent failures.
        if (video.readyState > 0) { // HAVE_METADATA or more
            setLoadingStatus('error');
            setErrorMessage("Failed to read the animation's dimensions. The file might be corrupted, or your browser may not fully support this format for analysis.");
            clearLoadingTimeout();
            durationResolvedRef.current = true;
        }
        return;
    }

    setImageDimensions({
        width: video.videoWidth,
        height: video.videoHeight,
    });
    
    const setDurationAndFinalize = (duration: number) => {
        setVideoDuration(duration);
        durationResolvedRef.current = true;
        setLoadingStatus('ready');
        clearLoadingTimeout();
    };

    if (video.duration && isFinite(video.duration)) {
        setDurationAndFinalize(video.duration);
        return;
    }

    // If duration isn't ready but we have metadata, try seeking.
    // This part is now guarded by being called from onCanPlay as well.
    const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        const actualDuration = video.currentTime;
        if (actualDuration > 0) {
            setDurationAndFinalize(actualDuration);
        } else {
            console.warn(`Could not determine a valid duration. Fallback currentTime: ${actualDuration}`);
            setLoadingStatus('error');
            setErrorMessage("Failed to determine animation length via seeking. The file might be corrupted or use a format variant that isn't fully supported by your browser for programmatic analysis.");
            clearLoadingTimeout();
        }
        video.currentTime = 0;
    };
    
    video.addEventListener('seeked', onSeeked);
    video.currentTime = 1e101; 
  }, [clearLoadingTimeout]);
  
  const handleRetry = useCallback(() => {
    if (decoder) {
        setErrorMessage("Please re-upload the file to try again.");
        return;
    }
    if (!videoRef.current) return;
    durationResolvedRef.current = false;
    setErrorMessage(null);
    startLoadingProcess();
    videoRef.current.load();
  }, [startLoadingProcess, decoder]);

  const resetAll = useCallback(() => {
    setFilters(initialFilterSettings);
    setTransforms(initialTransformSettings);
    setOverlay('none');
  }, []);

  const handleStopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
    }
    // Final state cleanup will happen in recorder.onstop
  }, []);

  const handleStartRecording = useCallback(async () => {
    if (loadingStatus !== 'ready' || !imageUrl) {
        alert('Please wait for the image to load fully before recording.');
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: { frameRate: 30 },
            audio: false,
            preferCurrentTab: true, // Encourage user to select the current tab
        });
        streamRef.current = stream;

        const [videoTrack] = stream.getVideoTracks();
        
        // --- NEW: Attempt to crop the recording to the preview element ---
        // The Element Capture API allows us to crop the video track to a specific element.
        if (previewRef.current && 'cropTo' in videoTrack && typeof (videoTrack as any).cropTo === 'function') {
            try {
                // We use `any` because `cropTo` is a new API and may not be in the default TS types.
                await (videoTrack as any).cropTo(previewRef.current);
            } catch (e) {
                console.warn("Could not crop to element. Recording full tab.", e);
            }
        }
        // --- END CROP ---

        // Listen for the user stopping sharing via the browser's UI
        videoTrack.onended = () => {
            handleStopRecording();
        };

        setIsRecording(true);
        recordedChunksRef.current = [];

        let recorder: MediaRecorder;
        try {
          // Prefer VP9 for better quality/compression if available
          recorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
        } catch (e) {
          console.warn("VP9 codec not supported, falling back to default.");
          recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        }
        
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunksRef.current.push(event.data);
            }
        };

        recorder.onstop = () => {
            if (recordedChunksRef.current.length > 0) {
                const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
                saveAs(blob, 'glitched-animation.webm');
            }
            
            // Cleanup
            streamRef.current = null;
            mediaRecorderRef.current = null;
            recordedChunksRef.current = [];
            setIsRecording(false);
        };

        recorder.start();

    } catch (err) {
        console.error("Error starting screen recording:", err);
        setErrorMessage("Screen recording failed. Please grant permission and try again.");
        setIsRecording(false);
    }
  }, [loadingStatus, imageUrl, handleStopRecording]);


  const filterUrls = Object.entries(filters)
    .filter(([, settings]) => settings.active && !(settings.type === 'none'))
    .map(([key]) => `url(#${key})`)
    .join(' ');
  
  const getAnimationValues = (baseVal: number, minPct: number, maxPct: number, type: string) => {
    const minVal = baseVal * (minPct / 100);
    const maxVal = baseVal * (maxPct / 100);
    switch (type) {
        case 'sweep':
            return `${minVal};${maxVal};${minVal}`;
        case 'flicker':
            const flickerValues = Array.from({ length: 5 }, () => Math.random() * (maxVal - minVal) + minVal);
            return [baseVal, ...flickerValues, baseVal].map(v => v.toFixed(2)).join(';');
        case 'pulse':
        default:
            return `${baseVal};${minVal};${maxVal};${baseVal}`;
    }
  };
    
  const getMotionBlurStdDeviation = () => {
      const angleRad = (filters.blur.angle * Math.PI) / 180;
      const x = Math.abs(filters.blur.amount * Math.cos(angleRad));
      const y = Math.abs(filters.blur.amount * Math.sin(angleRad));
      return `${x} ${y}`;
  }
  
  const getSlitScanAnimationValues = () => {
    const { amount, animationMinAmount, animationMaxAmount, animationType } = filters.slitScan;
    return getAnimationValues(amount, animationMinAmount, animationMaxAmount, animationType);
  };

  const getImageEffectsMatrix = () => {
    switch(filters.imageEffects.type) {
      case 'sepia': return "0.393 0.769 0.189 0 0 0.349 0.686 0.168 0 0 0.272 0.534 0.131 0 0 0 0 0 1 0";
      case 'invert': return "-1 0 0 0 1 0 -1 0 0 1 0 0 -1 0 1 0 0 0 1 0";
      default: return "1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0";
    }
  }
  
  const getPixelateAnimationValues = (attr: 'width' | 'height' | 'radius') => {
      const { size, animationMinAmount, animationMaxAmount, animationType } = filters.pixelate;
      const baseVal = attr === 'radius' ? size / 2 : size;
      return getAnimationValues(baseVal, animationMinAmount, animationMaxAmount, animationType);
  }

  const getAnimationValuesForXY = (baseX: number, baseY: number, minPct: number, maxPct: number, type: string) => {
      const getStdDev = (amtX: number, amtY: number) => `${amtX.toFixed(2)} ${amtY.toFixed(2)}`;
      const minX = baseX * (minPct / 100);
      const minY = baseY * (minPct / 100);
      const maxX = baseX * (maxPct / 100);
      const maxY = baseY * (maxPct / 100);
      
      const baseVal = getStdDev(baseX, baseY);
      const minVal = getStdDev(minX, minY);
      const maxVal = getStdDev(maxX, maxY);

      switch (type) {
          case 'sweep':
              return `${minVal};${maxVal};${minVal}`;
          case 'flicker':
              const randomBetween = () => {
                  const randX = Math.random() * (maxX - minX) + minX;
                  const randY = Math.random() * (maxY - minY) + minY;
                  return getStdDev(randX, randY);
              };
              const flickerValues = Array.from({ length: 5 }, randomBetween);
              return [baseVal, ...flickerValues, baseVal].join(';');
          case 'pulse':
          default:
              return `${baseVal};${minVal};${maxVal};${baseVal}`;
      }
  };
  
  const getBlurAnimationValues = () => {
    const { type, amountX, amountY, animationMinAmount, animationMaxAmount, animationType, amount, angle } = filters.blur;
    
    if (type === 'gaussian') {
        return getAnimationValuesForXY(amountX, amountY, animationMinAmount, animationMaxAmount, animationType);
    } 
    // motion
    const angleRad = (angle * Math.PI) / 180;
    const baseValX = Math.abs(amount * Math.cos(angleRad));
    const baseValY = Math.abs(amount * Math.sin(angleRad));
    return getAnimationValuesForXY(baseValX, baseValY, animationMinAmount, animationMaxAmount, animationType);
  }
  
  const getSliceShiftAnimationValues = () => {
    const { offsetAmount, animationMinAmount, animationMaxAmount, animationType } = filters.sliceShift;
    return getAnimationValues(offsetAmount, animationMinAmount, animationMaxAmount, animationType);
  }

  const getChannelShiftOffsets = (offset: number, angle: number) => {
    const angleRad = (angle * Math.PI) / 180;
    return {
      dx: (offset * Math.cos(angleRad)).toFixed(2),
      dy: (offset * Math.sin(angleRad)).toFixed(2),
    };
  };

  const getChannelShiftAnimateValues = (offset: number, angle: number) => {
    const { animationType, animationMinAmount, animationMaxAmount } = filters.channelShift;
    const baseValues = getAnimationValues(offset, animationMinAmount, animationMaxAmount, animationType).split(';');
    const angleRad = (angle * Math.PI) / 180;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    const dxValues = baseValues.map(v => (parseFloat(v) * cos).toFixed(2)).join(';');
    const dyValues = baseValues.map(v => (parseFloat(v) * sin).toFixed(2)).join(';');
    return { dxValues, dyValues };
  };

  const rChan = getChannelShiftOffsets(filters.channelShift.rOffset, filters.channelShift.rAngle);
  const gChan = getChannelShiftOffsets(filters.channelShift.gOffset, filters.channelShift.gAngle);
  const bChan = getChannelShiftOffsets(filters.channelShift.bOffset, filters.channelShift.bAngle);
  const rAnim = getChannelShiftAnimateValues(filters.channelShift.rOffset, filters.channelShift.rAngle);
  const gAnim = getChannelShiftAnimateValues(filters.channelShift.gOffset, filters.channelShift.gAngle);
  const bAnim = getChannelShiftAnimateValues(filters.channelShift.bOffset, filters.channelShift.bAngle);

  const noiseSeedValues = useMemo(() => {
    return Array.from({length: 10}, () => Math.floor(Math.random() * 100)).join(';');
  }, []);
  
  const noiseBaseFrequency = useMemo(() => {
    const { type, amount } = filters.noise;
    if (type === 'grain') {
      return 0.5 + amount * 0.5;
    }
    return amount;
  }, [filters.noise.type, filters.noise.amount]);

  const getSliceShiftDispMapMatrix = () => {
    if (filters.sliceShift.direction === 'horizontal') {
      return "1 0 0 0 0  0 0 0 0 0.5  0 0 0 0 0  0 0 0 1 0";
    }
    // vertical
    return "0 0 0 0 0.5  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0";
  }

  const noiseTransferParams = useMemo(() => {
    const { blendMode, opacity } = filters.noise;
    switch (blendMode) {
      case 'screen':
      case 'difference':
        return { slope: opacity, intercept: 0 };
      case 'overlay':
        return { slope: opacity, intercept: 0.5 - opacity / 2 };
      default:
        return { slope: 1, intercept: 0 };
    }
  }, [filters.noise.blendMode, filters.noise.opacity]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
      <Header />
      
      <video 
        ref={videoRef} 
        onLoadedMetadata={handleVideoReady} 
        onDurationChange={handleVideoReady}
        onCanPlay={handleVideoReady}
        onError={handleVideoError} 
        className="absolute -top-[9999px] -left-[9999px]" 
        playsInline 
        muted 
      />

      <svg className="absolute w-0 h-0">
        <defs id="svg-filter-defs">
          {/* Channel Shift */}
          <filter id="channelShift" x="-50%" y="-50%" width="200%" height="200%">
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" in="SourceGraphic" result="r"/>
            <feColorMatrix type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" in="SourceGraphic" result="g"/>
            <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" in="SourceGraphic" result="b"/>
            
            <feOffset in="r" dx={rChan.dx} dy={rChan.dy} result="r_offset">
                {filters.channelShift.animate && <>
                    <animate attributeName="dx" values={rAnim.dxValues} dur={`${2 / filters.channelShift.animationSpeed}s`} repeatCount="indefinite" />
                    <animate attributeName="dy" values={rAnim.dyValues} dur={`${2 / filters.channelShift.animationSpeed}s`} repeatCount="indefinite" />
                </>}
            </feOffset>
            <feOffset in="g" dx={gChan.dx} dy={gChan.dy} result="g_offset">
                {filters.channelShift.animate && <>
                    <animate attributeName="dx" values={gAnim.dxValues} dur={`${2 / filters.channelShift.animationSpeed}s`} repeatCount="indefinite" />
                    <animate attributeName="dy" values={gAnim.dyValues} dur={`${2 / filters.channelShift.animationSpeed}s`} repeatCount="indefinite" />
                </>}
            </feOffset>
            <feOffset in="b" dx={bChan.dx} dy={bChan.dy} result="b_offset">
                {filters.channelShift.animate && <>
                    <animate attributeName="dx" values={bAnim.dxValues} dur={`${2 / filters.channelShift.animationSpeed}s`} repeatCount="indefinite" />
                    <animate attributeName="dy" values={bAnim.dyValues} dur={`${2 / filters.channelShift.animationSpeed}s`} repeatCount="indefinite" />
                </>}
            </feOffset>
            
            <feBlend in="r_offset" in2="g_offset" mode="screen" result="rg_blend"/>
            <feBlend in="rg_blend" in2="b_offset" mode="screen" result="final_blend"/>

            <feComposite in="final_blend" in2="SourceGraphic" operator="in" />
          </filter>

          {/* Noise */}
          <filter id="noise" x="0" y="0" width="100%" height="100%">
              <feTurbulence 
                type={filters.noise.type === 'grain' ? 'fractalNoise' : filters.noise.type} 
                baseFrequency={String(noiseBaseFrequency)}
                numOctaves={filters.noise.octaves} 
                seed="0" 
                stitchTiles="stitch" 
                result="turbulence"
              >
               {filters.noise.animate && <animate attributeName="seed" values={noiseSeedValues} dur={`${0.5 / filters.noise.animationSpeed}s`} repeatCount="indefinite" />}
              </feTurbulence>
              <feColorMatrix in="turbulence" type="saturate" values="0" result="monochromeNoise"/>
              <feComponentTransfer in="monochromeNoise" result="adjustedNoise">
                  <feFuncR type="linear" slope={noiseTransferParams.slope} intercept={noiseTransferParams.intercept} />
                  <feFuncG type="linear" slope={noiseTransferParams.slope} intercept={noiseTransferParams.intercept} />
                  <feFuncB type="linear" slope={noiseTransferParams.slope} intercept={noiseTransferParams.intercept} />
              </feComponentTransfer>
              <feBlend 
                in="SourceGraphic" 
                in2="adjustedNoise"
                mode={filters.noise.blendMode} />
          </filter>

          {/* Slit Scan (Wavy) */}
          <filter id="slitScan" x="-50%" y="-50%" width="200%" height="200%">
            <feTurbulence type="fractalNoise" baseFrequency={filters.slitScan.direction === 'vertical' ? `0.001 ${filters.slitScan.density / 1000}` : `${filters.slitScan.density / 1000} 0.001`} numOctaves="3" seed="10" result="wavePattern" />
            <feDisplacementMap in="SourceGraphic" in2="wavePattern" scale={filters.slitScan.amount} xChannelSelector="R" yChannelSelector="G" result="wavy">
              {filters.slitScan.animate && <animate attributeName="scale" values={getSlitScanAnimationValues()} dur={`${2 / filters.slitScan.animationSpeed}s`} repeatCount="indefinite" />}
            </feDisplacementMap>
            <feComposite in="wavy" in2="SourceGraphic" operator="in" />
          </filter>

          {/* CRT - COMPLETELY REBUILT */}
          <filter id="crt" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB">
              {/* 1. CURVATURE - Correct centered barrel distortion */}
              <feImage href={`data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1' preserveAspectRatio='none'><linearGradient id='g_h' x1='0' y1='0' x2='1' y2='0'><stop offset='0' stop-color='#808080'/><stop offset='0.5' stop-color='black'/><stop offset='1' stop-color='#808080'/></linearGradient><rect width='1' height='1' fill='url(%23g_h)'/></svg>`)}`} x="0" y="0" width="100%" height="100%" result="h_grad" />
              <feImage href={`data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1' preserveAspectRatio='none'><linearGradient id='g_v' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#808080'/><stop offset='0.5' stop-color='black'/><stop offset='1' stop-color='#808080'/></linearGradient><rect width='1' height='1' fill='url(%23g_v)'/></svg>`)}`} x="0" y="0" width="100%" height="100%" result="v_grad" />
              <feColorMatrix in="h_grad" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="h_grad_r"/>
              <feColorMatrix in="v_grad" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="v_grad_g"/>
              <feMerge result="distort_map">
                  <feMergeNode in="h_grad_r"/>
                  <feMergeNode in="v_grad_g"/>
              </feMerge>
              <feDisplacementMap in="SourceGraphic" in2="distort_map" scale={filters.crt.curvature * 100} xChannelSelector="R" yChannelSelector="G" result="curved" />

              {/* 2. GLOW */}
              <feGaussianBlur in="curved" stdDeviation={filters.crt.glowAmount} result="glow_blur" />
              <feBlend in="curved" in2="glow_blur" mode="screen" result="glowing" />

              {/* 3. SCANLINES - Rebuilt for visibility using turbulence */}
              <feTurbulence type="fractalNoise" baseFrequency={`0 ${filters.crt.lineThickness * 0.4}`} numOctaves="1" result="scanlineNoise"/>
              <feComponentTransfer in="scanlineNoise" result="sharpScanlines">
                <feFuncA type="discrete" tableValues={`0 ${filters.crt.scanlineOpacity} ${filters.crt.scanlineOpacity} 0`} />
              </feComponentTransfer>
              {filters.crt.animateScanlines && (
                  <feTurbulence type="turbulence" baseFrequency="0 0.005" numOctaves="1" seed="0" result="v_shift">
                      <animate attributeName="seed" values={noiseSeedValues} dur={`${0.1 / filters.crt.scanlineSpeed}s`} repeatCount="indefinite" />
                  </feTurbulence>
              )}
              {filters.crt.animateScanlines ? (
                  <feDisplacementMap in="sharpScanlines" in2="v_shift" scale="3" yChannelSelector="G" result="animated_scanlines"/>
              ) : (
                  <feMerge result="animated_scanlines"><feMergeNode in="sharpScanlines"/></feMerge>
              )}
              <feComposite in="glowing" in2="animated_scanlines" operator="over" result="imageWithScanlines"/>

              {/* 4. VIGNETTE */}
              <feImage href={`data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1' preserveAspectRatio='none'><defs><radialGradient id='g' cx='50%' cy='50%' r='55%'><stop offset='${(1 - filters.crt.vignette) * 100}%' stop-color='white'/><stop offset='100%' stop-color='black'/></radialGradient></defs><rect width='1' height='1' fill='url(%23g)'/></svg>`)}`} result="vignetteMask" width="100%" height="100%" />
              <feBlend in="imageWithScanlines" in2="vignetteMask" mode="multiply" result="finalEffect" />
              
              {/* 5. CLIP TO ORIGINAL BOUNDS */}
              <feComposite in="finalEffect" in2="SourceGraphic" operator="atop" />
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
                      {filters.pixelate.animate && <animate attributeName="width" values={getPixelateAnimationValues('width')} dur={`${2 / filters.pixelate.animationSpeed}s`} repeatCount="indefinite" />}
                      {filters.pixelate.animate && <animate attributeName="height" values={getPixelateAnimationValues('height')} dur={`${2 / filters.pixelate.animationSpeed}s`} repeatCount="indefinite" />}
                    </feComposite>
                    <feTile result="tiles" />
                    <feComposite in="SourceGraphic" in2="tiles" operator="in" result="pixelated" />
                    <feMorphology in="pixelated" operator="dilate" radius={filters.pixelate.size / 2} >
                        {filters.pixelate.animate && <animate attributeName="radius" values={getPixelateAnimationValues('radius')} dur={`${2 / filters.pixelate.animationSpeed}s`} repeatCount="indefinite" />}
                    </feMorphology>
                </>
            )}
          </filter>
          
          {/* Hue Rotate */}
          <filter id="hueRotate">
            <feColorMatrix type="hueRotate" values={String(filters.hueRotate.angle)} />
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
                  seed="0"
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
                  scale={filters.sliceShift.offsetAmount} 
                  xChannelSelector="R"
                  yChannelSelector="G"
                  result="shifted"
                  edgeMode="duplicate"
              >
                {filters.sliceShift.animate && <animate attributeName="scale" values={getSliceShiftAnimationValues()} dur={`${2 / filters.sliceShift.animationSpeed}s`} repeatCount="indefinite" />}
              </feDisplacementMap>
              <feComposite in="SourceGraphic" in2="sharpBands" operator="out" result="unshifted"/>
              <feComposite in="shifted" in2="sharpBands" operator="in" result="shiftedOnly"/>
              <feMerge result="mergedSlices">
                <feMergeNode in="unshifted"/>
                <feMergeNode in="shiftedOnly"/>
              </feMerge>
              <feComposite in="mergedSlices" in2="SourceGraphic" operator="in" />
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
                      onClick={handleStopRecording}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 animate-pulse"
                      aria-label="Stop recording animation"
                    >
                      Stop Recording
                    </button>
                  ) : (
                    <button
                      onClick={handleStartRecording}
                      disabled={loadingStatus !== 'ready'}
                      className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
                      aria-label="Start recording and download animation"
                    >
                      Record & Download Video (.webm)
                    </button>
                  )}
                  <p className="text-xs text-gray-500 text-center">
                    For best results, share this browser tab. The recording will be automatically cropped to the preview area.
                  </p>
                  <button
                    onClick={resetAll}
                    disabled={isRecording}
                    className="w-full bg-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
                  >
                    Reset All
                  </button>
                </div>

                {loadingStatus !== 'ready' && !isRecording && (
                  <div className="mt-4 p-3 rounded-lg bg-yellow-900/50 border border-yellow-700 text-yellow-300 text-center">
                    <p className="font-bold text-sm">Download Disabled</p>
                    <p className="text-xs mt-1">
                      {loadingStatus === 'loading' && 'The application is currently analyzing your animation. The download will be enabled once this process is complete.'}
                      {loadingStatus === 'error' && errorMessage}
                    </p>
                    {loadingStatus === 'error' && (
                        <button onClick={handleRetry} className="text-sm mt-2 text-cyan-400 hover:text-cyan-300 font-bold underline">
                            Click here to retry analysis
                        </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="lg:col-span-2">
            <ImagePreview 
                ref={previewRef}
                imageUrl={imageUrl} 
                filterStyle={{ filter: filterUrls }} 
                isCurved={filters.crt.active && filters.crt.curvature > 0}
                overlayUrl={overlays[overlay]}
                flipHorizontal={transforms.flipHorizontal}
                flipVertical={transforms.flipVertical}
                imageDimensions={imageDimensions}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
