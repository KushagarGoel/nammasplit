import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { IndianRupee, Eye, EyeOff } from 'lucide-react';

export default function Login() {
    const { login, signup, error, loading } = useAuth();
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
                await signup(email, password, name || email.split('@')[0]);
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

    return (
        <div className="auth-page">
            <div className="auth-container">
                {/* Logo */}
                <div className="auth-logo">
                    <div className="auth-logo-icon">
                        <IndianRupee size={32} />
                    </div>
                    <h1 className="auth-app-name">HisaabKitaab</h1>
                    <p className="auth-tagline">Split expenses, the desi way 🇮🇳</p>
                </div>

                {/* Form */}
                <form className="auth-form" onSubmit={handleSubmit}>
                    {isSignup && (
                        <div className="form-group">
                            <label className="form-label">Your Name</label>
                            <input
                                type="text"
                                className="form-input"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g., Arjun Sharma"
                                autoComplete="name"
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
                            autoFocus
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
                                placeholder="At least 6 characters"
                                required
                                minLength={6}
                                autoComplete={isSignup ? 'new-password' : 'current-password'}
                                style={{ paddingRight: 44 }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: 8,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--text-tertiary)',
                                    padding: 4,
                                    display: 'flex',
                                }}
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
                        disabled={submitting || !email || !password}
                    >
                        {submitting ? 'Please wait...' : isSignup ? 'Create Account' : 'Log In'}
                    </button>
                </form>

                {/* Toggle */}
                <div className="auth-toggle">
                    {isSignup ? (
                        <p>Already have an account?{' '}
                            <button className="auth-link" onClick={() => setIsSignup(false)}>
                                Log in
                            </button>
                        </p>
                    ) : (
                        <p>New here?{' '}
                            <button className="auth-link" onClick={() => setIsSignup(true)}>
                                Create account
                            </button>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
