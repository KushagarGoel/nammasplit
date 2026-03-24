import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { IndianRupee, Eye, EyeOff, Check, Shield, Zap, Users } from 'lucide-react';

// Google "G" icon component
function GoogleIcon({ size = 20 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
    );
}

export default function Login() {
    const { login, signup, signInWithGoogle, error, loading, clearError } = useAuth();
    const [isSignup, setIsSignup] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (isSignup) {
                await signup(email, password, name.trim());
            } else {
                await login(email, password);
            }
        } catch {
            // error handled by context
        }
        setSubmitting(false);
    };

    const handleGoogleSignIn = async () => {
        setSubmitting(true);
        try {
            await signInWithGoogle();
        } catch {
            // error handled by context
        }
        setSubmitting(false);
    };

    if (loading) {
        return (
            <div className="auth-loading">
                <div className="auth-spinner"></div>
            </div>
        );
    }

    const features = [
        { icon: Zap, text: 'Split expenses instantly' },
        { icon: Users, text: 'Manage groups & friends' },
        { icon: Shield, text: 'Secure & private' },
    ];

    return (
        <div className="auth-page">
            <div className="auth-container">
                {/* Logo */}
                <div className="auth-logo">
                    <div className="auth-logo-icon">
                        <IndianRupee size={40} strokeWidth={2.5} />
                    </div>
                    <h1 className="auth-app-name">NammaSplit</h1>
                    <p className="auth-tagline">
                        Split expenses, the desi way
                    </p>
                </div>

                {/* Mode Toggle Tabs */}
                <div className="auth-mode-tabs">
                    <button
                        className={`auth-mode-tab ${!isSignup ? 'active' : ''}`}
                        onClick={() => { setIsSignup(false); clearError(); }}
                        type="button"
                    >
                        Log In
                    </button>
                    <button
                        className={`auth-mode-tab ${isSignup ? 'active' : ''}`}
                        onClick={() => { setIsSignup(true); clearError(); }}
                        type="button"
                    >
                        Sign Up
                    </button>
                </div>

                {/* Form */}
                <form className="auth-form" onSubmit={handleSubmit}>
                    {isSignup && (
                        <div className="form-group">
                            <label className="form-label">Your Name *</label>
                            <input
                                type="text"
                                className="form-input"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g., Arjun Sharma"
                                autoComplete="name"
                                required={isSignup}
                                minLength={3}
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                            type="email"
                            className="form-input"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="you@email.com"
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="form-input"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder={isSignup ? 'Create a password (min 6 chars)' : 'Enter your password'}
                                required
                                minLength={6}
                                autoComplete={isSignup ? 'new-password' : 'current-password'}
                                style={{ paddingRight: 48 }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: 12,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: showPassword ? 'var(--primary)' : 'var(--text-tertiary)',
                                    padding: 6,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: 'var(--radius-sm)',
                                    transition: 'all var(--transition-fast)',
                                }}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="auth-error">{error}</div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary auth-submit"
                        disabled={submitting || !email || !password || (isSignup && !name.trim())}
                        style={{ width: '100%', justifyContent: 'center' }}
                    >
                        {submitting ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span className="auth-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                                Please wait...
                            </span>
                        ) : isSignup ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Check size={18} />
                                Create Account
                            </span>
                        ) : (
                            'Log In'
                        )}
                    </button>
                </form>

                {/* Divider */}
                <div className="auth-divider">
                    <span className="auth-divider-line"></span>
                    <span className="auth-divider-text">or</span>
                    <span className="auth-divider-line"></span>
                </div>

                {/* Google Sign In */}
                <button
                    type="button"
                    className="btn btn-google"
                    onClick={handleGoogleSignIn}
                    disabled={submitting}
                    style={{ marginBottom: 'var(--space-md)' }}
                >
                    <GoogleIcon size={20} />
                    Continue with Google
                </button>

                {/* Toggle */}
                <div className="auth-toggle">
                    {isSignup ? (
                        <p>Already have an account?{' '}
                            <button className="auth-link" onClick={() => setIsSignup(false)} type="button">
                                Log in
                            </button>
                        </p>
                    ) : (
                        <p>New here?{' '}
                            <button className="auth-link" onClick={() => setIsSignup(true)} type="button">
                                Create account
                            </button>
                        </p>
                    )}
                </div>

                {/* Features */}
                <div className="auth-features">
                    <p className="auth-features-title">Why NammaSplit?</p>
                    <div className="auth-features-list">
                        {features.map((feature, index) => (
                            <div key={index} className="auth-feature">
                                <div className="auth-feature-icon">
                                    <feature.icon size={14} />
                                </div>
                                <span>{feature.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
