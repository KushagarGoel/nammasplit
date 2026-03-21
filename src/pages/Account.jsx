import { Moon, IndianRupee, LogOut, Trash2, Wallet, Check, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { getInitials, getAvatarColor } from '../utils/helpers';
import { useState, useEffect } from 'react';

export default function Account() {
    const { currentUser, friends, groups, expenses, showToast } = useApp();
    const { logout, user, updateUserProfile, userProfile } = useAuth();
    const [showConfirmReset, setShowConfirmReset] = useState(false);
    const [logouting, setLogouting] = useState(false);
    const [upiId, setUpiId] = useState(userProfile?.upiId || '');
    const [isEditingUpi, setIsEditingUpi] = useState(false);
    const [savingUpi, setSavingUpi] = useState(false);

    // Sync upiId with userProfile when it changes
    useEffect(() => {
        setUpiId(userProfile?.upiId || '');
    }, [userProfile?.upiId]);

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

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Account</h1>
            </div>

            {/* Profile */}
            <div className="account-header">
                <div className="avatar avatar-xl" style={{ background: getAvatarColor(currentUser.name) }}>
                    {getInitials(currentUser.name)}
                </div>
                <h2 className="account-name">{currentUser.name}</h2>
                <p className="account-email">{currentUser.email}</p>
            </div>

            {/* Stats */}
            <div className="summary-cards" style={{ marginBottom: 'var(--space-lg)' }}>
                <div className="summary-card">
                    <div className="summary-card-label">Friends</div>
                    <div className="summary-card-value neutral">{friends.length}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-label">Groups</div>
                    <div className="summary-card-value neutral">{groups.length}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-label">Expenses</div>
                    <div className="summary-card-value neutral">{expenses.length}</div>
                </div>
            </div>

            {/* Settings */}
            <div className="section">
                <div className="section-header">
                    <h3 className="section-title">Settings</h3>
                </div>
                <div className="card">
                    <div className="settings-item">
                        <div className="settings-item-left">
                            <div className="settings-item-icon">
                                <IndianRupee size={18} />
                            </div>
                            <span className="settings-item-label">Currency</span>
                        </div>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            INR (₹)
                        </span>
                    </div>

                    <div className="settings-item">
                        <div className="settings-item-left">
                            <div className="settings-item-icon">
                                <Moon size={18} />
                            </div>
                            <span className="settings-item-label">Theme</span>
                        </div>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            System
                        </span>
                    </div>

                    {/* UPI ID */}
                    <div className="settings-item" style={{ borderBottom: 'none' }}>
                        <div className="settings-item-left">
                            <div className="settings-item-icon">
                                <Wallet size={18} />
                            </div>
                            <span className="settings-item-label">UPI ID</span>
                        </div>
                        {isEditingUpi ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="text"
                                    value={upiId}
                                    onChange={(e) => setUpiId(e.target.value)}
                                    placeholder="yourname@upi"
                                    style={{
                                        padding: '6px 10px',
                                        border: '1.5px solid var(--primary)',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: '0.9rem',
                                        width: '150px',
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
                                        padding: '6px',
                                        borderRadius: 'var(--radius-sm)',
                                        background: 'var(--positive-bg)',
                                        color: 'var(--positive)',
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                >
                                    <Check size={16} />
                                </button>
                                <button
                                    onClick={handleCancelUpi}
                                    style={{
                                        padding: '6px',
                                        borderRadius: 'var(--radius-sm)',
                                        background: 'var(--negative-bg)',
                                        color: 'var(--negative)',
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ color: userProfile?.upiId ? 'var(--text-primary)' : 'var(--text-tertiary)', fontSize: '0.9rem' }}>
                                    {userProfile?.upiId || 'Not set'}
                                </span>
                                <button
                                    className="btn btn-sm"
                                    onClick={() => setIsEditingUpi(true)}
                                    style={{
                                        padding: '4px 12px',
                                        fontSize: '0.8rem',
                                        background: 'var(--bg-tertiary)',
                                        color: 'var(--text-secondary)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-sm)'
                                    }}
                                >
                                    {userProfile?.upiId ? 'Edit' : 'Add'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Account Actions */}
            <div className="section">
                <div className="section-header">
                    <h3 className="section-title">Account</h3>
                </div>
                <div className="card">
                    <div className="settings-item" style={{ borderBottom: 'none' }}>
                        <div className="settings-item-left">
                            <div className="settings-item-icon" style={{ background: 'var(--negative-bg)', color: 'var(--negative)' }}>
                                <LogOut size={18} />
                            </div>
                            <span className="settings-item-label">Log Out</span>
                        </div>
                        <button
                            className="btn btn-danger btn-sm"
                            onClick={handleLogout}
                            disabled={logouting}
                        >
                            {logouting ? 'Logging out...' : 'Logout'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
