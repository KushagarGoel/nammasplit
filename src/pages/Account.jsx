import { Moon, Sun, IndianRupee, LogOut, Check, X, Edit2, QrCode, Camera, ScanLine, User } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getInitials, getAvatarColor } from '../utils/helpers';
import { useState, useEffect, useRef } from 'react';
import QRCodeScanner from '../components/QRCodeScanner';
import MyCodeModal from '../components/MyCodeModal';
import { createInviteToken, getInviteToken, addFriendLink, useInviteToken } from '../data/firestore';

export default function Account() {
    const { currentUser, friends, groups, expenses, showToast } = useApp();
    const { logout, user, updateUserProfile, userProfile } = useAuth();
    const { theme, toggleTheme, isDark } = useTheme();
    const [logouting, setLogouting] = useState(false);
    const [upiId, setUpiId] = useState(userProfile?.upiId || '');
    const [isEditingUpi, setIsEditingUpi] = useState(false);
    const [savingUpi, setSavingUpi] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState(userProfile?.avatar || null);
    const fileInputRef = useRef(null);

    // Name editing state
    const [name, setName] = useState(userProfile?.name || '');
    const [isEditingName, setIsEditingName] = useState(false);
    const [savingName, setSavingName] = useState(false);

    // QR Code scanning state
    const [showScanner, setShowScanner] = useState(false);
    const [showMyCode, setShowMyCode] = useState(false);
    const [inviteLink, setInviteLink] = useState('');
    const [processingScan, setProcessingScan] = useState(false);

    // Sync upiId, avatar, and name with userProfile when it changes
    useEffect(() => {
        setUpiId(userProfile?.upiId || '');
        setAvatarPreview(userProfile?.avatar || null);
        setName(userProfile?.name || '');
    }, [userProfile?.upiId, userProfile?.avatar, userProfile?.name]);

    const handleSaveName = async () => {
        if (!name.trim()) {
            showToast('Name cannot be empty');
            return;
        }
        setSavingName(true);
        try {
            await updateUserProfile({ name: name.trim() });
            setIsEditingName(false);
            showToast('Name updated successfully');
        } catch (err) {
            console.error('Failed to save name:', err);
            showToast('Failed to save name');
        }
        setSavingName(false);
    };

    const handleCancelName = () => {
        setName(userProfile?.name || '');
        setIsEditingName(false);
    };

    // QR Code scanning handlers
    const handleScan = async (qrData) => {
        if (processingScan) return;
        setProcessingScan(true);

        try {
            // Extract token from QR data (expecting a URL like /invite/{token})
            let token = qrData;
            if (qrData.includes('/invite/')) {
                token = qrData.split('/invite/').pop().split('/').shift();
            }

            if (!token) {
                showToast('Invalid QR code');
                setProcessingScan(false);
                setShowScanner(false);
                return;
            }

            // Validate the token
            const tokenData = await getInviteToken(token);

            if (!tokenData) {
                showToast('Invalid invite link');
            } else if (tokenData.usedBy) {
                showToast('This invite link has already been used');
            } else if (new Date(tokenData.expiresAt) < new Date()) {
                showToast('This invite link has expired');
            } else if (tokenData.userId === userProfile?.id) {
                showToast('You cannot use your own invite link');
            } else {
                // Check if already friends
                const isAlreadyFriend = friends.some(f => f.id === tokenData.userId);
                if (isAlreadyFriend) {
                    showToast('You are already friends!');
                    setShowScanner(false);
                    setProcessingScan(false);
                    return;
                }

                // Process the invite - create bidirectional friend links
                await addFriendLink(tokenData.userId, userProfile.id);
                await addFriendLink(userProfile.id, tokenData.userId);
                await useInviteToken(token, userProfile.id);

                showToast('Friend added successfully!');
                setShowScanner(false);
            }
        } catch (err) {
            console.error('Error processing QR scan:', err);
            showToast('Failed to process QR code');
        }
        setProcessingScan(false);
    };

    const handleShowMyCode = async () => {
        try {
            const token = await createInviteToken(currentUser.id);
            const link = `${window.location.origin}/invite/${token}`;
            setInviteLink(link);
            setShowMyCode(true);
        } catch (err) {
            console.error('Failed to generate invite link:', err);
            showToast('Failed to generate QR code');
        }
    };

    const handleLogout = async () => {
        setLogouting(true);
        await logout();
    };

    const handleSaveUpi = async () => {
        setSavingUpi(true);
        try {
            await updateUserProfile({ upiId: upiId.trim() || null });
            setIsEditingUpi(false);
            showToast('UPI ID saved successfully');
        } catch (err) {
            console.error('Failed to save UPI ID:', err);
            showToast('Failed to save UPI ID');
        }
        setSavingUpi(false);
    };

    const handleCancelUpi = () => {
        setUpiId(userProfile?.upiId || '');
        setIsEditingUpi(false);
    };

    const handleCopyUpi = async () => {
        if (!userProfile?.upiId) return;
        try {
            await navigator.clipboard.writeText(userProfile.upiId);
            showToast('UPI ID copied to clipboard');
        } catch (err) {
            showToast('Failed to copy UPI ID');
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            showToast('Please select an image file');
            return;
        }

        // Validate file size (max 2MB before resize)
        if (file.size > 2 * 1024 * 1024) {
            showToast('Image must be less than 5MB');
            return;
        }

        try {
            // Resize and compress image before uploading
            const resizedImage = await resizeImage(file, 200, 200, 0.8);
            setAvatarPreview(resizedImage);
            await updateUserProfile({ avatar: resizedImage });
            showToast('Profile photo updated');
        } catch (err) {
            console.error('Error processing image:', err);
            showToast('Failed to update profile photo');
        }
    };

    // Resize image to reduce file size for Firestore storage
    const resizeImage = (file, maxWidth, maxHeight, quality) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;

                // Calculate new dimensions while maintaining aspect ratio
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                // Create canvas and draw resized image
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to base64 with compression
                const resizedBase64 = canvas.toDataURL('image/jpeg', quality);
                resolve(resizedBase64);
            };
            img.onerror = reject;

            const reader = new FileReader();
            reader.onload = (e) => { img.src = e.target.result; };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    return (
        <div>
            {/* Profile Header */}
            <div className="account-header">
                {/* Avatar with gradient ring */}
                <div className="avatar-profile" onClick={handleAvatarClick} style={{ cursor: 'pointer' }}>
                    <div className="avatar-profile-inner" style={{ color: getAvatarColor(currentUser.name) }}>
                        {avatarPreview ? (
                            <img
                                src={avatarPreview}
                                alt={currentUser.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                            />
                        ) : (
                            getInitials(currentUser.name)
                        )}
                    </div>
                    <div className="avatar-profile-edit">
                        <Camera size={16} />
                    </div>
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />

                {isEditingName ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your name"
                            style={{
                                padding: '10px 14px',
                                border: '1.5px solid var(--primary)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '1rem',
                                width: '200px',
                                outline: 'none',
                                background: 'var(--bg-tertiary)',
                                color: 'var(--text-primary)',
                                fontWeight: 600
                            }}
                            autoFocus
                        />
                        <button
                            onClick={handleSaveName}
                            disabled={savingName}
                            style={{
                                padding: '10px',
                                borderRadius: 'var(--radius-sm)',
                                background: 'var(--positive-bg)',
                                color: 'var(--positive)',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            <Check size={18} />
                        </button>
                        <button
                            onClick={handleCancelName}
                            style={{
                                padding: '10px',
                                borderRadius: 'var(--radius-sm)',
                                background: 'var(--negative-bg)',
                                color: 'var(--negative)',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            <X size={18} />
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
                        <h2 className="account-name" style={{ margin: 0 }}>{currentUser.name}</h2>
                        <button
                            onClick={() => setIsEditingName(true)}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px',
                                color: 'var(--text-tertiary)',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                            title="Edit name"
                        >
                            <Edit2 size={16} />
                        </button>
                    </div>
                )}
                <p className="account-email">{currentUser.email}</p>
            </div>

            {/* Stats Row */}
            <div className="stats-row">
                <div className="stat-item">
                    <div className="stat-value">{friends.length}</div>
                    <div className="stat-label">Friends</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value">{groups.length}</div>
                    <div className="stat-label">Groups</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value">{expenses.length}</div>
                    <div className="stat-label">Expenses</div>
                </div>
            </div>

            {/* Account Settings */}
            <div className="section">
                <h3 className="settings-section-title">Account Settings</h3>

                {/* Currency */}
                <div className="settings-item">
                    <div className="settings-item-left">
                        <div className="settings-item-icon">
                            <IndianRupee size={22} />
                        </div>
                        <div className="settings-item-content">
                            <div className="settings-item-label">Currency</div>
                            <div className="settings-item-value">Indian Rupee (₹)</div>
                        </div>
                    </div>
                </div>

                {/* Theme Toggle */}
                <div className="settings-item">
                    <div className="settings-item-left">
                        <div className="settings-item-icon">
                            {isDark ? <Moon size={22} /> : <Sun size={22} />}
                        </div>
                        <div className="settings-item-content">
                            <div className="settings-item-label">Theme</div>
                            <div className="settings-item-value">{isDark ? 'Dark' : 'Light'}</div>
                        </div>
                    </div>
                    <button
                        className={`toggle-switch ${isDark ? 'active' : ''}`}
                        onClick={toggleTheme}
                        aria-label="Toggle theme"
                        type="button"
                    />
                </div>

                {/* Scan Code */}
                <div className="settings-item">
                    <div className="settings-item-left">
                        <div className="settings-item-icon">
                            <ScanLine size={22} />
                        </div>
                        <div className="settings-item-content">
                            <div className="settings-item-label">Scan Code</div>
                            <div className="settings-item-value">Scan QR code to add friends</div>
                        </div>
                    </div>
                    <div className="settings-item-action">
                        <button
                            className="btn btn-sm"
                            onClick={() => setShowScanner(true)}
                            style={{
                                padding: '6px 16px',
                                fontSize: '0.8rem',
                                background: 'var(--primary-bg)',
                                color: 'var(--primary)',
                                borderRadius: 'var(--radius-full)',
                                fontWeight: 600
                            }}
                        >
                            Scan
                        </button>
                    </div>
                </div>

                {/* My Code */}
                <div className="settings-item">
                    <div className="settings-item-left">
                        <div className="settings-item-icon">
                            <QrCode size={22} />
                        </div>
                        <div className="settings-item-content">
                            <div className="settings-item-label">My Code</div>
                            <div className="settings-item-value">Show your QR code to friends</div>
                        </div>
                    </div>
                    <div className="settings-item-action">
                        <button
                            className="btn btn-sm"
                            onClick={handleShowMyCode}
                            style={{
                                padding: '6px 16px',
                                fontSize: '0.8rem',
                                background: 'var(--primary-bg)',
                                color: 'var(--primary)',
                                borderRadius: 'var(--radius-full)',
                                fontWeight: 600
                            }}
                        >
                            Show
                        </button>
                    </div>
                </div>

                {/* UPI ID */}
                <div className="settings-item">
                    <div className="settings-item-left">
                        <div className="settings-item-icon">
                            <IndianRupee size={22} />
                        </div>
                        <div className="settings-item-content">
                            <div className="settings-item-label">UPI ID</div>
                            {isEditingUpi ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                                    <input
                                        type="text"
                                        value={upiId}
                                        onChange={(e) => setUpiId(e.target.value)}
                                        placeholder="yourname@upi"
                                        style={{
                                            padding: '8px 12px',
                                            border: '1.5px solid var(--primary)',
                                            borderRadius: 'var(--radius-sm)',
                                            fontSize: '0.9rem',
                                            width: '180px',
                                            outline: 'none',
                                            background: 'var(--bg-tertiary)',
                                            color: 'var(--text-primary)'
                                        }}
                                        autoFocus
                                    />
                                    <button
                                        onClick={handleSaveUpi}
                                        disabled={savingUpi}
                                        style={{
                                            padding: '8px',
                                            borderRadius: 'var(--radius-sm)',
                                            background: 'var(--positive-bg)',
                                            color: 'var(--positive)',
                                            border: 'none',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <Check size={18} />
                                    </button>
                                    <button
                                        onClick={handleCancelUpi}
                                        style={{
                                            padding: '8px',
                                            borderRadius: 'var(--radius-sm)',
                                            background: 'var(--negative-bg)',
                                            color: 'var(--negative)',
                                            border: 'none',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            ) : (
                                <div className="settings-item-value">
                                    {userProfile?.upiId || 'Not set'}
                                </div>
                            )}
                        </div>
                    </div>
                    {!isEditingUpi && (
                        <div className="settings-item-action">
                            {userProfile?.upiId && (
                                <button
                                    className="btn btn-sm btn-secondary"
                                    onClick={handleCopyUpi}
                                    style={{ marginRight: '8px' }}
                                >
                                    Copy
                                </button>
                            )}
                            <button
                                className="btn btn-sm"
                                onClick={() => setIsEditingUpi(true)}
                                style={{
                                    padding: '6px 16px',
                                    fontSize: '0.8rem',
                                    background: 'var(--primary-bg)',
                                    color: 'var(--primary)',
                                    borderRadius: 'var(--radius-full)',
                                    fontWeight: 600
                                }}
                            >
                                {userProfile?.upiId ? 'Edit' : 'Add'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Logout */}
            <div className="section" style={{ marginTop: 'var(--space-xl)' }}>
                <button
                    className="btn btn-danger btn-full"
                    onClick={handleLogout}
                    disabled={logouting}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px'
                    }}
                >
                    {logouting ? 'Logging out...' : 'Log Out'}
                </button>
            </div>

            {/* App Version */}
            <div style={{ textAlign: 'center', marginTop: 'var(--space-xl)' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    Sangam v2.4.0
                </p>
            </div>

            {/* QR Scanner Modal */}
            {showScanner && (
                <QRCodeScanner
                    onScan={handleScan}
                    onClose={() => setShowScanner(false)}
                />
            )}

            {/* My Code Modal */}
            {showMyCode && (
                <MyCodeModal
                    user={currentUser}
                    inviteLink={inviteLink}
                    onClose={() => setShowMyCode(false)}
                    showToast={showToast}
                />
            )}
        </div>
    );
}
