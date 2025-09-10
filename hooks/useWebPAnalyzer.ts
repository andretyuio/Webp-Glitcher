import { useState, useCallback, useEffect } from 'react';
import { WebPData, WebPFrame } from '../types';

type LoadingStatus = 'idle' | 'loading' | 'ready' | 'error';

// --- Start of WebP Parsing Utilities ---

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

// Helper to parse dimensions from a VP8 or VP8L chunk's payload
function getCanvasDimensions(dataView: DataView, chunkId: string, payloadOffset: number): { width: number; height: number } | null {
    if (chunkId === 'VP8 ') {
        // VP8 (lossy) bitstream. See RFC 6386.
        const isKeyframe = (dataView.getUint8(payloadOffset) & 0x01) === 0;

        if (isKeyframe) {
            const syncCodeOK = dataView.getUint8(payloadOffset + 3) === 0x9d &&
                             dataView.getUint8(payloadOffset + 4) === 0x01 &&
                             dataView.getUint8(payloadOffset + 5) === 0x2a;
            
            if (syncCodeOK) {
                const width = dataView.getUint16(payloadOffset + 6, true) & 0x3fff;
                const height = dataView.getUint16(payloadOffset + 8, true) & 0x3fff;
                return { width, height };
            }
        }
    } else if (chunkId === 'VP8L') {
        // VP8L (lossless) bitstream. See WebP Lossless Bitstream Specification.
        if (dataView.getUint8(payloadOffset) === 0x2f) {
            const b1 = dataView.getUint8(payloadOffset + 1);
            const b2 = dataView.getUint8(payloadOffset + 2);
            const b3 = dataView.getUint8(payloadOffset + 3);
            const b4 = dataView.getUint8(payloadOffset + 4);
            const width = 1 + (((b2 & 0x3F) << 8) | b1);
            const height = 1 + (((b4 & 0x0F) << 10) | (b3 << 2) | ((b2 & 0xC0) >> 6));
            return { width, height };
        }
    }
    return null;
}


function parseWebP(file: File): Promise<WebPData & { totalDuration: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        if (!buffer) throw new Error('Failed to read file buffer.');
        if (buffer.byteLength < 12) throw new Error('File is too small to be a valid WebP.');
        
        const dataView = new DataView(buffer);
        if (readFourCC(dataView, 0) !== 'RIFF') {
          throw new Error('Invalid file format. This does not appear to be a WebP file (missing RIFF header).');
        }
        if (readFourCC(dataView, 8) !== 'WEBP') {
          throw new Error('Invalid RIFF file. Expected "WEBP" identifier.');
        }

        const frames: WebPFrame[] = [];
        let width = 0, height = 0, loopCount = 0, bgColor = 0xFFFFFFFF, vp8xFlags = 0;
        let isAnimated = false;
        let totalDuration = 0;
        let offset = 12;
        let hasFoundImageChunk = false;

        while (offset < dataView.byteLength) {
          if (offset + 8 > dataView.byteLength) {
            throw new Error('File appears to be corrupt. Encountered an unexpected end of file while reading a chunk header.');
          }
          const chunkId = readFourCC(dataView, offset);
          const chunkSize = dataView.getUint32(offset + 4, true);
          const chunkOffset = offset + 8;
          const paddedChunkSize = (chunkSize % 2 === 1) ? chunkSize + 1 : chunkSize;
          if (chunkOffset + paddedChunkSize > dataView.byteLength) {
            throw new Error(`File appears to be corrupt. The '${chunkId}' chunk size is larger than the remaining file.`);
          }
          
          switch (chunkId) {
            case 'VP8X':
              vp8xFlags = dataView.getUint8(chunkOffset);
              isAnimated = (vp8xFlags & 0x02) !== 0;
              width = 1 + getUint24(dataView, chunkOffset + 4);
              height = 1 + getUint24(dataView, chunkOffset + 7);
              break;
            case 'ANIM':
              bgColor = dataView.getUint32(chunkOffset, true);
              loopCount = dataView.getUint16(chunkOffset + 4, true);
              break;
            case 'ANMF':
              hasFoundImageChunk = true;
              const frameX = getUint24(dataView, chunkOffset) * 2;
              const frameY = getUint24(dataView, chunkOffset + 3) * 2;
              const frameWidth = 1 + getUint24(dataView, chunkOffset + 6);
              const frameHeight = 1 + getUint24(dataView, chunkOffset + 9);
              const frameDuration = getUint24(dataView, chunkOffset + 12);
              const flags = dataView.getUint8(chunkOffset + 15);
              
              totalDuration += frameDuration;
              
              frames.push({
                  duration: frameDuration,
                  x: frameX,
                  y: frameY,
                  width: frameWidth,
                  height: frameHeight,
                  dispose: (flags & 1) === 1,
                  blend: (flags & 2) === 0,
              });
              break;
            case 'VP8 ':
            case 'VP8L':
               hasFoundImageChunk = true;
               if (frames.length === 0) { 
                    const dims = getCanvasDimensions(dataView, chunkId, chunkOffset);
                    if (dims) {
                        width = dims.width;
                        height = dims.height;
                    }
               }
               break;
          }
          
          offset += 8 + paddedChunkSize;
        }
        
        if (isAnimated && frames.length === 0) {
            throw new Error('Invalid animated WebP. The file is marked as animated but contains no animation frames (ANMF chunks).');
        }
        if (!hasFoundImageChunk) {
            throw new Error('No valid image data found in the file. It may be an unsupported format (e.g., WebP extended format without image payload).');
        }
        if (width === 0 || height === 0) {
             throw new Error('Could not determine image dimensions. The file may be corrupt, missing critical headers (like VP8X), or its primary image data is unreadable.');
        }

        resolve({ width, height, loopCount, bgColor, frames, totalDuration: totalDuration / 1000 });

      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Error reading file.'));
    reader.readAsArrayBuffer(file);
  });
}

// --- End of WebP Parsing Utilities ---

export const useWebPAnalyzer = (file: File | null) => {
  const [loadingStatus, setLoadingStatus] = useState<LoadingStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [imageDimensions, setImageDimensions] = useState<{width: number, height: number} | null>(null);
  const [webpData, setWebpData] = useState<WebPData | null>(null);

  const analyzeFile = useCallback(async (fileToAnalyze: File) => {
    if (!fileToAnalyze) return;

    setLoadingStatus('loading');
    setErrorMessage(null);
    setVideoDuration(0);
    setImageDimensions(null);
    setWebpData(null);

    try {
      const { totalDuration, ...data } = await parseWebP(fileToAnalyze);
      
      setVideoDuration(totalDuration);
      setImageDimensions({ width: data.width, height: data.height });
      setWebpData(data);
      setLoadingStatus('ready');
    } catch (error: any) {
      console.error("WebP Analysis Error:", error);
      setLoadingStatus('error');
      const userMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      setErrorMessage(`${userMessage} Please try a different file.`);
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
      setWebpData(null);
    }
  }, [file, analyzeFile]);

  const handleRetry = useCallback(() => {
    if (file) analyzeFile(file);
  }, [file, analyzeFile]);

  return {
      loadingStatus,
      errorMessage,
      videoDuration,
      imageDimensions,
      webpData,
      handleRetry,
  }
};
