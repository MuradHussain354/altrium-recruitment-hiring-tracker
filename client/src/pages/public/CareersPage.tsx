import React, { useState, useEffect, useCallback } from 'react';
import { Briefcase, Loader2, RefreshCw } from 'lucide-react';
import { PublicPosition, PublicPositionFilters } from '../../types/careers';
import { getPublicPositions } from '../../api/publicCareers.api';
import JobCard from '../../components/careers/JobCard';
import JobFilters from '../../components/careers/JobFilters';
import ErrorBanner from '../../components/ui/ErrorBanner';

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
          Explore all open roles and find where you can make an impact.
        </p>
      </header>

      {/* Filter Toolbar */}
      <section className="careers-toolbar">
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
              : 'There are currently no open positions listed. Please check back later.'}
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
    </div>
  );
};

export default CareersPage;
