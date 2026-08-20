import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Users,
  Loader2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { PublicPosition, PublicApplicationResponse } from '../../types/careers';
import { getPublicPosition } from '../../api/publicCareers.api';
import ApplicationForm from '../../components/careers/ApplicationForm';
import ErrorBanner from '../../components/ui/ErrorBanner';

export const ApplicationPage: React.FC = () => {
  const { positionId } = useParams<{ positionId: string }>();
  const navigate = useNavigate();

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
            setError(err?.message || 'Failed to load position information.');
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

  const handleApplicationSuccess = (result: PublicApplicationResponse) => {
    navigate('/application-success', {
      replace: true,
      state: {
        application: result.data,
        position,
      },
    });
  };

  return (
    <div className="container application-page">
      {/* Navigation */}
      <div style={{ marginBottom: '24px' }}>
        <Link
          to={positionId ? `/careers/${positionId}` : '/careers'}
          className="btn-ghost"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <ArrowLeft size={16} />
          {position ? `Back to ${position.title}` : 'Back to Openings'}
        </Link>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="careers-loading" role="status" aria-live="polite">
          <Loader2 size={32} className="spin" style={{ color: 'var(--primary)', marginBottom: '12px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading application details...</p>
        </div>
      )}

      {/* 404 / Unavailable State */}
      {!isLoading && notFound && (
        <div className="careers-empty glass-card" role="alert">
          <AlertCircle size={40} style={{ color: 'var(--accent-rose)', marginBottom: '16px' }} />
          <h1 style={{ fontSize: '1.4rem', marginBottom: '8px', color: 'var(--text-main)' }}>
            Position Unavailable
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '480px', margin: '0 auto 20px' }}>
            The position you are trying to apply for is either closed or no longer accepting applications.
          </p>
          <Link to="/careers" className="btn-primary">
            Explore Open Positions
          </Link>
        </div>
      )}

      {/* Error State */}
      {!isLoading && !notFound && error && (
        <div style={{ marginBottom: '24px' }}>
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        </div>
      )}

      {/* Application Form & Job Summary */}
      {!isLoading && !notFound && position && (
        <div className="application-layout">
          {/* Job Summary Sidebar Card */}
          <aside className="glass-card application-summary" aria-labelledby="app-summary-title">
            <div className="application-summary__header">
              <span className="badge badge-indigo">
                <Building2 size={12} />
                {position.department}
              </span>
              <span className="badge badge-cyan">
                <Users size={12} />
                {position.headcount} {position.headcount === 1 ? 'Opening' : 'Openings'}
              </span>
            </div>

            <h2 id="app-summary-title" className="application-summary__title">
              {position.title}
            </h2>

            <p className="application-summary__desc">
              {position.description.length > 200
                ? `${position.description.slice(0, 200)}...`
                : position.description}
            </p>

            <Link
              to={`/careers/${position.id}`}
              className="btn-ghost"
              style={{ fontSize: '0.85rem', padding: '6px 12px', marginTop: '12px' }}
            >
              <FileText size={14} />
              View full role details
            </Link>
          </aside>

          {/* Form Card */}
          <main className="glass-card application-form-card" aria-labelledby="app-form-title">
            <header style={{ marginBottom: '24px' }}>
              <h1 id="app-form-title" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                Submit Your Application
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Please fill in the information below. We will review your profile and reach out.
              </p>
            </header>

            <ApplicationForm
              position={position}
              onSuccess={handleApplicationSuccess}
            />
          </main>
        </div>
      )}
    </div>
  );
};

export default ApplicationPage;
