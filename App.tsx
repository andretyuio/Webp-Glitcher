
import React, { useState, useCallback, useRef } from 'react';
import saveAs from 'file-saver';
import { FilterSettings, OverlayType, TransformSettings, WebPData } from './types';
import Header from './components/Header';
import ImagePreview from './components/ImagePreview';
import SvgFilters from './components/SvgFilters';
import ControlsPanel from './components/ControlsPanel';
import RecordingTutorial from './components/RecordingTutorial';
import { useWebPAnalyzer } from './hooks/useWebPAnalyzer';
import { useScreenRecorder } from './hooks/useScreenRecorder';

const initialFilterSettings: FilterSettings = {
  channelShift: { active: false, rOffset: 2, gOffset: 0, bOffset: -2, rAngle: 0, gAngle: 0, bAngle: 0, animate: false, animationSpeed: 1, animationType: 'wave', animationMinAmount: 80, animationMaxAmount: 120 },
  noise: { active: false, scale: 2.5, type: 'fractalNoise', opacity: 0.5, blendMode: 'overlay', animate: true },
  slitScan: { active: false, amount: 15, direction: 'vertical', animationSpeed: 1, density: 10, animate: true, animationType: 'pulse', animationMinAmount: 80, animationMaxAmount: 120 },
  pixelate: { active: false, size: 4, animate: false, animationSpeed: 1, type: 'blocky', animationMinAmount: 50, animationMaxAmount: 150, animationType: 'pulse' },
  hueRotate: { active: false, angle: 0 },
  blur: { active: false, type: 'gaussian', amountX: 0, amountY: 0, isLocked: true, amount: 5, angle: 45, animate: false, animationSpeed: 1, animationMinAmount: 0, animationMaxAmount: 10, animationType: 'pulse' },
  colorControls: { active: false, brightness: 1, contrast: 1, saturation: 1 },
  jpegGlitch: { active: false, blockSize: 8, amount: 20, iterations: 1 },
  sliceShift: { active: false, sliceHeight: 10, offsetAmount: 25, direction: 'horizontal', animate: false, animationSpeed: 1, animationType: 'pulse', animationMinAmount: 0, animationMaxAmount: 150 },
  crt: { active: false, bandingOpacity: 0.2, scanlineOpacity: 0.15, barrelDistortion: 5, vignetteOpacity: 0.4, animate: true, animationSpeed: 1, bandingDrift: 50, bandingDensity: 8, bandingSharpness: 20 },
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

function App() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [filters, setFilters] = useState<FilterSettings>(initialFilterSettings);
  const [transforms, setTransforms] = useState<TransformSettings>(initialTransformSettings);
  const [overlay, setOverlay] = useState<OverlayType>('none');
  const [isPaused, setIsPaused] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const animatedImageRef = useRef<HTMLImageElement>(null);

  const {
    loadingStatus, 
    errorMessage: analysisError, 
    videoDuration, 
    imageDimensions,
    webpData,
    handleRetry,
  } = useWebPAnalyzer(currentFile);

  const isAnimated = !!webpData && webpData.frames.length > 1;

  const {
      isRecording,
      recordingError,
      isTutorialVisible,
      startRecording,
      stopRecording,
      proceedWithRecording,
      cancelRecordingSetup,
  } = useScreenRecorder(videoDuration);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || file.type !== 'image/webp') {
      if (file) alert('Please upload a valid .webp file.');
      setCurrentFile(null);
      setImageUrl(null);
      return;
    }
    setCurrentFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
        setImageUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    setIsPaused(false);
  }, []);

  const resetAll = useCallback(() => {
    setFilters(initialFilterSettings);
    setTransforms(initialTransformSettings);
    setOverlay('none');
    setIsPaused(false);
  }, []);

  const handleStartRecording = useCallback(() => {
    const svgFiltersHtml = document.getElementById('svg-filter-defs')?.innerHTML;
    const previewContainer = previewRef.current;
    
    if (!previewContainer || !imageUrl || typeof svgFiltersHtml === 'undefined') {
        console.error("Could not gather all necessary data for recording.");
        alert("An error occurred preparing the recording. Please try again.");
        return;
    }

    const computedStyle = window.getComputedStyle(previewContainer);
    
    startRecording({
        imageUrl,
        overlayUrl: overlays[overlay],
        svgFiltersHtml,
        filterStyle: computedStyle.filter,
        transformStyle: computedStyle.transform,
    });
  }, [imageUrl, overlay, startRecording]);

  const captureCurrentFrame = useCallback((onCapture: (dataUrl: string) => void) => {
    if (!imageDimensions) {
      alert("Please upload an image first.");
      return;
    }
    const svgDefsHtml = document.getElementById('svg-filter-defs')?.innerHTML;
    if (!svgDefsHtml) {
      alert("Could not find filter definitions to apply.");
      return;
    }

    // Determine the source element: the paused canvas or the live animating image
    const sourceElement = isPaused ? previewCanvasRef.current : animatedImageRef.current;
    if (!sourceElement) {
        alert("Image source for capture not found.");
        return;
    }

    // Draw the source element to a temporary canvas to get a static image data URL
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageDimensions.width;
    tempCanvas.height = imageDimensions.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) {
        alert("Could not create a canvas context for capture.");
        return;
    }
    tempCtx.drawImage(sourceElement, 0, 0, imageDimensions.width, imageDimensions.height);
    const sourceImageHref = tempCanvas.toDataURL();
    
    const activeFilterUrls = Object.entries(filters)
        .filter(([, settings]) => settings.active && !(settings.type === 'none'))
        .map(([key]) => `url(#${key})`)
        .join(' ');

    let scaleX = 1, scaleY = 1, translateX = 0, translateY = 0;
    if (transforms.flipHorizontal) { scaleX = -1; translateX = -imageDimensions.width; }
    if (transforms.flipVertical) { scaleY = -1; translateY = -imageDimensions.height; }
    const transformValue = `translate(${translateX} ${translateY}) scale(${scaleX} ${scaleY})`;
    const finalTransform = (transforms.flipHorizontal || transforms.flipVertical) ? `transform="${transformValue}"` : '';

    const svgString = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${imageDimensions.width}" height="${imageDimensions.height}">
            <defs>${svgDefsHtml}</defs>
            <g filter="${activeFilterUrls}" ${finalTransform}>
                <image href="${sourceImageHref}" x="0" y="0" width="${imageDimensions.width}" height="${imageDimensions.height}" />
                ${overlay !== 'none' && !isPaused ? `<image href="${overlays[overlay]}" x="0" y="0" width="100%" height="100%" />` : ''}
            </g>
        </svg>`;
    
    const blob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    
    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = imageDimensions.width;
        canvas.height = imageDimensions.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0, imageDimensions.width, imageDimensions.height);
            const pngDataUrl = canvas.toDataURL('image/png');
            onCapture(pngDataUrl);
        }
        URL.revokeObjectURL(url);
    };
    img.onerror = () => {
         alert("Could not capture frame due to an image rendering error.");
         URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [imageDimensions, filters, transforms, overlay, overlays, isPaused]);

  const handleTogglePause = useCallback(() => {
    setIsPaused(isPaused => !isPaused);
  }, []);

  const handleDownloadFrame = useCallback(() => {
    captureCurrentFrame((dataUrl) => {
      saveAs(dataUrl, 'glitched-frame.png');
    });
  }, [captureCurrentFrame]);
  
  const filterUrls = Object.entries(filters)
    .filter(([, settings]) => settings.active && !(settings.type === 'none'))
    .map(([key]) => `url(#${key})`)
    .join(' ');
  
  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
      {isTutorialVisible && (
        <RecordingTutorial 
            onConfirm={proceedWithRecording}
            onCancel={cancelRecordingSetup}
        />
      )}
      <Header />
      <SvgFilters filters={filters} />
      
      <main className="container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <ControlsPanel
            onFileChange={handleFileChange}
            imageUrl={imageUrl}
            isRecording={isRecording}
            isPaused={isPaused}
            isAnimated={isAnimated}
            loadingStatus={loadingStatus}
            analysisError={analysisError}
            recordingError={recordingError}
            handleRetry={handleRetry}
            overlay={overlay}
            setOverlay={setOverlay}
            filters={filters}
            setFilters={setFilters}
            transforms={transforms}
            setTransforms={setTransforms}
            startRecording={handleStartRecording}
            stopRecording={stopRecording}
            resetAll={resetAll}
            handleDownloadFrame={handleDownloadFrame}
            handleTogglePause={handleTogglePause}
          />
          <div className="lg:col-span-2">
            <ImagePreview 
                ref={previewRef}
                canvasRef={previewCanvasRef}
                animatedImageRef={animatedImageRef}
                imageUrl={imageUrl}
                filterStyle={{ filter: filterUrls }} 
                overlayUrl={overlays[overlay]}
                flipHorizontal={transforms.flipHorizontal}
                flipVertical={transforms.flipVertical}
                imageDimensions={imageDimensions}
                isPaused={isPaused}
                isAnimated={isAnimated}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;