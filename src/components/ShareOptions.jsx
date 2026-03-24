import { useState } from 'react';
import { MessageCircle, Copy, Check, X, Share2, Mail, Link2 } from 'lucide-react';

// Detect iOS for iMessage
const isIOS = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

export function ShareOptions({ link, title, message, onClose }) {
    const [copied, setCopied] = useState(false);

    const shareText = `${message}\n\n${link}`;
    const encodedText = encodeURIComponent(shareText);
    const encodedLink = encodeURIComponent(link);

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            const textArea = document.createElement('textarea');
            textArea.value = link;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const shareViaWhatsApp = () => {
        const url = `https://wa.me/?text=${encodedText}`;
        window.open(url, '_blank');
    };

    const shareViaSMS = () => {
        let url;
        if (isIOS()) {
            // iOS iMessage
            url = `sms:&body=${encodedText}`;
        } else if (isAndroid()) {
            // Android SMS
            url = `sms:?body=${encodedText}`;
        } else {
            // Fallback - try generic SMS
            url = `sms:?body=${encodedText}`;
        }
        window.open(url, '_blank');
    };

    const shareViaEmail = () => {
        const subject = encodeURIComponent(title);
        const body = encodeURIComponent(shareText);
        const url = `mailto:?subject=${subject}&body=${body}`;
        window.open(url, '_blank');
    };

    const useNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title,
                    text: message,
                    url: link,
                });
            } catch (err) {
                // User cancelled or share failed
            }
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content share-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
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
                            <Share2 size={20} />
                        </div>
                        <h2 className="modal-title">Share Group Order</h2>
                    </div>
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <div className="modal-body">
                    <div style={{
                        padding: '16px',
                        background: 'var(--bg-tertiary)',
                        borderRadius: '12px',
                        marginBottom: '20px'
                    }}>
                        <p className="share-message" style={{ margin: 0 }}>{message}</p>
                    </div>

                    <div className="share-options-grid">
                        {/* WhatsApp */}
                        <button className="share-option-btn whatsapp" onClick={shareViaWhatsApp}>
                            <div className="share-icon-wrapper">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                </svg>
                            </div>
                            <span>WhatsApp</span>
                        </button>

                        {/* Messages/SMS */}
                        <button className="share-option-btn messages" onClick={shareViaSMS}>
                            <div className="share-icon-wrapper">
                                <MessageCircle size={28} />
                            </div>
                            <span>{isIOS() ? 'iMessage' : 'SMS'}</span>
                        </button>

                        {/* Email */}
                        <button className="share-option-btn email" onClick={shareViaEmail}>
                            <div className="share-icon-wrapper">
                                <Mail size={28} />
                            </div>
                            <span>Email</span>
                        </button>

                        {/* Copy Link */}
                        <button className="share-option-btn copy" onClick={copyToClipboard}>
                            <div className="share-icon-wrapper" style={{
                                background: copied ? 'var(--positive-bg)' : 'var(--bg-tertiary)',
                                color: copied ? 'var(--positive)' : 'var(--text-primary)'
                            }}>
                                {copied ? <Check size={28} /> : <Link2 size={28} />}
                            </div>
                            <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                        </button>
                    </div>

                    {/* Copy Link Section */}
                    <div className="share-copy-section">
                        <label style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'var(--text-tertiary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: '8px'
                        }}>Or copy link</label>
                        <div className="share-link-input">
                            <input
                                type="text"
                                className="form-input"
                                value={link}
                                readOnly
                                style={{
                                    fontSize: '0.8rem',
                                    background: 'var(--bg-tertiary)',
                                    border: '1px solid var(--border)'
                                }}
                            />
                            <button
                                className="btn btn-primary"
                                onClick={copyToClipboard}
                                style={{ padding: '10px 16px' }}
                            >
                                {copied ? <Check size={18} /> : <Copy size={18} />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ShareOptions;
