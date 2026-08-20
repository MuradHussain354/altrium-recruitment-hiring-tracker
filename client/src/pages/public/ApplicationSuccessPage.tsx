import React from 'react';
import { useLocation, Link, Navigate } from 'react-router-dom';
import {
  CheckCircle2,
  Briefcase,
  Copy,
  Check,
  Building2,
  ArrowRight,
  Home,
} from 'lucide-react';
import { SubmittedApplication, PublicPosition } from '../../types/careers';

interface LocationState {
  application?: SubmittedApplication;
  position?: PublicPosition | null;
}

export const ApplicationSuccessPage: React.FC = () => {
  const location = useLocation();
  const state = location.state as LocationState | undefined;
  const [copied, setCopied] = React.useState(false);

  const application = state?.application;
  const position = state?.position;

  // If directly navigated without submission state, redirect to /careers
  if (!application) {
    return <Navigate to="/careers" replace />;
  }

  const handleCopyReference = () => {
    if (application.id) {
      navigator.clipboard.writeText(application.id).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  };

  return (
    <div className="container" style={{ maxWidth: '680px', margin: '40px auto', padding: '0 16px' }}>
      <article className="glass-card success-card" aria-label="Application submission confirmation">
        {/* Success Icon */}
        <div className="success-card__icon" aria-hidden="true">
          <CheckCircle2 size={48} />
        </div>

        {/* Heading */}
        <h1 className="success-card__title">Application Submitted!</h1>
        <p className="success-card__subtitle">
          Thank you for your interest in joining Altrium. Your application has been received and
          our hiring team will review your qualifications.
        </p>

        {/* Position Details if available */}
        {(position || application.position) && (
          <div className="success-card__job-info">
            <span className="badge badge-indigo">
              <Building2 size={12} />
              {position?.department || application.position?.department}
            </span>
            <h2 className="success-card__job-title">
              {position?.title || application.position?.title}
            </h2>
          </div>
        )}

        {/* Reference ID Block */}
        <div className="success-card__reference" role="region" aria-label="Application reference">
          <p className="success-card__reference-label">Your Application Reference</p>
          <div className="success-card__reference-box">
            <code className="ref-code" id="application-reference-id">
              {application.id}
            </code>
            <button
              type="button"
              className="btn-ghost success-card__copy-btn"
              onClick={handleCopyReference}
              aria-label="Copy reference ID to clipboard"
            >
              {copied ? (
                <>
                  <Check size={14} style={{ color: 'var(--accent-emerald)' }} />
                  <span style={{ color: 'var(--accent-emerald)', fontSize: '0.8rem' }}>Copied</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span style={{ fontSize: '0.8rem' }}>Copy</span>
                </>
              )}
            </button>
          </div>
          <p className="success-card__reference-hint">
            Please keep this reference for any future correspondence with our recruitment team.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="success-card__actions">
          <Link
            to="/careers"
            id="success-browse-more-btn"
            className="btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Briefcase size={16} />
            Browse More Openings
            <ArrowRight size={16} />
          </Link>

          <Link
            to="/"
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Home size={16} />
            Back to Home
          </Link>
        </div>
      </article>
    </div>
  );
};

export default ApplicationSuccessPage;
