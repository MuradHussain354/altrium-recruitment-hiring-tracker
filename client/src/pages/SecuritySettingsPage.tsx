import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import ErrorBanner from '../components/ui/ErrorBanner';
import {
  get2FAStatusApi,
  setup2FAApi,
  enable2FAApi,
  disable2FAApi,
  regenerateBackupCodesApi,
} from '../api/auth.api';
import { TwoFactorStatusResponse, TwoFactorSetupResponse } from '../types/auth';
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  QrCode,
  KeyRound,
  RefreshCw,
  Loader2,
  Copy,
  CheckCheck,
  Eye,
  EyeOff,
  AlertTriangle,
  Info,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Helper: copy-to-clipboard button
// ─────────────────────────────────────────────────────────────────────────────
const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy to clipboard"
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: copied ? 'var(--accent-emerald)' : 'var(--text-muted)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '0.78rem',
        padding: '4px 6px',
        borderRadius: '6px',
        transition: 'color 0.15s',
      }}
    >
      {copied ? <CheckCheck size={14} /> : <Copy size={14} />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Backup Code Display
// ─────────────────────────────────────────────────────────────────────────────
const BackupCodeDisplay: React.FC<{ codes: string[]; onDismiss: () => void }> = ({ codes, onDismiss }) => {
  const [showCodes, setShowCodes] = useState(true);

  return (
    <div
      style={{
        background: 'rgba(245, 158, 11, 0.08)',
        border: '1px solid rgba(245, 158, 11, 0.35)',
        borderRadius: '12px',
        padding: '20px 24px',
        marginTop: '20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <AlertTriangle size={18} color="var(--accent-amber)" />
        <span style={{ fontWeight: 700, color: 'var(--accent-amber)', fontSize: '0.9rem' }}>
          Save your backup codes — shown once only!
        </span>
        <button
          type="button"
          onClick={() => setShowCodes(!showCodes)}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem' }}
        >
          {showCodes ? <EyeOff size={14} /> : <Eye size={14} />}
          {showCodes ? 'Hide' : 'Show'}
        </button>
      </div>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
        Store these codes in a safe place (e.g., password manager). Each code can be used once to sign in if you lose access to your authenticator app.
      </p>

      {showCodes && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '8px',
              marginBottom: '12px',
            }}
          >
            {codes.map((code, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '6px',
                  padding: '7px 12px',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  textAlign: 'center',
                  border: '1px solid rgba(255,255,255,0.08)',
                  letterSpacing: '1.5px',
                }}
              >
                {code}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <CopyButton text={codes.join('\n')} />
          </div>
        </>
      )}

      <button
        type="button"
        onClick={onDismiss}
        className="btn btn-secondary"
        style={{ marginTop: '16px', width: '100%', fontSize: '0.85rem' }}
      >
        I have saved my backup codes
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
type PageView =
  | 'status'        // default view
  | 'setup'         // QR code screen
  | 'disableConfirm'
  | 'regenConfirm';

export const SecuritySettingsPage: React.FC = () => {
  const { user } = useAuth();

  const [view, setView] = useState<PageView>('status');
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [status, setStatus] = useState<TwoFactorStatusResponse | null>(null);
  const [setupData, setSetupData] = useState<TwoFactorSetupResponse | null>(null);
  const [isLoadingSetup, setIsLoadingSetup] = useState(false);

  // New backup codes to show
  const [newBackupCodes, setNewBackupCodes] = useState<string[] | null>(null);

  // Step 2 — enable 2FA (confirm with TOTP)
  const [enableCode, setEnableCode] = useState('');
  const [enableError, setEnableError] = useState<string | null>(null);
  const [enableLoading, setEnableLoading] = useState(false);

  // Disable 2FA form
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [disableError, setDisableError] = useState<string | null>(null);
  const [disableLoading, setDisableLoading] = useState(false);

  // Regen backup codes form
  const [regenPassword, setRegenPassword] = useState('');
  const [regenCode, setRegenCode] = useState('');
  const [regenError, setRegenError] = useState<string | null>(null);
  const [regenLoading, setRegenLoading] = useState(false);

  // Show/hide manual key
  const [showManualKey, setShowManualKey] = useState(false);

  const fetchStatus = useCallback(async () => {
    setIsLoadingStatus(true);
    try {
      const s = await get2FAStatusApi();
      setStatus(s);
    } catch (err: any) {
      // silently ignore — user just won't see status
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // ── Setup: load QR code ────────────────────────────────────────────────────
  const handleSetup = async () => {
    setIsLoadingSetup(true);
    setEnableCode('');
    setEnableError(null);
    setNewBackupCodes(null);
    try {
      const data = await setup2FAApi();
      setSetupData(data);
      setView('setup');
    } catch (err: any) {
      setEnableError(err.message || 'Failed to initiate 2FA setup. Please try again.');
    } finally {
      setIsLoadingSetup(false);
    }
  };

  // ── Enable: verify first TOTP ──────────────────────────────────────────────
  const handleEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = enableCode.replace(/\s/g, '');
    if (!code || code.length < 6) {
      setEnableError('Please enter your 6-digit authenticator code.');
      return;
    }
    setEnableLoading(true);
    setEnableError(null);
    try {
      const result = await enable2FAApi(code);
      setNewBackupCodes(result.backupCodes);
      await fetchStatus();
      setView('status');
      setSetupData(null);
    } catch (err: any) {
      setEnableError(err.message || 'Invalid code. Please try again.');
    } finally {
      setEnableLoading(false);
    }
  };

  // ── Disable 2FA ────────────────────────────────────────────────────────────
  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disablePassword) { setDisableError('Password is required.'); return; }
    if (!disableCode) { setDisableError('Authentication code is required.'); return; }
    setDisableLoading(true);
    setDisableError(null);
    try {
      await disable2FAApi(disablePassword, disableCode.replace(/\s/g, ''));
      await fetchStatus();
      setView('status');
      setDisablePassword('');
      setDisableCode('');
      setNewBackupCodes(null);
    } catch (err: any) {
      setDisableError(err.message || 'Failed to disable 2FA. Please check your credentials.');
    } finally {
      setDisableLoading(false);
    }
  };

  // ── Regenerate backup codes ────────────────────────────────────────────────
  const handleRegen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regenPassword) { setRegenError('Password is required.'); return; }
    if (!regenCode) { setRegenError('TOTP code is required.'); return; }
    setRegenLoading(true);
    setRegenError(null);
    try {
      const result = await regenerateBackupCodesApi(regenPassword, regenCode.replace(/\s/g, ''));
      setNewBackupCodes(result.backupCodes);
      await fetchStatus();
      setView('status');
      setRegenPassword('');
      setRegenCode('');
    } catch (err: any) {
      setRegenError(err.message || 'Failed to regenerate backup codes.');
    } finally {
      setRegenLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // STATUS VIEW
  // ─────────────────────────────────────────────────────────────────────────
  if (view === 'status') {
    return (
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        {/* Page Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield color="var(--primary)" size={24} />
            Security Settings
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '6px', marginBottom: 0 }}>
            Manage two-factor authentication and account security for <strong style={{ color: 'var(--text-main)' }}>{user?.email}</strong>.
          </p>
        </div>

        {/* Backup codes display (shown once after enable/regen) */}
        {newBackupCodes && (
          <BackupCodeDisplay codes={newBackupCodes} onDismiss={() => setNewBackupCodes(null)} />
        )}

        {/* 2FA Status Card */}
        <div className="glass-card" style={{ padding: '28px 32px', marginTop: newBackupCodes ? '24px' : 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: status?.enabled
                    ? 'rgba(16, 185, 129, 0.15)'
                    : 'rgba(245, 158, 11, 0.12)',
                  border: `1px solid ${status?.enabled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.25)'}`,
                  flexShrink: 0,
                }}
              >
                {status?.enabled ? (
                  <ShieldCheck size={22} color="var(--accent-emerald)" />
                ) : (
                  <ShieldOff size={22} color="var(--accent-amber)" />
                )}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)', lineHeight: 1.2 }}>
                  Two-Factor Authentication
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {isLoadingStatus ? 'Loading...' : status?.enabled
                    ? `Enabled — ${status.remainingBackupCodes} backup code${status.remainingBackupCodes !== 1 ? 's' : ''} remaining`
                    : 'Not enabled — your account is protected by password only'}
                </div>
              </div>
            </div>
            <span
              style={{
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                background: status?.enabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.12)',
                color: status?.enabled ? 'var(--accent-emerald)' : 'var(--accent-amber)',
                border: `1px solid ${status?.enabled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.25)'}`,
              }}
            >
              {status?.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '24px 0' }} />

          {/* Actions */}
          {isLoadingStatus ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '12px' }}>
              <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : status?.enabled ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Backup Codes Low Warning */}
              {status.remainingBackupCodes <= 2 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 14px',
                    background: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    borderRadius: '8px',
                    marginBottom: '4px',
                  }}
                >
                  <AlertTriangle size={15} color="var(--accent-amber)" />
                  <span style={{ fontSize: '0.82rem', color: 'var(--accent-amber)' }}>
                    You only have {status.remainingBackupCodes} backup code{status.remainingBackupCodes !== 1 ? 's' : ''} left. Consider regenerating them.
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  id="regen-backup-codes-btn"
                  onClick={() => { setView('regenConfirm'); setRegenPassword(''); setRegenCode(''); setRegenError(null); }}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.875rem' }}
                >
                  <RefreshCw size={15} />
                  Regenerate Backup Codes
                </button>
                <button
                  type="button"
                  id="disable-2fa-btn"
                  onClick={() => { setView('disableConfirm'); setDisablePassword(''); setDisableCode(''); setDisableError(null); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    fontSize: '0.875rem',
                    background: 'none',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    color: '#f87171',
                    cursor: 'pointer',
                    fontWeight: 600,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  <ShieldOff size={15} />
                  Disable 2FA
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  padding: '12px 14px',
                  background: 'rgba(99, 102, 241, 0.07)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  borderRadius: '8px',
                  marginBottom: '16px',
                }}
              >
                <Info size={15} color="var(--primary)" style={{ flexShrink: 0, marginTop: '1px' }} />
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
                  Two-factor authentication adds a second layer of security to your account. You'll need an authenticator app like Google Authenticator, Authy, or 1Password.
                </p>
              </div>
              <button
                type="button"
                id="enable-2fa-btn"
                onClick={handleSetup}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.875rem' }}
                disabled={isLoadingSetup}
              >
                {isLoadingSetup ? (
                  <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <ShieldCheck size={15} />
                )}
                {isLoadingSetup ? 'Loading...' : 'Set Up Two-Factor Authentication'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SETUP VIEW — QR Code + confirm first code
  // ─────────────────────────────────────────────────────────────────────────
  if (view === 'setup' && setupData) {
    return (
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <button
            type="button"
            onClick={() => { setView('status'); setSetupData(null); setEnableError(null); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem' }}
          >
            ← Back
          </button>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Set Up Authenticator App
          </h1>
        </div>

        <div className="glass-card" style={{ padding: '32px' }}>
          {/* Step 1: Scan QR */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, color: '#fff', flexShrink: 0 }}>1</div>
              <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>Scan this QR code with your authenticator app</span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
              Open Google Authenticator, Authy, 1Password, or any TOTP-compatible app and scan the QR code below.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <div style={{ background: '#fff', padding: '12px', borderRadius: '12px', display: 'inline-block' }}>
                <img
                  src={setupData.qrCodeUrl}
                  alt="2FA QR code"
                  style={{ display: 'block', width: '180px', height: '180px' }}
                />
              </div>
            </div>

            {/* Manual key toggle */}
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <button
                type="button"
                onClick={() => setShowManualKey(!showManualKey)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '5px', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
              >
                <QrCode size={13} />
                {showManualKey ? 'Hide manual key' : 'Can\'t scan? Enter key manually'}
              </button>
            </div>
            {showManualKey && (
              <div
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  marginTop: '8px',
                }}
              >
                <code style={{ fontSize: '0.875rem', fontFamily: 'monospace', color: 'var(--text-main)', letterSpacing: '1px', wordBreak: 'break-all' }}>
                  {setupData.manualKey}
                </code>
                <CopyButton text={setupData.manualKey} />
              </div>
            )}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '0 0 24px' }} />

          {/* Step 2: Confirm code */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, color: '#fff', flexShrink: 0 }}>2</div>
              <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>Enter the 6-digit code to confirm</span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Enter the code shown in your authenticator app to verify the setup.
            </p>

            {enableError && (
              <ErrorBanner message={enableError} onDismiss={() => setEnableError(null)} />
            )}

            <form onSubmit={handleEnable}>
              <div style={{ marginBottom: '20px' }}>
                <label
                  htmlFor="enable-code-input"
                  style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}
                >
                  Authenticator Code
                </label>
                <input
                  id="enable-code-input"
                  type="text"
                  className="input-field"
                  style={{ textAlign: 'center', fontSize: '1.4rem', fontWeight: 700, letterSpacing: '6px' }}
                  placeholder="000000"
                  value={enableCode}
                  onChange={(e) => setEnableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={enableLoading}
                  maxLength={6}
                  autoComplete="one-time-code"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                id="enable-2fa-confirm-btn"
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                disabled={enableLoading}
              >
                {enableLoading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <ShieldCheck size={18} />}
                {enableLoading ? 'Activating...' : 'Activate Two-Factor Authentication'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DISABLE CONFIRM VIEW
  // ─────────────────────────────────────────────────────────────────────────
  if (view === 'disableConfirm') {
    return (
      <div style={{ maxWidth: '520px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <button
            type="button"
            onClick={() => setView('status')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.85rem' }}
          >
            ← Back
          </button>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Disable Two-Factor Authentication
          </h1>
        </div>

        <div className="glass-card" style={{ padding: '28px 32px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 14px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '8px',
              marginBottom: '24px',
            }}
          >
            <AlertTriangle size={15} color="#f87171" />
            <span style={{ fontSize: '0.82rem', color: '#f87171' }}>
              Disabling 2FA reduces your account security. This action is logged.
            </span>
          </div>

          {disableError && (
            <ErrorBanner message={disableError} onDismiss={() => setDisableError(null)} />
          )}

          <form onSubmit={handleDisable}>
            <div style={{ marginBottom: '18px' }}>
              <label htmlFor="disable-password-input" style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                Current Password
              </label>
              <input
                id="disable-password-input"
                type="password"
                className="input-field"
                placeholder="Enter your current password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                disabled={disableLoading}
                autoComplete="current-password"
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label htmlFor="disable-code-input" style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                TOTP Code or Backup Code
              </label>
              <input
                id="disable-code-input"
                type="text"
                className="input-field"
                style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 700, letterSpacing: '4px' }}
                placeholder="000000"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
                disabled={disableLoading}
                autoComplete="one-time-code"
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setView('status')}
                className="btn btn-secondary"
                style={{ flex: 1, fontWeight: 600 }}
                disabled={disableLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                id="disable-2fa-confirm-btn"
                disabled={disableLoading}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '7px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  color: '#f87171',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                }}
              >
                {disableLoading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <ShieldOff size={15} />}
                {disableLoading ? 'Disabling...' : 'Disable 2FA'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // REGEN CONFIRM VIEW
  // ─────────────────────────────────────────────────────────────────────────
  if (view === 'regenConfirm') {
    return (
      <div style={{ maxWidth: '520px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <button
            type="button"
            onClick={() => setView('status')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.85rem' }}
          >
            ← Back
          </button>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Regenerate Backup Codes
          </h1>
        </div>

        <div className="glass-card" style={{ padding: '28px 32px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              padding: '12px 14px',
              background: 'rgba(245, 158, 11, 0.07)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: '8px',
              marginBottom: '24px',
            }}
          >
            <AlertTriangle size={15} color="var(--accent-amber)" style={{ flexShrink: 0, marginTop: '1px' }} />
            <span style={{ fontSize: '0.82rem', color: 'var(--accent-amber)', lineHeight: 1.5 }}>
              Regenerating backup codes will invalidate all existing codes. New codes will be shown once — save them immediately.
            </span>
          </div>

          {regenError && (
            <ErrorBanner message={regenError} onDismiss={() => setRegenError(null)} />
          )}

          <form onSubmit={handleRegen}>
            <div style={{ marginBottom: '18px' }}>
              <label htmlFor="regen-password-input" style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                Current Password
              </label>
              <input
                id="regen-password-input"
                type="password"
                className="input-field"
                placeholder="Enter your current password"
                value={regenPassword}
                onChange={(e) => setRegenPassword(e.target.value)}
                disabled={regenLoading}
                autoComplete="current-password"
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label htmlFor="regen-code-input" style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                Current TOTP Code
              </label>
              <input
                id="regen-code-input"
                type="text"
                className="input-field"
                style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 700, letterSpacing: '4px' }}
                placeholder="000000"
                value={regenCode}
                onChange={(e) => setRegenCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={regenLoading}
                autoComplete="one-time-code"
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setView('status')}
                className="btn btn-secondary"
                style={{ flex: 1, fontWeight: 600 }}
                disabled={regenLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                id="regen-codes-confirm-btn"
                className="btn btn-primary"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', fontWeight: 700 }}
                disabled={regenLoading}
              >
                {regenLoading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={15} />}
                {regenLoading ? 'Regenerating...' : 'Regenerate Codes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return null;
};

export default SecuritySettingsPage;
