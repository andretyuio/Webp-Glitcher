import { useState, useCallback, useEffect } from 'react';

type LoadingStatus = 'idle' | 'loading' | 'ready' | 'error';

// --- Start of WebP Parsing Utilities ---

interface WebPInfo {
  duration: number; // in seconds
  width: number;
  height: number;
}

// Helper to read a 24-bit little-endian integer
function getUint24(dataView: DataView, offset: number): number {
  const b1 = dataView.getUint8(offset);
  const b2 = dataView.getUint8(offset + 1);
  const b3 = dataView.getUint8(offset + 2);
  return b1 | (b2 << 8) | (b3 << 16);
}

// Helper to read 4-char string
function readFourCC(dataView: DataView, offset: number): string {
    let str = '';
    for (let i = 0; i < 4; i++) {
        str += String.fromCharCode(dataView.getUint8(offset + i));
    }
    return str;
}


function getWebPInfo(file: File): Promise<WebPInfo> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        if (!buffer) {
          throw new Error('Failed to read file buffer.');
        }
        const dataView = new DataView(buffer);

        if (readFourCC(dataView, 0) !== 'RIFF' || readFourCC(dataView, 8) !== 'WEBP') {
          throw new Error('Not a valid WebP file (missing RIFF/WEBP header).');
        }

        let totalDuration = 0;
        let width = 0;
        let height = 0;
        let hasAnimChunk = false;
        let offset = 12;

        while (offset < dataView.byteLength) {
          const chunkId = readFourCC(dataView, offset);
          const chunkSize = dataView.getUint32(offset + 4, true);
          const chunkOffset = offset + 8;
          
          if (chunkId === 'VP8X') {
            width = 1 + getUint24(dataView, chunkOffset + 4);
            height = 1 + getUint24(dataView, chunkOffset + 7);
          } else if (chunkId === 'ANIM') {
            hasAnimChunk = true;
          } else if (chunkId === 'ANMF') {
            // Frame Duration (3 bytes LE) is at offset 12 inside the ANMF chunk data
            const frameDuration = getUint24(dataView, chunkOffset + 12);
            totalDuration += frameDuration;
          }
          
          // Move to the next chunk. Add 1 for padding if chunk size is odd.
          offset += 8 + chunkSize + (chunkSize % 2);
        }
        
        if (!hasAnimChunk && totalDuration === 0) {
            throw new Error('Not an animated WebP file (missing ANIM chunk or frame data).');
        }
        
        if (width === 0 || height === 0) {
             throw new Error('Could not determine image dimensions. File may be a simple (non-extended) WebP animation, which is not supported for analysis.');
        }

        resolve({
          duration: totalDuration / 1000,
          width,
          height,
        });

      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Error reading file.'));
    };

    reader.readAsArrayBuffer(file);
  });
}

// --- End of WebP Parsing Utilities ---

export const useWebPAnalyzer = (file: File | null) => {
  const [loadingStatus, setLoadingStatus] = useState<LoadingStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [imageDimensions, setImageDimensions] = useState<{width: number, height: number} | null>(null);

  const analyzeFile = useCallback(async (fileToAnalyze: File) => {
    if (!fileToAnalyze) {
      return;
    }

    setLoadingStatus('loading');
    setErrorMessage(null);
    setVideoDuration(0);
    setImageDimensions(null);

    try {
      const { duration, width, height } = await getWebPInfo(fileToAnalyze);
      
      if (duration <= 0) {
        throw new Error('Animation duration could not be determined or is zero.');
      }

      setVideoDuration(duration);
      setImageDimensions({ width, height });
      setLoadingStatus('ready');
    } catch (error: any) {
      console.error("WebP Analysis Error:", error);
      setLoadingStatus('error');
      const userMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      setErrorMessage(`Analysis failed: ${userMessage} Please try a different file.`);
    }
  }, []);

  useEffect(() => {
    if (file) {
      analyzeFile(file);
    } else {
      setLoadingStatus('idle');
      setVideoDuration(0);
      setImageDimensions(null);
      setErrorMessage(null);
    }
  }, [file, analyzeFile]);

  const handleRetry = useCallback(() => {
    if (file) {
      analyzeFile(file);
    }
  }, [file, analyzeFile]);

  return {
      loadingStatus,
      errorMessage,
      videoDuration,
      imageDimensions,
      handleRetry,
      analyzerElement: null,
  }
};