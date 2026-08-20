import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Users,
  Clock,
  Sparkles,
  ArrowRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { PublicPosition } from '../../types/careers';
import { getPublicPosition } from '../../api/publicCareers.api';
import ErrorBanner from '../../components/ui/ErrorBanner';

function formatFullDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export const JobDetailPage: React.FC = () => {
  const { positionId } = useParams<{ positionId: string }>();
  const [position, setPosition] = useState<PublicPosition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!positionId) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);
    setNotFound(false);

    getPublicPosition(positionId)
      .then((response) => {
        if (isMounted) {
          setPosition(response.data);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          if (err?.message?.includes('not found') || err?.error === 'NotFound') {
            setNotFound(true);
          } else {
            setError(err?.message || 'Failed to load position details.');
          }
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [positionId]);

  return (
    <div className="container job-detail-page">
      {/* Back link */}
      <div style={{ marginBottom: '24px' }}>
        <Link to="/careers" className="btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <ArrowLeft size={16} />
          Back to all openings
        </Link>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="careers-loading" role="status" aria-live="polite">
          <Loader2 size={32} className="spin" style={{ color: 'var(--primary)', marginBottom: '12px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading position details...</p>
        </div>
      )}

      {/* 404 / Not Found State */}
      {!isLoading && notFound && (
        <div className="careers-empty glass-card" role="alert">
          <AlertCircle size={40} style={{ color: 'var(--accent-rose)', marginBottom: '16px' }} />
          <h1 style={{ fontSize: '1.4rem', marginBottom: '8px', color: 'var(--text-main)' }}>
            Position Not Available
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '480px', margin: '0 auto 20px' }}>
            This job position is either not found or is no longer accepting new applications.
          </p>
          <Link to="/careers" className="btn-primary">
            Explore Other Openings
          </Link>
        </div>
      )}

      {/* Error State */}
      {!isLoading && !notFound && error && (
        <div style={{ marginBottom: '24px' }}>
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        </div>
      )}

      {/* Job Details Content */}
      {!isLoading && !notFound && position && (
        <article className="glass-card job-detail-card">
          {/* Header */}
          <header className="job-detail-header">
            <div className="job-detail-badges">
              <span className="badge badge-indigo">
                <Building2 size={13} />
                {position.department}
              </span>
              <span className="badge badge-cyan">
                <Users size={13} />
                {position.headcount} {position.headcount === 1 ? 'Opening' : 'Openings'}
              </span>
              <span className="job-detail-date">
                <Clock size={13} />
                Posted on {formatFullDate(position.createdAt)}
              </span>
            </div>

            <h1 className="job-detail-title">{position.title}</h1>
          </header>

          <hr className="detail-divider" />

          {/* Description */}
          <section className="job-detail-section" aria-labelledby="job-desc-heading">
            <h2 id="job-desc-heading" className="detail-section-title">
              Role Overview
            </h2>
            <div className="job-detail-description">
              {position.description}
            </div>
          </section>

          {/* Required Skills */}
          {position.requiredSkills && position.requiredSkills.trim() !== '' && (
            <>
              <hr className="detail-divider" />
              <section className="job-detail-section" aria-labelledby="job-skills-heading">
                <h2 id="job-skills-heading" className="detail-section-title">
                  <Sparkles size={16} style={{ color: 'var(--accent-cyan)' }} />
                  Required Skills & Qualifications
                </h2>
                <div className="job-detail-skills">
                  {position.requiredSkills.split(',').map((skill, idx) => {
                    const cleanSkill = skill.trim();
                    if (!cleanSkill) return null;
                    return (
                      <span key={idx} className="skills-tag">
                        {cleanSkill}
                      </span>
                    );
                  })}
                </div>
              </section>
            </>
          )}

          <hr className="detail-divider" />

          {/* Action Bar */}
          <footer className="job-detail-footer">
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-subtle)' }}>
                Ready to take the next step in your career?
              </p>
              <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', fontWeight: 600 }}>
                Apply for this role today
              </h3>
            </div>
            <Link
              to={`/careers/${position.id}/apply`}
              id="job-detail-apply-btn"
              className="btn-primary"
              style={{ padding: '12px 28px', fontSize: '1rem' }}
            >
              Apply Now
              <ArrowRight size={18} />
            </Link>
          </footer>
        </article>
      )}
    </div>
  );
};

export default JobDetailPage;
