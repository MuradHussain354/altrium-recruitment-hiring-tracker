import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import ErrorBanner from '../components/ui/ErrorBanner';
import { ShieldCheck, LogIn, Lock, Mail, Loader2, Smartphone, KeyRound, ChevronLeft } from 'lucide-react';
import { Role } from '../types/auth';

export const LoginPage: React.FC = () => {
  const { login, complete2FALogin, user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // ── Step 1 ─────────────────────────────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // ── Step 2 (2FA challenge) ─────────────────────────────────────────────────
  /** null = Step 1, string = Step 2 with stored tempToken */
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [usedBackupCode, setUsedBackupCode] = useState(false);

  // ── Shared ─────────────────────────────────────────────────────────────────
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<{ message: string; details?: any } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const is2FAStep = tempToken !== null;

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

  // ── Step 1 submit ──────────────────────────────────────────────────────────
  const handleStep1Submit = async (e: React.FormEvent) => {
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
      const result = await login({ email: trimmedEmail, password });

      if ('role' in result) {
        // Direct login success — AuthContext already set user/token
        navigate(getRoleRedirectPath(result.role), { replace: true });
      } else {
        // 2FA challenge
        setTempToken(result.tempToken);
      }
    } catch (err: any) {
      setApiError({
        message: err.message || 'Login failed. Please check your credentials.',
        details: err.details,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Step 2 submit ──────────────────────────────────────────────────────────
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setApiError(null);

    const trimmedCode = twoFactorCode.replace(/\s/g, '');
    if (!trimmedCode) {
      setValidationError('Authentication code is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const completedUser = await complete2FALogin(tempToken!, trimmedCode);
      navigate(getRoleRedirectPath(completedUser.role), { replace: true });
    } catch (err: any) {
      setApiError({
        message: err.message || 'Invalid authentication code. Please try again.',
        details: err.details,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToStep1 = () => {
    setTempToken(null);
    setTwoFactorCode('');
    setValidationError(null);
    setApiError(null);
  };

  if (isAuthLoading) {
    return null;
  }

  return (
    <div style={{ width: '100%', maxWidth: '440px' }}>
      <div className="glass-card" style={{ padding: '40px 36px' }}>

        {/* ── STEP 1: Email + Password ───────────────────────────────────── */}
        {!is2FAStep && (
          <>
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
            <form onSubmit={handleStep1Submit} noValidate>
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
          </>
        )}

        {/* ── STEP 2: Two-Factor Challenge ───────────────────────────────── */}
        {is2FAStep && (
          <>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #7c3aed 0%, var(--primary) 100%)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  marginBottom: '16px',
                  boxShadow: '0 8px 24px rgba(124, 58, 237, 0.3)',
                }}
              >
                <Smartphone size={26} />
              </div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
                Two-Factor Verification
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0, lineHeight: 1.6 }}>
                Open your authenticator app and enter the 6-digit code, or use one of your backup codes.
              </p>
            </div>

            {/* Toggle backup code mode */}
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => { setUsedBackupCode(!usedBackupCode); setTwoFactorCode(''); setValidationError(null); setApiError(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  color: usedBackupCode ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  textDecoration: 'underline',
                  textDecorationStyle: 'dotted',
                }}
              >
                <KeyRound size={13} />
                {usedBackupCode ? 'Use authenticator app instead' : 'Use a backup code instead'}
              </button>
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
            <form onSubmit={handleStep2Submit} noValidate>
              <div style={{ marginBottom: '24px' }}>
                <label
                  htmlFor="twofa-code-input"
                  style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}
                >
                  {usedBackupCode ? 'Backup Code' : 'Authenticator Code'}
                </label>
                <input
                  id="twofa-code-input"
                  type={usedBackupCode ? 'text' : 'text'}
                  className="input-field"
                  style={{ textAlign: 'center', fontSize: '1.35rem', fontWeight: 700, letterSpacing: usedBackupCode ? '2px' : '6px' }}
                  placeholder={usedBackupCode ? 'XXXX-XXXX' : '000000'}
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  disabled={isSubmitting}
                  autoComplete="one-time-code"
                  maxLength={usedBackupCode ? 20 : 8}
                  autoFocus
                />
                {!usedBackupCode && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '6px', textAlign: 'center' }}>
                    Code refreshes every 30 seconds
                  </p>
                )}
              </div>

              <button
                type="submit"
                id="twofa-verify-btn"
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px', fontSize: '0.95rem', fontWeight: 700, marginBottom: '12px' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    Verifying...
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <ShieldCheck size={18} />
                    Verify &amp; Sign In
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={handleBackToStep1}
                className="btn btn-secondary"
                style={{ width: '100%', padding: '10px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                disabled={isSubmitting}
              >
                <ChevronLeft size={15} />
                Back to Sign In
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
