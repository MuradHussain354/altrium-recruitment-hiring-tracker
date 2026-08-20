import React, { useEffect, useState } from 'react';
import { managerReportsApi } from '../../api/managerReports.api';
import { PipelineReportItem, ReportFilters } from '../../types/manager';
import { ReportFilterBar } from '../../components/manager/ReportFilterBar';
import { GitMerge, AlertCircle, Layers } from 'lucide-react';

export const ManagerPipelineReportPage: React.FC = () => {
  const [pipeline, setPipeline] = useState<PipelineReportItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async (filters?: ReportFilters) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await managerReportsApi.getPipelineReport(filters);
      setPipeline(res.data);
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load pipeline report.');
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
            <GitMerge color="var(--accent-cyan)" size={24} /> Recruitment Pipeline Report
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
            Current distribution of candidate application volume across workflow pipeline stages.
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

      {/* Pipeline Cards Grid */}
      {isLoading ? (
        <div className="glass-card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading recruitment pipeline report...
        </div>
      ) : pipeline.length === 0 ? (
        <div className="glass-card" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-subtle)' }}>
          No position pipelines match current filter criteria.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {pipeline.map((p) => (
            <div key={p.positionId} className="glass-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                    {p.positionTitle}
                  </h3>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Department: <strong>{p.department}</strong> | Status: <span className="badge badge-cyan" style={{ fontSize: '0.72rem' }}>{p.status}</span>
                  </span>
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary-light)', backgroundColor: 'rgba(99, 102, 241, 0.12)', padding: '6px 14px', borderRadius: '20px' }}>
                  Total Active Apps: {p.totalApplications}
                </div>
              </div>

              {/* Stages Visual Funnel */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                {p.stages.map((stage) => (
                  <div
                    key={stage.stageId}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-subtle)',
                      position: 'relative'
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Step #{stage.sequenceOrder}
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
                      {stage.stageName}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Layers size={14} /> Applicants
                      </span>
                      <span style={{ fontSize: '1.2rem', fontWeight: 800, color: stage.applicationCount > 0 ? 'var(--accent-emerald)' : 'var(--text-subtle)' }}>
                        {stage.applicationCount}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManagerPipelineReportPage;
