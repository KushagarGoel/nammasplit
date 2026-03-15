import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { IndianRupee, Eye, EyeOff, Check, Shield, Zap, Users } from 'lucide-react';

export default function Login() {
    const { login, signup, error, loading, clearError } = useAuth();
    const [isSignup, setIsSignup] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [focusedField, setFocusedField] = useState(null);

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
                        <IndianRupee size={36} strokeWidth={2.5} />
                    </div>
                    <h1 className="auth-app-name">NammaSplit</h1>
                    <p className="auth-tagline">
                        Split expenses, the desi way <span>🇮🇳</span>
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
                                onFocus={() => setFocusedField('name')}
                                onBlur={() => setFocusedField(null)}
                                placeholder="e.g., Arjun Sharma"
                                autoComplete="name"
                                required={isSignup}
                                minLength={3}
                                style={{
                                    borderColor: focusedField === 'name' ? 'var(--primary)' : undefined
                                }}
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
                            onFocus={() => setFocusedField('email')}
                            onBlur={() => setFocusedField(null)}
                            placeholder="you@email.com"
                            required
                            autoComplete="email"
                            style={{
                                borderColor: focusedField === 'email' ? 'var(--primary)' : undefined
                            }}
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
                                onFocus={() => setFocusedField('password')}
                                onBlur={() => setFocusedField(null)}
                                placeholder={isSignup ? 'Create a password (min 6 chars)' : 'Enter your password'}
                                required
                                minLength={6}
                                autoComplete={isSignup ? 'new-password' : 'current-password'}
                                style={{
                                    paddingRight: 48,
                                    borderColor: focusedField === 'password' ? 'var(--primary)' : undefined
                                }}
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
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
