import { useState, useCallback, useRef, RefObject } from 'react';
import saveAs from 'file-saver';

export const useScreenRecorder = (
    previewRef: RefObject<HTMLDivElement>, 
    videoDuration: number
) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingError, setRecordingError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const recordingTimeoutRef = useRef<number | null>(null);

    const stopRecording = useCallback(() => {
        if (recordingTimeoutRef.current) {
            clearTimeout(recordingTimeoutRef.current);
            recordingTimeoutRef.current = null;
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }, []);

    const startRecording = useCallback(async () => {
        if (videoDuration <= 0) {
            alert("Could not determine the animation's duration. Cannot start automatic recording.");
            return;
        }

        if (!navigator.mediaDevices?.getDisplayMedia) {
            const message = "Your browser does not support the Screen Capture API, which is required for this tool to function. Please use a modern browser like Chrome, Firefox, or Edge.";
            setRecordingError(message);
            return;
        }
        
        setRecordingError(null);

        // Reset the animation to the beginning by reloading the image source
        const imgElement = document.getElementById('preview-image') as HTMLImageElement;
        if (imgElement) {
            imgElement.src = imgElement.src;
        }

        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { frameRate: 30 },
                // @ts-ignore - preferCurrentTab is a non-standard hint for browsers that support it.
                preferCurrentTab: true,
            });
            streamRef.current = stream;

            const [videoTrack] = stream.getVideoTracks();
            if (!videoTrack) {
                throw new Error("Capture failed: No video track was found in the stream.");
            }
            
            // If user stops sharing via browser UI, stop our recording process.
            videoTrack.onended = () => stopRecording();

            // Attempt to crop the video to the preview element (Region Capture).
            // This is an experimental feature, works in recent Chrome versions.
            // @ts-ignore
            if (window.CropTarget && typeof videoTrack.cropTo === 'function' && previewRef.current) {
                try {
                    // @ts-ignore
                    const cropTarget = await CropTarget.fromElement(previewRef.current);
                    // @ts-ignore
                    await videoTrack.cropTo(cropTarget);
                } catch (e) {
                    console.warn("Region Capture failed. Recording full tab. Error:", e);
                }
            } else {
                console.log("Region Capture not supported. Recording full tab.");
            }

            setIsRecording(true);
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
                
                // Final state cleanup
                streamRef.current = null;
                mediaRecorderRef.current = null;
                recordedChunksRef.current = [];
                setIsRecording(false);
                if (recordingTimeoutRef.current) {
                    clearTimeout(recordingTimeoutRef.current);
                    recordingTimeoutRef.current = null;
                }
            };

            recorder.start();

            // Automatically stop recording after one loop of the animation + a small buffer
            recordingTimeoutRef.current = window.setTimeout(() => {
                stopRecording();
            }, (videoDuration * 1000) + 200);

        } catch (err: any) {
            console.error("Error starting element capture:", err);
            
            // Ensure stream is stopped if it was created before the error
            if(streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }

            if(err.name === 'NotAllowedError') {
                setRecordingError("Permission to capture the screen was denied.");
            } else {
                const message = err.message || "An unexpected error occurred during recording setup.";
                setRecordingError(message);
            }
            setIsRecording(false);
        }
    }, [videoDuration, previewRef, stopRecording]);

    return {
        isRecording,
        recordingError,
        startRecording,
        stopRecording,
    }
};
