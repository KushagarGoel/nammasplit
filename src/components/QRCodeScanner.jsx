import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Scan, SwitchCamera, Image as ImageIcon } from 'lucide-react';
import jsQR from 'jsqr';

export default function QRCodeScanner({ onScan, onClose }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const animationRef = useRef(null);
    const fileInputRef = useRef(null);
    const [error, setError] = useState(null);
    const [facingMode, setFacingMode] = useState('environment');
    const [isReady, setIsReady] = useState(false);
    const [scanning, setScanning] = useState(true);
    const [useImageMode, setUseImageMode] = useState(false);

    // Helper to get user media with support for legacy APIs
    const getUserMediaPromise = (constraints) => {
        // Modern Promise-based API
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            return navigator.mediaDevices.getUserMedia(constraints);
        }

        // Legacy callback-based API
        const legacyGetUserMedia = navigator.getUserMedia ||
                                   navigator.webkitGetUserMedia ||
                                   navigator.mozGetUserMedia;

        if (legacyGetUserMedia) {
            return new Promise((resolve, reject) => {
                legacyGetUserMedia.call(navigator, constraints, resolve, reject);
            });
        }

        return Promise.reject(new Error('getUserMedia not supported'));
    };

    const startCamera = useCallback(async () => {
        try {
            setError(null);
            setIsReady(false);

            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }

            const constraints = {
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            };

            const mediaStream = await getUserMediaPromise(constraints);
            streamRef.current = mediaStream;

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error('Camera error:', err);
            let errorMessage = 'Could not access camera.';
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                errorMessage = 'Camera permission denied. Please allow camera access in your browser settings.';
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                errorMessage = 'No camera found on this device.';
            } else if (err.name === 'NotReadableError') {
                errorMessage = 'Camera is already in use by another app.';
            } else if (err.name === 'NotSupportedError' || !navigator.mediaDevices) {
                errorMessage = 'Camera requires HTTPS (not HTTP). For local testing, use the gallery option or run: npx ngrok http 5173';
            } else if (err.message) {
                errorMessage = err.message;
            }
            setError(errorMessage);
        }
    }, [facingMode]);

    useEffect(() => {
        startCamera();

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [startCamera]);

    const scanFrame = useCallback(() => {
        if (!scanning || !videoRef.current || !canvasRef.current) {
            animationRef.current = requestAnimationFrame(scanFrame);
            return;
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert',
            });

            if (code) {
                // QR code found
                setScanning(false);
                onScan(code.data);
                return;
            }
        }

        animationRef.current = requestAnimationFrame(scanFrame);
    }, [scanning, onScan]);

    const handleVideoLoaded = () => {
        setIsReady(true);
        // Start scanning loop
        animationRef.current = requestAnimationFrame(scanFrame);
    };

    const toggleCamera = () => {
        setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    };

    const handleImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = canvasRef.current;
                if (!canvas) return;

                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: 'attemptBoth',
                });

                if (code) {
                    onScan(code.data);
                } else {
                    setError('No QR code found in image. Try another image or use camera.');
                }
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    const switchToImageMode = () => {
        setUseImageMode(true);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
            <div className="modal-content qr-scanner-modal" onClick={(e) => e.stopPropagation()} style={{
                maxWidth: '400px',
                width: '90%',
                padding: 0,
                overflow: 'hidden'
            }}>
                <div className="modal-header" style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            background: 'var(--primary-bg)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--primary)'
                        }}>
                            <Scan size={20} />
                        </div>
                        <h2 className="modal-title">Scan QR Code</h2>
                    </div>
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{
                    position: 'relative',
                    aspectRatio: '1',
                    background: '#000',
                    overflow: 'hidden'
                }}>
                    {useImageMode ? (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            padding: '24px',
                            textAlign: 'center',
                            background: 'var(--bg-secondary)'
                        }}>
                            <div style={{
                                width: 80,
                                height: 80,
                                borderRadius: '50%',
                                background: 'var(--primary-bg)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--primary)',
                                marginBottom: '16px'
                            }}>
                                <ImageIcon size={36} />
                            </div>
                            <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem' }}>Upload QR Code</h3>
                            <p style={{ color: 'var(--text-secondary)', margin: '0 0 20px', fontSize: '0.9rem' }}>
                                Select an image containing a QR code from your gallery
                            </p>
                            <button
                                className="btn btn-primary"
                                onClick={() => fileInputRef.current?.click()}
                                style={{ marginBottom: '12px' }}
                            >
                                Choose Image
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => {
                                    setUseImageMode(false);
                                    setError(null);
                                    startCamera();
                                }}
                            >
                                Try Camera Again
                            </button>
                            {error && (
                                <p style={{ color: 'var(--negative)', marginTop: '16px', fontSize: '0.85rem' }}>
                                    {error}
                                </p>
                            )}
                        </div>
                    ) : error ? (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            padding: '24px',
                            textAlign: 'center'
                        }}>
                            <p style={{ color: 'var(--negative)', marginBottom: '16px' }}>{error}</p>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                <button className="btn btn-primary" onClick={startCamera}>
                                    Retry Camera
                                </button>
                                <button className="btn btn-secondary" onClick={switchToImageMode}>
                                    Upload from Gallery
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                onLoadedMetadata={handleVideoLoaded}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover'
                                }}
                            />
                            <canvas ref={canvasRef} style={{ display: 'none' }} />

                            {/* QR Frame Overlay */}
                            <div style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: '200px',
                                height: '200px',
                                border: '2px solid rgba(255, 255, 255, 0.5)',
                                borderRadius: '12px',
                                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
                            }}>
                                {/* Corner markers */}
                                <div style={{
                                    position: 'absolute',
                                    top: -2,
                                    left: -2,
                                    width: 20,
                                    height: 20,
                                    borderTop: '4px solid var(--primary)',
                                    borderLeft: '4px solid var(--primary)',
                                    borderTopLeftRadius: 12
                                }} />
                                <div style={{
                                    position: 'absolute',
                                    top: -2,
                                    right: -2,
                                    width: 20,
                                    height: 20,
                                    borderTop: '4px solid var(--primary)',
                                    borderRight: '4px solid var(--primary)',
                                    borderTopRightRadius: 12
                                }} />
                                <div style={{
                                    position: 'absolute',
                                    bottom: -2,
                                    left: -2,
                                    width: 20,
                                    height: 20,
                                    borderBottom: '4px solid var(--primary)',
                                    borderLeft: '4px solid var(--primary)',
                                    borderBottomLeftRadius: 12
                                }} />
                                <div style={{
                                    position: 'absolute',
                                    bottom: -2,
                                    right: -2,
                                    width: 20,
                                    height: 20,
                                    borderBottom: '4px solid var(--primary)',
                                    borderRight: '4px solid var(--primary)',
                                    borderBottomRightRadius: 12
                                }} />

                                {/* Scanning line animation */}
                                <div style={{
                                    position: 'absolute',
                                    left: 0,
                                    right: 0,
                                    height: 2,
                                    background: 'var(--primary)',
                                    boxShadow: '0 0 8px var(--primary)',
                                    animation: 'scanLine 2s linear infinite'
                                }} />
                            </div>

                            {!isReady && (
                                <div style={{
                                    position: 'absolute',
                                    inset: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'rgba(0, 0, 0, 0.8)'
                                }}>
                                    <div className="spinner" />
                                    <p style={{ color: 'white', marginTop: 12 }}>Starting camera...</p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div style={{
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    background: 'var(--bg-secondary)',
                    flexWrap: 'wrap'
                }}>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            padding: '12px 16px',
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--bg-tertiary)',
                            color: 'var(--text-primary)',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.9rem',
                            fontWeight: 500
                        }}
                    >
                        <ImageIcon size={18} />
                        Gallery
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        style={{ display: 'none' }}
                    />
                    <button
                        onClick={toggleCamera}
                        disabled={!isReady || error}
                        style={{
                            padding: '12px 16px',
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--bg-tertiary)',
                            color: 'var(--text-primary)',
                            border: 'none',
                            cursor: isReady && !error ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.9rem',
                            fontWeight: 500,
                            opacity: isReady && !error ? 1 : 0.5
                        }}
                    >
                        <SwitchCamera size={20} />
                        Flip Camera
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes scanLine {
                    0% { top: 0; }
                    50% { top: 100%; }
                    100% { top: 0; }
                }
            `}</style>
        </div>
    );
}
