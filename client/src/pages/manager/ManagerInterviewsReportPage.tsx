import React, { useEffect, useState } from 'react';
import { managerReportsApi } from '../../api/managerReports.api';
import { InterviewsReport, ReportFilters } from '../../types/manager';
import { ReportFilterBar } from '../../components/manager/ReportFilterBar';
import { OverviewStatCard } from '../../components/manager/OverviewStatCard';
import { Calendar, AlertCircle, Video, MapPin, Users } from 'lucide-react';

export const ManagerInterviewsReportPage: React.FC = () => {
  const [report, setReport] = useState<InterviewsReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async (filters?: ReportFilters) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await managerReportsApi.getInterviewsReport(filters);
      setReport(res.data);
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load interviews report.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar color="var(--accent-amber)" size={24} /> Interview Logistics & Schedule Report
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
            Comprehensive status totals and operational schedules across all positions (PII excluded).
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <ReportFilterBar onApplyFilters={fetchReport} isLoading={isLoading} />

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

      {/* Metrics Header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        <OverviewStatCard
          title="Total Interviews"
          value={isLoading ? '...' : report?.total ?? 0}
          subtitle="All recorded evaluation sessions"
          icon={<Calendar size={20} />}
          color="var(--primary)"
        />

        <OverviewStatCard
          title="Scheduled"
          value={isLoading ? '...' : report?.byStatus.Scheduled ?? 0}
          subtitle="Upcoming or pending sessions"
          icon={<Calendar size={20} />}
          color="var(--accent-cyan)"
        />

        <OverviewStatCard
          title="Completed"
          value={isLoading ? '...' : report?.byStatus.Completed ?? 0}
          subtitle="Successfully conducted"
          icon={<Calendar size={20} />}
          color="var(--accent-emerald)"
        />

        <OverviewStatCard
          title="Cancelled"
          value={isLoading ? '...' : report?.byStatus.Cancelled ?? 0}
          subtitle="Cancelled sessions"
          icon={<Calendar size={20} />}
          color="#f87171"
        />
      </div>

      {/* Interviews Schedule Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading interview logistics schedule...
          </div>
        ) : !report?.interviews || report.interviews.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-subtle)' }}>
            No interview records match current filter criteria.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                <th style={{ padding: '14px 20px', color: 'var(--text-muted)', fontWeight: 600 }}>Position & Department</th>
                <th style={{ padding: '14px 20px', color: 'var(--text-muted)', fontWeight: 600 }}>Stage</th>
                <th style={{ padding: '14px 20px', color: 'var(--text-muted)', fontWeight: 600 }}>Schedule & Location</th>
                <th style={{ padding: '14px 20px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>Panel Count</th>
                <th style={{ padding: '14px 20px', color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {report.interviews.map((item) => {
                const formattedDate = item.scheduledAt
                  ? new Date(item.scheduledAt).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })
                  : 'Not scheduled';

                const badgeClass =
                  item.status === 'Completed'
                    ? 'badge-emerald'
                    : item.status === 'Cancelled'
                    ? 'badge-amber'
                    : 'badge-cyan';

                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                    <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-main)' }}>
                      <div>{item.positionTitle}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)' }}>{item.department}</div>
                    </td>
                    <td style={{ padding: '14px 20px', color: 'var(--text-main)' }}>
                      {item.stageName}
                    </td>
                    <td style={{ padding: '14px 20px', color: 'var(--text-main)' }}>
                      <div>{formattedDate}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '2px' }}>
                        {item.location && (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={12} /> {item.location}
                          </span>
                        )}
                        {item.meetingLink && (
                          <a href={item.meetingLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Video size={12} /> Link
                          </a>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'center', fontWeight: 600, color: 'var(--text-main)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={14} color="var(--text-muted)" /> {item.interviewerCount}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span className={`badge ${badgeClass}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ManagerInterviewsReportPage;
