import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import ErrorBanner from '../components/ui/ErrorBanner';
import { getInvitationDetailsApi, acceptInvitationApi } from '../api/auth.api';
import { InvitationDetails, Role } from '../types/auth';
import { ShieldCheck, Lock, Loader2, UserCheck, XCircle } from 'lucide-react';

const getRoleRedirectPath = (role: Role): string => {
  switch (role) {
    case 'Manager':  return '/manager';
    case 'HR':       return '/hr';
    case 'TeamLead': return '/team-lead';
    default:         return '/login';
  }
};

const PASSWORD_RULES: Array<{ label: string; test: (v: string) => boolean }> = [
  { label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { label: 'One lowercase letter', test: (v) => /[a-z]/.test(v) },
  { label: 'One number', test: (v) => /[0-9]/.test(v) },
  { label: 'One special character', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export const AcceptInvitationPage: React.FC = () => {
  // The raw token lives only in this page's local state / the URL it arrived
  // in — it is never written to localStorage or any other persistent storage.
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const { applySession } = useAuth();

  const [details, setDetails] = useState<InvitationDetails | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<{ message: string; details?: any } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoadError('This invitation link is missing its token.');
      setIsLoadingDetails(false);
      return;
    }
    getInvitationDetailsApi(token)
      .then((res) => {
        setDetails(res);
        setIsLoadingDetails(false);
      })
      .catch((err: any) => {
        setLoadError(err.message || 'This invitation link is invalid or has expired.');
        setIsLoadingDetails(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setSubmitError(null);

    const failedRule = PASSWORD_RULES.find((rule) => !rule.test(password));
    if (failedRule) {
      setValidationError(`Password requirement not met: ${failedRule.label.toLowerCase()}.`);
      return;
    }
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await acceptInvitationApi(token, password);
      applySession(result.token, result.user);
      navigate(getRoleRedirectPath(result.user.role), { replace: true });
    } catch (err: any) {
      setSubmitError({ message: err.message || 'Failed to accept invitation.', details: err.details });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '440px' }}>
      <div className="glass-card" style={{ padding: '40px 36px' }}>
        {isLoadingDetails ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: '12px' }}>Verifying your invitation...</p>
          </div>
        ) : loadError || !details ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <XCircle size={40} color="#f87171" style={{ marginBottom: '12px' }} />
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
              Invitation Not Available
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {loadError || 'This invitation link is invalid or has expired.'}
            </p>
            <p style={{ color: 'var(--text-subtle)', fontSize: '0.8rem', marginTop: '16px' }}>
              Ask your Manager to resend the invitation, then use the new link.
            </p>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
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
                <UserCheck size={26} />
              </div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
                Welcome, {details.name}
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
                Activate your <strong>{details.role}</strong> account for {details.email} by choosing a password.
              </p>
            </div>

            {validationError && (
              <ErrorBanner message={validationError} onDismiss={() => setValidationError(null)} />
            )}
            {submitError && (
              <ErrorBanner
                message={submitError.message}
                details={submitError.details}
                onDismiss={() => setSubmitError(null)}
              />
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div style={{ marginBottom: '18px' }}>
                <label htmlFor="new-password" style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
                  <input
                    id="new-password"
                    type="password"
                    className="input-field"
                    style={{ paddingLeft: '42px' }}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label htmlFor="confirm-password" style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Confirm Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
                  <input
                    id="confirm-password"
                    type="password"
                    className="input-field"
                    style={{ paddingLeft: '42px' }}
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isSubmitting}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0', display: 'grid', gap: '4px' }}>
                {PASSWORD_RULES.map((rule) => {
                  const met = rule.test(password);
                  return (
                    <li
                      key={rule.label}
                      style={{
                        fontSize: '0.78rem',
                        color: met ? 'var(--accent-emerald)' : 'var(--text-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {met ? <ShieldCheck size={13} /> : <span style={{ width: '13px', textAlign: 'center' }}>&middot;</span>}
                      {rule.label}
                    </li>
                  );
                })}
              </ul>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px', fontSize: '0.95rem', fontWeight: 700 }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    Activating Account...
                  </span>
                ) : (
                  'Activate Account & Sign In'
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default AcceptInvitationPage;
