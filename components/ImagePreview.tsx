import React from 'react';

interface ImagePreviewProps {
  imageUrl: string | null;
  filterStyle: React.CSSProperties;
  isCurved: boolean;
  overlayUrl: string | null;
  flipHorizontal: boolean;
  flipVertical: boolean;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ imageUrl, filterStyle, isCurved, overlayUrl, flipHorizontal, flipVertical }) => {
  
  const transform = [
    flipHorizontal ? 'scaleX(-1)' : '',
    flipVertical ? 'scaleY(-1)' : ''
  ].join(' ').trim();

  return (
    <div className="bg-gray-800 rounded-lg shadow-2xl p-4 sticky top-8">
      <div className={`relative bg-black/50 rounded-md grid place-items-center border-2 border-gray-700 ${isCurved ? 'overflow-hidden' : ''}`}>
        {imageUrl ? (
            <div className="relative inline-block max-w-full max-h-full" style={{ transform, lineHeight: 0 /* Prevents extra space below inline-block image */ }}>
              <img
                id="preview-image"
                src={imageUrl}
                alt="Corrupted preview"
                className="max-w-full max-h-full object-contain"
                style={filterStyle}
              />
              {overlayUrl && (
                <img
                  src={overlayUrl}
                  alt="Effect overlay"
                  className="absolute top-0 left-0 w-full h-full pointer-events-none"
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
};

export default ImagePreview;
