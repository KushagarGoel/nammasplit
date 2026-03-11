import { Moon, IndianRupee, LogOut, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { getInitials, getAvatarColor } from '../utils/helpers';
import { useState } from 'react';

export default function Account() {
    const { currentUser, friends, groups, expenses } = useApp();
    const { logout } = useAuth();
    const [showConfirmReset, setShowConfirmReset] = useState(false);
    const [logouting, setLogouting] = useState(false);

    const handleLogout = async () => {
        setLogouting(true);
        await logout();
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
