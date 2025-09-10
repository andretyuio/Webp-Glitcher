import React, { forwardRef, useRef, useEffect } from 'react';

interface ImagePreviewProps {
  imageUrl: string | null;
  filterStyle: React.CSSProperties;
  overlayUrl: string | null;
  flipHorizontal: boolean;
  flipVertical: boolean;
  imageDimensions: { width: number; height: number; } | null;
  isPaused: boolean;
  isAnimated: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  animatedImageRef: React.RefObject<HTMLImageElement>;
}

const ImagePreview = forwardRef<HTMLDivElement, ImagePreviewProps>(({ 
  imageUrl,
  filterStyle, 
  overlayUrl, 
  flipHorizontal, 
  flipVertical, 
  imageDimensions,
  isPaused,
  isAnimated,
  canvasRef,
  animatedImageRef,
}, ref) => {
  
  const transform = [
    flipHorizontal ? 'scaleX(-1)' : '',
    flipVertical ? 'scaleY(-1)' : '',
    'translateZ(0)' // Hack to promote element to its own GPU layer to prevent rendering bugs during screen capture
  ].join(' ').trim();

  const aspectRatio = imageDimensions 
    ? `${imageDimensions.width} / ${imageDimensions.height}` 
    : '1 / 1';

  // When paused, draw the current frame of the image to the canvas.
  useEffect(() => {
    const image = animatedImageRef.current;
    const canvas = canvasRef.current;
    if (!image || !canvas || !isAnimated || !imageDimensions) return;

    if (isPaused) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Ensure canvas has correct dimensions before drawing
        if (canvas.width !== imageDimensions.width || canvas.height !== imageDimensions.height) {
            canvas.width = imageDimensions.width;
            canvas.height = imageDimensions.height;
        }
        ctx.drawImage(image, 0, 0, imageDimensions.width, imageDimensions.height);
      }
    }
  }, [isPaused, isAnimated, imageDimensions, animatedImageRef, canvasRef]);


  const showImage = imageUrl && (!isAnimated || !isPaused);
  const showCanvas = imageUrl && isAnimated && isPaused;

  return (
    <div className="bg-gray-800 rounded-lg shadow-2xl p-4 sticky top-8">
      <div 
        className="relative bg-black/50 rounded-md grid place-items-center border-2 border-gray-700 overflow-hidden"
        style={{ aspectRatio }} 
        ref={ref}
      >
        {!imageUrl && (
          <div className="text-center text-gray-500 p-8">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="mt-4 font-semibold">Upload a WebP file to begin</p>
          </div>
        )}
        
        {imageUrl && (
            <>
                <img
                    ref={animatedImageRef}
                    src={imageUrl}
                    alt="WebP Preview"
                    className="absolute top-0 left-0 w-full h-full"
                    style={{
                        ...filterStyle,
                        transform,
                        imageRendering: 'pixelated',
                        visibility: showImage ? 'visible' : 'hidden',
                    }}
                />
                <canvas
                    ref={canvasRef}
                    className="absolute top-0 left-0 w-full h-full"
                    style={{
                        ...filterStyle,
                        transform,
                        imageRendering: 'pixelated',
                        visibility: showCanvas ? 'visible' : 'hidden',
                    }}
                />
            </>
        )}

        {overlayUrl && !isPaused && (
          <img 
            src={overlayUrl} 
            alt="Overlay" 
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
          />
        )}
      </div>
    </div>
  );
});

export default ImagePreview;
