import React, { forwardRef } from 'react';

interface ImagePreviewProps {
  imageUrl: string | null;
  filterStyle: React.CSSProperties;
  isCurved: boolean;
  overlayUrl: string | null;
  flipHorizontal: boolean;
  flipVertical: boolean;
  imageDimensions: { width: number; height: number; } | null;
}

const ImagePreview = forwardRef<HTMLDivElement, ImagePreviewProps>(({ imageUrl, filterStyle, isCurved, overlayUrl, flipHorizontal, flipVertical, imageDimensions }, ref) => {
  
  const transform = [
    flipHorizontal ? 'scaleX(-1)' : '',
    flipVertical ? 'scaleY(-1)' : ''
  ].join(' ').trim();

  const aspectRatio = imageDimensions 
    ? `${imageDimensions.width} / ${imageDimensions.height}` 
    : '1 / 1';

  return (
    <div className="bg-gray-800 rounded-lg shadow-2xl p-4 sticky top-8">
      <div 
        className={`relative bg-black/50 rounded-md grid place-items-center border-2 border-gray-700 ${isCurved ? 'overflow-hidden' : ''}`}
        style={{ aspectRatio }}
      >
        {imageUrl ? (
            <div 
              ref={ref}
              className="grid place-items-center [grid-template-areas:'preview'] max-w-full max-h-full" 
              style={{ transform, ...filterStyle }}
            >
              <img
                id="preview-image"
                src={imageUrl}
                alt="Corrupted preview"
                className="[grid-area:preview] max-w-full max-h-full object-contain"
              />
              {overlayUrl && (
                <img
                  src={overlayUrl}
                  alt="Effect overlay"
                  className="[grid-area:preview] w-full h-full object-fill pointer-events-none"
                />
              )}
            </div>
        ) : (
          <div className="text-center text-gray-500 p-8">
            <h3 className="text-2xl font-semibold">Image Preview</h3>
            <p className="mt-2">Upload an animated WebP file to begin.</p>
          </div>
        )}
      </div>
    </div>
  );
});

export default ImagePreview;