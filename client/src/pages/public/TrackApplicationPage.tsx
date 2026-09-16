import React, { useState } from 'react';
import {
  Search,
  Mail,
  Hash,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ClipboardList,
  Building2,
  Layers,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { trackApplication } from '../../api/publicCareers.api';
import { TrackApplicationInput, TrackedApplication } from '../../types/careers';
import { Link } from 'react-router-dom';

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function statusLabel(status: string): { label: string; color: string; bg: string } {
  switch (status) {
    case 'InProgress':
      return { label: 'In Progress', color: '#22d3ee', bg: 'rgba(6,182,212,0.12)' };
    case 'Hired':
      return { label: 'Offer Extended', color: '#34d399', bg: 'rgba(16,185,129,0.12)' };
    case 'Rejected':
      return { label: 'Application Closed', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' };
    case 'OnHold':
      return { label: 'Under Review', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' };
    default:
      return { label: status, color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' };
  }
}

interface FieldErrors {
  email?: string;
  referenceId?: string;
}

export const TrackApplicationPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TrackedApplication | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const validate = (): boolean => {
    const errors: FieldErrors = {};
    if (!email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!isValidEmail(email)) {
      errors.email = 'Please enter a valid email address.';
    }
    if (!referenceId.trim()) {
      errors.referenceId = 'Application reference ID is required.';
    } else if (!isValidUUID(referenceId)) {
      errors.referenceId = 'Reference ID must be a valid UUID (e.g. xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx).';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setNotFound(false);
    setResult(null);
    if (!validate()) return;

    const input: TrackApplicationInput = {
      email: email.trim(),
      referenceId: referenceId.trim(),
    };

    setIsLoading(true);
    try {
      const res = await trackApplication(input);
      setResult(res.data);
    } catch (err: any) {
      if (err?.error === 'NetworkError') {
        setApiError('Could not reach the server. Please check your connection and try again.');
      } else if (err?.message?.includes('not found') || (typeof err === 'object' && err?.message && err.message.toLowerCase().includes('not found'))) {
        setNotFound(true);
      } else if (err?.message) {
        // Check status code style errors
        setNotFound(true);
      } else {
        setApiError(err?.message || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setNotFound(false);
    setApiError(null);
  };

  const status = result ? statusLabel(result.status) : null;

  return (
    <div className="container track-page">
      {/* Page Header */}
      <header className="page-hero">
        <div className="page-hero__badge">
          <ClipboardList size={14} />
          Application Status
        </div>
        <h1 className="page-hero__title">Track My Application</h1>
        <p className="page-hero__subtitle">
          Enter your email and application reference ID to view your current application status.
        </p>
      </header>

      <div className="track-page__content">
        {/* Search Form */}
        {!result && (
          <section className="glass-card track-form-card" aria-labelledby="track-form-heading">
            <h2 id="track-form-heading" className="track-form-card__title">
              <Search size={18} />
              Find Your Application
            </h2>
            <p className="track-form-card__hint">
              Your reference ID was displayed on your application confirmation screen. Both your email and reference ID must match.
            </p>

            <form
              id="track-application-form"
              onSubmit={handleSubmit}
              noValidate
              aria-label="Track application form"
            >
              {/* Email */}
              <div className="form-group">
                <label htmlFor="track-email" className="form-label">
                  Your Email Address <span className="form-required" aria-hidden="true">*</span>
                </label>
                <div className="input-icon-wrapper">
                  <Mail size={16} className="input-icon" aria-hidden="true" />
                  <input
                    id="track-email"
                    type="email"
                    className={`input-field input-field--icon-left${fieldErrors.email ? ' input-field--error' : ''}`}
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: undefined })); }}
                    disabled={isLoading}
                    aria-required="true"
                    aria-describedby={fieldErrors.email ? 'track-email-error' : undefined}
                    autoComplete="email"
                  />
                </div>
                {fieldErrors.email && (
                  <p id="track-email-error" className="field-error" role="alert">{fieldErrors.email}</p>
                )}
              </div>

              {/* Reference ID */}
              <div className="form-group">
                <label htmlFor="track-ref" className="form-label">
                  Application Reference ID <span className="form-required" aria-hidden="true">*</span>
                </label>
                <div className="input-icon-wrapper">
                  <Hash size={16} className="input-icon" aria-hidden="true" />
                  <input
                    id="track-ref"
                    type="text"
                    className={`input-field input-field--icon-left${fieldErrors.referenceId ? ' input-field--error' : ''}`}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    value={referenceId}
                    onChange={(e) => { setReferenceId(e.target.value); setFieldErrors((p) => ({ ...p, referenceId: undefined })); }}
                    disabled={isLoading}
                    aria-required="true"
                    aria-describedby={fieldErrors.referenceId ? 'track-ref-error' : 'track-ref-helper'}
                    spellCheck={false}
                  />
                </div>
                {fieldErrors.referenceId ? (
                  <p id="track-ref-error" className="field-error" role="alert">{fieldErrors.referenceId}</p>
                ) : (
                  <p id="track-ref-helper" className="form-helper">
                    The UUID displayed on your application confirmation screen upon submission.
                  </p>
                )}
              </div>

              {/* Not Found State */}
              {notFound && (
                <div className="track-not-found" role="alert">
                  <AlertCircle size={16} />
                  <div>
                    <strong>No application found</strong>
                    <p>We couldn't find an application matching the email and reference ID you provided. Please double-check and try again.</p>
                  </div>
                </div>
              )}

              {/* API Error */}
              {apiError && (
                <div className="track-not-found" role="alert">
                  <AlertCircle size={16} />
                  <div>
                    <strong>Something went wrong</strong>
                    <p>{apiError}</p>
                  </div>
                </div>
              )}

              <button
                id="track-submit-btn"
                type="submit"
                className="btn-primary track-form-card__submit"
                disabled={isLoading}
                aria-busy={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="spin" aria-hidden="true" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search size={16} aria-hidden="true" />
                    Track Application
                  </>
                )}
              </button>
            </form>
          </section>
        )}

        {/* Result Card */}
        {result && status && (
          <section className="glass-card track-result-card" aria-label="Application tracking result" aria-live="polite">
            <div className="track-result-card__header">
              <div className="track-result-card__status-dot" style={{ background: status.color }} />
              <div>
                <span className="track-result-card__label">Application Status</span>
                <span
                  className="track-result-card__status-badge"
                  style={{ color: status.color, background: status.bg }}
                >
                  {status.label}
                </span>
              </div>
            </div>

            <h2 className="track-result-card__position">{result.positionTitle}</h2>
            <p className="track-result-card__dept">
              <Building2 size={14} aria-hidden="true" />
              {result.department}
            </p>

            <div className="track-result-grid">
              <div className="track-result-item">
                <span className="track-result-item__label">
                  <Layers size={13} aria-hidden="true" />
                  Current Stage
                </span>
                <span className="track-result-item__value">{result.currentStageName}</span>
                <span className="track-result-item__sub">Step {result.currentStageSequenceOrder}</span>
              </div>

              <div className="track-result-item">
                <span className="track-result-item__label">
                  <Calendar size={13} aria-hidden="true" />
                  Applied On
                </span>
                <span className="track-result-item__value">{formatDate(result.createdAt)}</span>
              </div>

              <div className="track-result-item">
                <span className="track-result-item__label">
                  <RefreshCw size={13} aria-hidden="true" />
                  Last Updated
                </span>
                <span className="track-result-item__value">{formatDate(result.updatedAt)}</span>
              </div>

              <div className="track-result-item">
                <span className="track-result-item__label">
                  <Hash size={13} aria-hidden="true" />
                  Reference ID
                </span>
                <span className="track-result-item__value track-result-item__ref" title={result.referenceId}>
                  {result.referenceId.slice(0, 8)}…
                </span>
              </div>
            </div>

            <p className="track-result-card__note">
              All application decisions are made by our hiring team. We will contact you directly when there are updates.
            </p>

            <div className="track-result-card__actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleReset}
                id="track-search-again-btn"
              >
                Search Again
              </button>
              <Link to="/careers" className="btn-ghost track-result-card__link">
                Browse Open Roles
                <ArrowRight size={15} />
              </Link>
            </div>
          </section>
        )}

        {/* Help note */}
        <aside className="track-page__help glass-card">
          <h3 className="track-page__help-title">Need Help?</h3>
          <p>
            If you did not save your reference ID, check your application confirmation screen or reach out via our{' '}
            <Link to="/contact" className="inline-link">Contact page</Link> or{' '}
            <Link to="/faq" className="inline-link">FAQ</Link>.
          </p>
        </aside>
      </div>
    </div>
  );
};

export default TrackApplicationPage;
