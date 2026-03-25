import { useEffect, useRef, useState } from 'react';
import { X, Copy, Check, MessageCircle, Mail } from 'lucide-react';
import QRCode from 'qrcode';
import { getInitials, getAvatarColor } from '../utils/helpers';
import logo from '../assets/logo.png';

// Detect iOS for iMessage
const isIOS = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};


export default function MyCodeModal({ user, inviteLink, onClose, showToast }) {
    const canvasRef = useRef(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (canvasRef.current && inviteLink) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            const size = 180;

            // Create a temporary canvas for the QR code
            const qrCanvas = document.createElement('canvas');

            QRCode.toCanvas(qrCanvas, inviteLink, {
                width: size,
                margin: 2,
                color: {
                    dark: '#059669',
                    light: '#FFFFFF'
                }
            }, (err) => {
                if (err) {
                    console.error('QR Code generation error:', err);
                    return;
                }

                // Clear main canvas
                canvas.width = size;
                canvas.height = size;
                ctx.clearRect(0, 0, size, size);

                // Draw QR code
                ctx.drawImage(qrCanvas, 0, 0);

                // Draw logo
                const logoSize = 40;
                const centerX = size / 2;
                const centerY = size / 2;

                // Draw white background circle
                ctx.beginPath();
                ctx.arc(centerX, centerY, logoSize / 2 + 4, 0, 2 * Math.PI);
                ctx.fillStyle = '#FFFFFF';
                ctx.fill();

                // Load and draw logo image (rounded)
                const logoImg = new Image();
                logoImg.crossOrigin = 'anonymous';
                logoImg.onload = () => {
                    const x = centerX - logoSize / 2;
                    const y = centerY - logoSize / 2;

                    // Create circular clipping path
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, logoSize / 2, 0, 2 * Math.PI);
                    ctx.closePath();
                    ctx.clip();

                    // Draw the image
                    ctx.drawImage(logoImg, x, y, logoSize, logoSize);
                    ctx.restore();
                };
                logoImg.onerror = () => {
                    // Fallback to initials if logo fails to load
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, logoSize / 2, 0, 2 * Math.PI);
                    ctx.fillStyle = '#059669';
                    ctx.fill();
                    ctx.font = 'bold 16px Inter, sans-serif';
                    ctx.fillStyle = '#FFFFFF';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('NS', centerX, centerY);
                };
                logoImg.src = logo;
            });
        }
    }, [inviteLink]);

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(inviteLink);
            setCopied(true);
            showToast('Invite link copied!');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            const textArea = document.createElement('textarea');
            textArea.value = inviteLink;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopied(true);
            showToast('Invite link copied!');
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const shareText = `Connect with me on Sangam to split expenses easily!\n\n${inviteLink}`;
    const encodedText = encodeURIComponent(shareText);

    const shareViaWhatsApp = () => {
        const url = `https://wa.me/?text=${encodedText}`;
        window.open(url, '_blank');
    };

    const shareViaSMS = () => {
        let url;
        if (isIOS()) {
            url = `sms:&body=${encodedText}`;
        } else {
            url = `sms:?body=${encodedText}`;
        }
        window.open(url, '_blank');
    };

    const shareViaEmail = () => {
        const subject = encodeURIComponent('Connect with me on Sangam');
        const body = encodeURIComponent(shareText);
        const url = `mailto:?subject=${subject}&body=${body}`;
        window.open(url, '_blank');
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
            <div className="modal-content my-code-modal" onClick={(e) => e.stopPropagation()} style={{
                maxWidth: '340px',
                width: '85%',
                maxHeight: '90vh',
                padding: 0,
                overflow: 'hidden',
                background: 'var(--bg-secondary)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '16px 20px 12px',
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
                    color: 'white'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        marginBottom: '4px'
                    }}>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'rgba(255, 255, 255, 0.2)',
                                border: 'none',
                                borderRadius: '50%',
                                width: 28,
                                height: 28,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: 'white'
                            }}
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* User Avatar */}
                    <div style={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        background: user?.avatar ? 'transparent' : getAvatarColor(user?.name || ''),
                        margin: '0 auto 8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                        fontWeight: 600,
                        overflow: 'hidden',
                        border: '3px solid rgba(255, 255, 255, 0.3)'
                    }}>
                        {user?.avatar ? (
                            <img
                                src={user.avatar}
                                alt={user.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            getInitials(user?.name || '')
                        )}
                    </div>

                    <h2 style={{
                        margin: 0,
                        fontSize: '1.1rem',
                        fontWeight: 600
                    }}>{user?.name}</h2>
                    <p style={{
                        margin: '2px 0 0',
                        opacity: 0.9,
                        fontSize: '0.8rem'
                    }}>Scan to connect</p>
                </div>

                {/* QR Code */}
                <div style={{
                    padding: '16px 20px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                }}>
                    <div style={{
                        background: 'white',
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-sm)',
                        marginBottom: '16px'
                    }}>
                        <canvas ref={canvasRef} style={{ width: '180px', height: '180px' }} />
                    </div>

                    <p style={{
                        textAlign: 'center',
                        color: 'var(--text-secondary)',
                        fontSize: '0.85rem',
                        margin: '0 0 20px',
                        lineHeight: 1.5
                    }}>
                        Scan this QR code with the Sangam app to add me as a friend
                    </p>

                    {/* Share Options Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '8px',
                        width: '100%'
                    }}>
                        {/* WhatsApp */}
                        <button
                            onClick={shareViaWhatsApp}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '10px 4px',
                                borderRadius: 'var(--radius-md)',
                                background: 'var(--bg-tertiary)',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-primary)'
                            }}
                        >
                            <div style={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                background: '#25D366',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white'
                            }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                </svg>
                            </div>
                            <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>WhatsApp</span>
                        </button>

                        {/* Messages/SMS */}
                        <button
                            onClick={shareViaSMS}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '10px 4px',
                                borderRadius: 'var(--radius-md)',
                                background: 'var(--bg-tertiary)',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-primary)'
                            }}
                        >
                            <div style={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                background: '#34C759',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white'
                            }}>
                                <MessageCircle size={20} />
                            </div>
                            <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>{isIOS() ? 'iMessage' : 'SMS'}</span>
                        </button>

                        {/* Email */}
                        <button
                            onClick={shareViaEmail}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '10px 4px',
                                borderRadius: 'var(--radius-md)',
                                background: 'var(--bg-tertiary)',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-primary)'
                            }}
                        >
                            <div style={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                background: '#EA4335',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white'
                            }}>
                                <Mail size={20} />
                            </div>
                            <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>Email</span>
                        </button>

                        {/* Copy Link */}
                        <button
                            onClick={copyLink}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '10px 4px',
                                borderRadius: 'var(--radius-md)',
                                background: copied ? 'var(--positive-bg)' : 'var(--bg-tertiary)',
                                border: 'none',
                                cursor: 'pointer',
                                color: copied ? 'var(--positive)' : 'var(--text-primary)'
                            }}
                        >
                            <div style={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                background: copied ? 'var(--positive)' : 'var(--primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white'
                            }}>
                                {copied ? <Check size={18} /> : <Copy size={18} />}
                            </div>
                            <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>{copied ? 'Copied!' : 'Copy'}</span>
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
