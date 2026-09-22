import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import ErrorBanner from '../components/ui/ErrorBanner';
import { ShieldCheck, LogIn, Lock, Mail, Loader2 } from 'lucide-react';
import { Role } from '../types/auth';

export const LoginPage: React.FC = () => {
  const { login, user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<{ message: string; details?: any } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getRoleRedirectPath = (role: Role): string => {
    switch (role) {
      case 'Manager':  return '/manager';
      case 'HR':       return '/hr';
      case 'TeamLead': return '/team-lead';
      default:         return '/login';
    }
  };

  // Redirect already-authenticated users
  useEffect(() => {
    if (isAuthenticated && user) {
      const from = (location.state as any)?.from?.pathname;
      if (from && from !== '/login' && from !== '/unauthorized') {
        navigate(from, { replace: true });
      } else {
        navigate(getRoleRedirectPath(user.role), { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setApiError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setValidationError('Email is required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setValidationError('Please enter a valid email address format.');
      return;
    }
    if (!password) {
      setValidationError('Password is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const loggedInUser = await login({ email: trimmedEmail, password });
      navigate(getRoleRedirectPath(loggedInUser.role), { replace: true });
    } catch (err: any) {
      setApiError({
        message: err.message || 'Login failed. Please check your credentials.',
        details: err.details,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading) {
    return null;
  }

  return (
    <div style={{ width: '100%', maxWidth: '440px' }}>
      <div className="glass-card" style={{ padding: '40px 36px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-cyan) 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              marginBottom: '16px',
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
            }}
          >
            <ShieldCheck size={28} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
            Altrium Portal Login
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Sign in to access your Recruitment &amp; Hiring Portal
          </p>
        </div>

        {/* Errors */}
        {validationError && (
          <ErrorBanner message={validationError} onDismiss={() => setValidationError(null)} />
        )}
        {apiError && (
          <ErrorBanner
            message={apiError.message}
            details={apiError.details}
            onDismiss={() => setApiError(null)}
          />
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="email-input"
              style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}
            >
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={18}
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }}
              />
              <input
                id="email-input"
                type="email"
                className="input-field"
                style={{ paddingLeft: '42px' }}
                placeholder="name@altrium.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label
              htmlFor="password-input"
              style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}
            >
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={18}
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }}
              />
              <input
                id="password-input"
                type="password"
                className="input-field"
                style={{ paddingLeft: '42px' }}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            id="login-submit-btn"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '0.95rem', fontWeight: 700 }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                Signing in...
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <LogIn size={18} />
                Sign In
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
