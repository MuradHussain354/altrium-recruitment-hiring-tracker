import React, { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { managerReportsApi } from '../../api/managerReports.api';
import { OverviewReport, ReportFilters } from '../../types/manager';
import { OverviewStatCard } from '../../components/manager/OverviewStatCard';
import { ReportFilterBar } from '../../components/manager/ReportFilterBar';
import {
  ShieldCheck,
  Briefcase,
  FileText,
  Users,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Video,
  MapPin
} from 'lucide-react';

export const ManagerDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [report, setReport] = useState<OverviewReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async (filters?: ReportFilters) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await managerReportsApi.getOverviewReport(filters);
      setReport(res.data);
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load executive overview report.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  return (
    <div>
      {/* Banner */}
      <div className="glass-card" style={{ padding: '28px 32px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <span className="badge badge-indigo">
            <ShieldCheck size={14} /> Manager Executive Portal
          </span>
        </div>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
          Welcome back, {user?.name}!
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0 }}>
          Executive oversight of position requisitions, application volume, candidate pipeline, and evaluation metrics.
        </p>
      </div>

      {/* Filter Bar */}
      <ReportFilterBar onApplyFilters={fetchOverview} isLoading={isLoading} />

      {error && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#f87171'
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Primary Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        <OverviewStatCard
          title="Total Positions"
          value={isLoading ? '...' : report?.positions.total ?? 0}
          subtitle={`Open: ${report?.positions.byStatus.Open ?? 0} | Draft: ${report?.positions.byStatus.Draft ?? 0}`}
          icon={<Briefcase size={20} />}
          color="var(--primary)"
        />

        <OverviewStatCard
          title="Total Applications"
          value={isLoading ? '...' : report?.applications.total ?? 0}
          subtitle={`In Progress: ${report?.applications.byStatus.InProgress ?? 0} | Hired: ${report?.applications.byStatus.Hired ?? 0}`}
          icon={<FileText size={20} />}
          color="var(--accent-cyan)"
        />

        <OverviewStatCard
          title="Candidates Registered"
          value={isLoading ? '...' : report?.candidates.total ?? 0}
          subtitle="Unique candidate profiles"
          icon={<Users size={20} />}
          color="var(--accent-indigo)"
        />

        <OverviewStatCard
          title="Interviews Conducted"
          value={isLoading ? '...' : report?.interviews.total ?? 0}
          subtitle={`Scheduled: ${report?.interviews.byStatus.Scheduled ?? 0} | Completed: ${report?.interviews.byStatus.Completed ?? 0}`}
          icon={<Calendar size={20} />}
          color="var(--accent-amber)"
        />

        <OverviewStatCard
          title="Feedback Submitted"
          value={isLoading ? '...' : report?.feedback.totalSubmitted ?? 0}
          subtitle="Evaluations completed by panel"
          icon={<CheckCircle2 size={20} />}
          color="var(--accent-emerald)"
        />
      </div>

      {/* Upcoming Interview Logistics Schedule (NO PII) */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
            Upcoming Interview Logistics Schedule
          </h3>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Operational schedule of upcoming interviews (Candidate PII excluded per privacy protocol)
          </span>
        </div>

        {isLoading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading interview logistics schedule...
          </div>
        ) : !report?.upcomingInterviews || report.upcomingInterviews.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '0.9rem' }}>
            No upcoming scheduled interviews found for current filter criteria.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {report.upcomingInterviews.map((item) => {
              const formattedDate = item.scheduledAt
                ? new Date(item.scheduledAt).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })
                : 'Not scheduled';

              return (
                <div
                  key={item.id}
                  style={{
                    padding: '16px 20px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                      Position: {item.positionTitle}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span>Stage: <strong>{item.stageName}</strong></span>
                      {item.location && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={14} /> {item.location}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: '4px' }}>
                      {formattedDate}
                    </div>
                    {item.meetingLink && (
                      <a
                        href={item.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '0.78rem', color: 'var(--primary-light)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Video size={12} /> Meeting Link
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManagerDashboardPage;
