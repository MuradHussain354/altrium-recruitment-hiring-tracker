import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Loader2,
  RefreshCw,
  Search,
  CheckCircle2,
  FileCheck,
  Users,
  Award,
  Zap,
  HeartHandshake,
  Compass,
  ArrowRight,
} from 'lucide-react';
import { PublicPosition, PublicPositionFilters } from '../../types/careers';
import { getPublicPositions } from '../../api/publicCareers.api';
import JobCard from '../../components/careers/JobCard';
import JobFilters from '../../components/careers/JobFilters';
import JobAlertSection from '../../components/careers/JobAlertSection';
import ErrorBanner from '../../components/ui/ErrorBanner';

const HIRING_STEPS = [
  {
    step: '01',
    title: 'Submit Application',
    desc: "Select an open role that aligns with your expertise and submit your resume and profile details. After submission, you'll receive a unique Reference ID that you can use to track your application.",
    icon: FileCheck,
  },
  {
    step: '02',
    title: 'Profile & Skills Review',
    desc: 'Our recruiting team and technical leads evaluate your background against position requirements to assess potential fit.',
    icon: Search,
  },
  {
    step: '03',
    title: 'Structured Evaluations',
    desc: 'Participate in structured interviews and role-specific evaluations as part of the hiring process.',
    icon: Users,
  },
  {
    step: '04',
    title: 'Decision & Communication',
    desc: 'Successful candidates receive an offer and next steps. All candidates receive clear, timely status updates on their application.',
    icon: Award,
  },
];

const WHY_JOIN_US = [
  {
    title: 'High-Impact Ownership',
    desc: 'Collaborate on meaningful projects with clear ownership, team support, and direct visibility into outcomes.',
    icon: Zap,
  },
  {
    title: 'Engineering Rigor',
    desc: 'Thrive in an environment valuing clean code, robust architecture, and data-driven decision making.',
    icon: Compass,
  },
  {
    title: 'Transparent Culture',
    desc: 'Clear hiring milestones, open communication channels, and collaborative cross-functional feedback.',
    icon: HeartHandshake,
  },
  {
    title: 'Continuous Growth',
    desc: 'Grow through constructive feedback, collaborative team reviews, and dedicated opportunities to expand your skills.',
    icon: CheckCircle2,
  },
];

export const CareersPage: React.FC = () => {
  const [positions, setPositions] = useState<PublicPosition[]>([]);
  const [filters, setFilters] = useState<PublicPositionFilters>({ search: '', department: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPositions = useCallback(async (currentFilters: PublicPositionFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getPublicPositions(currentFilters);
      setPositions(response.data);
    } catch (err: any) {
      setError(
        err?.message || 'Failed to load open positions. Please check your connection and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced filter effect (~400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPositions(filters);
    }, 400);

    return () => clearTimeout(timer);
  }, [filters, fetchPositions]);

  const handleFilterChange = (updated: PublicPositionFilters) => {
    setFilters(updated);
  };

  const handleRetry = () => {
    fetchPositions(filters);
  };

  return (
    <div className="container careers-page">
      {/* Page Header */}
      <header className="page-hero">
        <div className="page-hero__badge">
          <Briefcase size={14} />
          Opportunities
        </div>
        <h1 className="page-hero__title">Current Openings</h1>
        <p className="page-hero__subtitle">
          Explore all open roles and find where you can make an enduring impact.
        </p>
      </header>

      {/* Returning Applicant Quick Banner */}
      <aside className="careers-track-banner glass-card" aria-label="Application tracking quick link">
        <div className="careers-track-banner__content">
          <div className="careers-track-banner__text">
            <strong>Already applied for a position?</strong>
            <span> Check your status and current stage anytime using your Reference ID.</span>
          </div>
          <Link to="/track" className="btn-secondary careers-track-banner__btn">
            <Search size={14} />
            Track My Application
          </Link>
        </div>
      </aside>

      {/* Filter Toolbar */}
      <section className="careers-toolbar" aria-label="Search and filter openings">
        <JobFilters
          filters={filters}
          onChange={handleFilterChange}
          isLoading={isLoading}
        />
      </section>

      {/* Error State */}
      {error && (
        <div style={{ marginBottom: '24px' }}>
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
          <div style={{ marginTop: '12px', textAlign: 'center' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleRetry}
              style={{ fontSize: '0.85rem' }}
            >
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="careers-loading" role="status" aria-live="polite">
          <Loader2 size={32} className="spin" style={{ color: 'var(--primary)', marginBottom: '12px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Searching open positions...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && positions.length === 0 && (
        <div className="careers-empty glass-card" role="region" aria-label="No positions found">
          <Briefcase size={40} style={{ color: 'var(--text-subtle)', marginBottom: '16px' }} />
          <h2 style={{ fontSize: '1.2rem', marginBottom: '8px', color: 'var(--text-main)' }}>
            No open positions found
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto 16px' }}>
            {filters.search || filters.department
              ? 'Try adjusting your search criteria or clearing filters to see all available roles.'
              : 'There are currently no open positions listed. Please check back later or subscribe to alerts below.'}
          </p>
          {(filters.search || filters.department) && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setFilters({ search: '', department: '' })}
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Position Cards Grid */}
      {!isLoading && !error && positions.length > 0 && (
        <section className="careers-grid" aria-label="Job openings list">
          {positions.map((position) => (
            <JobCard key={position.id} position={position} />
          ))}
        </section>
      )}

      {/* Hiring Process Section */}
      <section className="careers-process-section">
        <div className="home-section__header" style={{ marginBottom: '32px' }}>
          <div className="page-hero__badge" style={{ margin: '0 auto 12px' }}>
            <FileCheck size={14} />
            Transparency
          </div>
          <h2 className="home-section__title">Our Hiring Process</h2>
          <p className="home-section__subtitle">
            A structured hiring journey designed to provide clear stages and consistent evaluation.
          </p>
        </div>

        <div className="careers-process-steps">
          {HIRING_STEPS.map((stepItem, idx) => {
            const Icon = stepItem.icon;
            return (
              <div key={idx} className="careers-process-card glass-card">
                <div className="careers-process-card__header">
                  <span className="careers-process-card__step">{stepItem.step}</span>
                  <div className="careers-process-card__icon">
                    <Icon size={18} />
                  </div>
                </div>
                <h3 className="careers-process-card__title">{stepItem.title}</h3>
                <p className="careers-process-card__desc">{stepItem.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Why Work at Altrium Section */}
      <section className="careers-why-section">
        <div className="home-section__header" style={{ marginBottom: '32px' }}>
          <div className="page-hero__badge" style={{ margin: '0 auto 12px' }}>
            <Zap size={14} />
            Culture & Perks
          </div>
          <h2 className="home-section__title">Why Build Your Career at Altrium</h2>
          <p className="home-section__subtitle">
            We empower our people with the trust, resources, and freedom needed to do their best work.
          </p>
        </div>

        <div className="careers-why-grid">
          {WHY_JOIN_US.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="careers-why-card glass-card">
                <div className="careers-why-card__icon">
                  <Icon size={20} />
                </div>
                <h3 className="careers-why-card__title">{item.title}</h3>
                <p className="careers-why-card__desc">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Job Alert Subscription Section */}
      <JobAlertSection />
    </div>
  );
};

export default CareersPage;
