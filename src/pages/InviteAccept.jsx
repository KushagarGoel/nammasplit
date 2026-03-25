import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getInviteToken } from '../data/firestore';
import { Users, Link as LinkIcon, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

export default function InviteAccept() {
    const { token } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated, userProfile, setInviteToken } = useAuth();
    const [inviteData, setInviteData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function validateToken() {
            try {
                const data = await getInviteToken(token);
                if (!data) {
                    setError('Invalid invite link');
                } else if (data.usedBy) {
                    setError('This invite link has already been used');
                } else if (new Date(data.expiresAt) < new Date()) {
                    setError('This invite link has expired');
                } else {
                    setInviteData(data);
                }
            } catch (err) {
                setError('Failed to validate invite link');
            } finally {
                setLoading(false);
            }
        }
        validateToken();
    }, [token]);

    useEffect(() => {
        // If user is already logged in and we have valid invite data, process it
        if (isAuthenticated && inviteData && !loading) {
            if (inviteData.userId === userProfile?.id) {
                setError('You cannot use your own invite link');
                return;
            }
            // Store token and redirect to process it
            setInviteToken(token);
            navigate('/');
        }
    }, [isAuthenticated, inviteData, loading, token, setInviteToken, navigate, userProfile?.id]);

    if (loading) {
        return (
            <div className="auth-loading">
                <Loader2 size={48} className="animate-spin" style={{ color: 'var(--primary)' }} />
                <p style={{ marginTop: 16, color: 'var(--text-secondary)' }}>Validating invite...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="auth-page">
                <div className="auth-container" style={{ textAlign: 'center', maxWidth: 400 }}>
                    <AlertCircle size={64} style={{ color: 'var(--danger)', marginBottom: 24 }} />
                    <h2 style={{ marginBottom: 12 }}>Invite Link Error</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>{error}</p>
                    <button className="btn btn-primary" onClick={() => navigate('/login')}>
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-container" style={{ textAlign: 'center', maxWidth: 400 }}>
                <CheckCircle size={64} style={{ color: 'var(--success)', marginBottom: 24 }} />
                <h2 style={{ marginBottom: 12 }}>Friend Invite</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
                    You've been invited to connect on Sangam!
                </p>

                <div style={{
                    background: 'var(--bg-secondary)',
                    padding: 20,
                    borderRadius: 12,
                    marginBottom: 24,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    textAlign: 'left'
                }}>
                    <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        flexShrink: 0
                    }}>
                        <Users size={24} />
                    </div>
                    <div>
                        <p style={{ margin: 0, fontWeight: 600 }}>Connect as Friends</p>
                        <p style={{ margin: '4px 0 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
                            You'll be able to split expenses and see each other's shared activities
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            setInviteToken(token);
                            navigate('/login');
                        }}
                    >
                        Log In to Accept
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={() => {
                            setInviteToken(token);
                            navigate('/login');
                        }}
                    >
                        Create Account
                    </button>
                </div>
            </div>
        </div>
    );
}
