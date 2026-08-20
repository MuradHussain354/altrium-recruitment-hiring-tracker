import React, { useEffect, useState } from 'react';
import { managerReportsApi } from '../../api/managerReports.api';
import { PositionReportItem, ReportFilters } from '../../types/manager';
import { ReportFilterBar } from '../../components/manager/ReportFilterBar';
import { Briefcase, AlertCircle } from 'lucide-react';

export const ManagerPositionsReportPage: React.FC = () => {
  const [positions, setPositions] = useState<PositionReportItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async (filters?: ReportFilters) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await managerReportsApi.getPositionsReport(filters);
      setPositions(res.data);
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load position report.');
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
            <Briefcase color="var(--primary)" size={24} /> Position Requisition Report
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
            Per-position application funnel, headcount, and interview volume analysis.
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

      {/* Report Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading position report data...
          </div>
        ) : positions.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-subtle)' }}>
            No position data matches current filter criteria.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                <th style={{ padding: '14px 20px', color: 'var(--text-muted)', fontWeight: 600 }}>Position Title</th>
                <th style={{ padding: '14px 20px', color: 'var(--text-muted)', fontWeight: 600 }}>Department</th>
                <th style={{ padding: '14px 20px', color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '14px 20px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>Headcount</th>
                <th style={{ padding: '14px 20px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>Total Apps</th>
                <th style={{ padding: '14px 20px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>In Progress</th>
                <th style={{ padding: '14px 20px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>Hired</th>
                <th style={{ padding: '14px 20px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>Rejected</th>
                <th style={{ padding: '14px 20px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>Interviews</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => {
                const badgeClass =
                  p.status === 'Open'
                    ? 'badge-emerald'
                    : p.status === 'Draft'
                    ? 'badge-amber'
                    : 'badge-cyan';

                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                    <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-main)' }}>
                      {p.title}
                    </td>
                    <td style={{ padding: '14px 20px', color: 'var(--text-main)' }}>
                      {p.department}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span className={`badge ${badgeClass}`}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'center', fontWeight: 600, color: 'var(--text-main)' }}>
                      {p.headcount}
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'center', fontWeight: 700, color: 'var(--primary-light)' }}>
                      {p.totalApplications}
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'center', color: 'var(--accent-cyan)' }}>
                      {p.inProgressApplications}
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'center', color: 'var(--accent-emerald)', fontWeight: 700 }}>
                      {p.hiredApplications}
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'center', color: '#f87171' }}>
                      {p.rejectedApplications}
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'center', color: 'var(--accent-amber)', fontWeight: 600 }}>
                      {p.interviewCount}
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

export default ManagerPositionsReportPage;
