import { useState, useCallback, useRef } from 'react';
import saveAs from 'file-saver';

// New interface for the data needed to create the preview in a separate window
interface RecordingPreviewData {
    imageUrl: string | null;
    overlayUrl: string;
    svgFiltersHtml: string;
    filterStyle: string;
    transformStyle: string;
}

export const useScreenRecorder = (videoDuration: number) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingError, setRecordingError] = useState<string | null>(null);
    const [isTutorialVisible, setTutorialVisible] = useState(false);
    const previewDataRef = useRef<RecordingPreviewData | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const recordingTimeoutRef = useRef<number | null>(null);
    const previewWindowRef = useRef<Window | null>(null);
    const isStoppingRef = useRef(false);

    const stopRecording = useCallback(() => {
        if (isStoppingRef.current) return;
        isStoppingRef.current = true;

        if (recordingTimeoutRef.current) {
            clearTimeout(recordingTimeoutRef.current);
            recordingTimeoutRef.current = null;
        }
        
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop(); // This triggers the 'onstop' event for cleanup
        } else {
            // If the recorder isn't active, we might still need to clean up the stream/popup
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            if (previewWindowRef.current && !previewWindowRef.current.closed) {
                previewWindowRef.current.close();
                previewWindowRef.current = null;
            }
            setIsRecording(false); // Ensure state is reset
            isStoppingRef.current = false;
        }
    }, []);

    const startRecording = useCallback((previewData: RecordingPreviewData) => {
        if (!navigator.mediaDevices?.getDisplayMedia) {
            const message = "Your browser does not support the Screen Capture API, which is required for this tool to function. Please use a modern browser like Chrome, Firefox, or Edge.";
            setRecordingError(message);
            return;
        }
        previewDataRef.current = previewData;
        setRecordingError(null);
        setTutorialVisible(true);
    }, []);
    
    const cancelRecordingSetup = () => {
        setTutorialVisible(false);
        previewDataRef.current = null;
    };

    const proceedWithRecording = useCallback(async () => {
        setTutorialVisible(false);
        const previewData = previewDataRef.current;
        if (!previewData) {
            console.error("Recording was started without preview data.");
            setRecordingError("An internal error occurred. Please try again.");
            return;
        }

        if (videoDuration <= 0) {
            alert("Could not determine the animation's duration. Cannot start automatic recording.");
            return;
        }

        setIsRecording(true);

        const width = 800;
        const height = 600;
        const left = (window.screen.width / 2) - (width / 2);
        const top = (window.screen.height / 2) - (height / 2);
        
        const previewTab = window.open(
            '', 
            'Recording Preview', 
            `width=${width},height=${height},top=${top},left=${left},menubar=no,toolbar=no,location=no,status=no`
        );
        if (!previewTab) {
            setRecordingError("Popup window was blocked. Please allow popups for this site to record.");
            setIsRecording(false);
            return;
        }
        previewWindowRef.current = previewTab;

        const popupCloseCheck = setInterval(() => {
            if (previewTab.closed) {
                clearInterval(popupCloseCheck);
                stopRecording();
            }
        }, 500);

        try {
            previewTab.document.write(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <title>Recording Preview</title>
                    <style>
                        body { margin: 0; background-color: #000; overflow: hidden; }
                        #preview-container {
                            width: 100vw;
                            height: 100vh;
                            display: grid;
                            place-items: center;
                            grid-template-areas: 'preview';
                            will-change: transform, filter;
                        }
                        #preview-image, #preview-overlay {
                            grid-area: preview;
                            width: 100%;
                            height: 100%;
                            object-fit: cover;
                        }
                    </style>
                </head>
                <body>
                    <svg style="position: absolute; width: 0; height: 0;">
                        <defs id="svg-defs-container"></defs>
                    </svg>
                    <div id="preview-container">
                        <img id="preview-image" alt="Recording Preview" />
                        ${previewData.overlayUrl ? `<img id="preview-overlay" src="${previewData.overlayUrl}" alt="Overlay" />` : ''}
                    </div>
                </body>
                </html>
            `);
            previewTab.document.close();

            const imageContainer = previewTab.document.getElementById('preview-container') as HTMLDivElement;
            const imageEl = previewTab.document.getElementById('preview-image') as HTMLImageElement;
            const svgDefs = previewTab.document.getElementById('svg-defs-container') as unknown as SVGDefsElement;
            
            svgDefs.innerHTML = previewData.svgFiltersHtml;
            imageContainer.style.filter = previewData.filterStyle;
            imageContainer.style.transform = previewData.transformStyle;
            
            await new Promise<void>((resolve, reject) => {
                imageEl.onload = () => resolve();
                imageEl.onerror = () => reject(new Error("Image failed to load in the preview window."));
                if (previewData.imageUrl) {
                    imageEl.src = previewData.imageUrl;
                } else {
                    reject(new Error("No image URL provided for recording."));
                }
            });

            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { 
                    displaySurface: 'browser', 
                    frameRate: 30 
                },
            });
            streamRef.current = stream;

            const [videoTrack] = stream.getVideoTracks();
            if (!videoTrack) {
                throw new Error("Capture failed: No video track was found in the stream.");
            }
            
            videoTrack.onended = () => stopRecording();

            recordedChunksRef.current = [];
            let recorder: MediaRecorder;
            try {
              recorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
            } catch (e) {
              console.warn("VP9 codec not supported, falling back to default.", e);
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
                
                stream.getTracks().forEach(track => track.stop());
                streamRef.current = null;
                mediaRecorderRef.current = null;
                recordedChunksRef.current = [];
                setIsRecording(false);
                if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);
                if (previewWindowRef.current && !previewWindowRef.current.closed) previewWindowRef.current.close();
                previewWindowRef.current = null;
                clearInterval(popupCloseCheck);
                isStoppingRef.current = false;
            };

            recorder.start();
            isStoppingRef.current = false;

            recordingTimeoutRef.current = window.setTimeout(() => {
                stopRecording();
            }, (videoDuration * 1000) + 500);

        } catch (err: any) {
            console.error("Error starting element capture:", err);
            
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            if (previewWindowRef.current && !previewWindowRef.current.closed) {
                previewWindowRef.current.close();
            }
            previewWindowRef.current = null;
            clearInterval(popupCloseCheck);

            if (err.name === 'NotAllowedError') {
                setRecordingError("Permission to capture the screen was denied.");
            } else {
                setRecordingError(err.message || "An unexpected error occurred during recording setup.");
            }
            setIsRecording(false);
            isStoppingRef.current = false;
        }
    }, [videoDuration, stopRecording]);

    return {
        isRecording,
        recordingError,
        isTutorialVisible,
        startRecording,
        stopRecording,
        proceedWithRecording,
        cancelRecordingSetup,
    };
};