import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Camera, SwitchCamera } from 'lucide-react';

export default function CameraModal({ onCapture, onClose }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [error, setError] = useState(null);
    const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) or 'user' (front)
    const [isReady, setIsReady] = useState(false);

    // Store stream in ref to avoid dependency issues
    const streamRef = useRef(null);

    const startCamera = useCallback(async () => {
        try {
            setError(null);
            setIsReady(false);

            // Stop any existing stream
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }

            const constraints = {
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            };

            const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = mediaStream;
            setStream(mediaStream);

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error('Camera error:', err);
            setError(err.message || 'Could not access camera. Please allow camera permissions.');
        }
    }, [facingMode]);

    useEffect(() => {
        startCamera();

        return () => {
            // Cleanup: stop stream when modal closes
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        };
    }, [startCamera]);

    const handleVideoLoaded = () => {
        setIsReady(true);
    };

    const takePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to blob
        canvas.toBlob((blob) => {
            if (blob) {
                const file = new File([blob], `camera-capture-${Date.now()}.jpg`, {
                    type: 'image/jpeg',
                    lastModified: Date.now()
                });
                onCapture(file);
            }
        }, 'image/jpeg', 0.95);
    };

    const toggleCamera = () => {
        setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    };

    return (
        <div className="camera-modal-overlay" onClick={onClose}>
            <div className="camera-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="camera-modal-header">
                    <h3>Take Photo</h3>
                    <button className="btn-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="camera-preview-container">
                    {error ? (
                        <div className="camera-error">
                            <p>{error}</p>
                            <button className="btn btn-primary" onClick={startCamera}>
                                Retry
                            </button>
                        </div>
                    ) : (
                        <>
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                onLoadedMetadata={handleVideoLoaded}
                                className="camera-video"
                            />
                            <canvas ref={canvasRef} className="hidden-canvas" />

                            {!isReady && (
                                <div className="camera-loading">
                                    <div className="spinner"></div>
                                    <p>Starting camera...</p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="camera-controls">
                    <button
                        className="btn-camera-toggle"
                        onClick={toggleCamera}
                        disabled={!isReady || error}
                        title="Switch camera"
                    >
                        <SwitchCamera size={24} />
                    </button>

                    <button
                        className="btn-shutter"
                        onClick={takePhoto}
                        disabled={!isReady || error}
                    >
                        <Camera size={32} />
                    </button>

                    <div className="camera-placeholder" />
                </div>
            </div>
        </div>
    );
}
