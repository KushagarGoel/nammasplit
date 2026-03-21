import { useState } from 'react';
import { MessageCircle, Copy, Check, X, Share2, Mail } from 'lucide-react';

// WhatsApp brand color
const WHATSAPP_COLOR = '#25D366';

// Detect iOS for iMessage
const isIOS = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

// Detect Android
const isAndroid = () => {
    return /Android/.test(navigator.userAgent);
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
                    <h2 className="modal-title">Share</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <div className="modal-body">
                    <p className="share-message">{message}</p>

                    <div className="share-options-grid">
                        {/* WhatsApp */}
                        <button
                            className="share-option-btn whatsapp"
                            onClick={shareViaWhatsApp}
                            style={{ '--share-color': WHATSAPP_COLOR }}
                        >
                            <div className="share-icon-wrapper">
                                <MessageCircle size={24} fill="currentColor" />
                            </div>
                            <span>WhatsApp</span>
                        </button>

                        {/* Messages/SMS */}
                        <button
                            className="share-option-btn messages"
                            onClick={shareViaSMS}
                        >
                            <div className="share-icon-wrapper">
                                <MessageCircle size={24} />
                            </div>
                            <span>{isIOS() ? 'iMessage' : 'SMS'}</span>
                        </button>

                        {/* Email */}
                        <button
                            className="share-option-btn email"
                            onClick={shareViaEmail}
                        >
                            <div className="share-icon-wrapper">
                                <Mail size={24} />
                            </div>
                            <span>Email</span>
                        </button>

                        {/* Native Share (mobile) */}
                        {navigator.share && (
                            <button
                                className="share-option-btn native"
                                onClick={useNativeShare}
                            >
                                <div className="share-icon-wrapper">
                                    <Share2 size={24} />
                                </div>
                                <span>More Options</span>
                            </button>
                        )}
                    </div>

                    {/* Copy Link Section */}
                    <div className="share-copy-section">
                        <div className="share-link-input">
                            <input
                                type="text"
                                className="form-input"
                                value={link}
                                readOnly
                            />
                            <button
                                className="btn btn-secondary"
                                onClick={copyToClipboard}
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
