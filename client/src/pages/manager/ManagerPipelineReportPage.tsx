import React, { useEffect, useState } from 'react';
import { managerReportsApi } from '../../api/managerReports.api';
import { hrApplicationsApi } from '../../api/hrApplications.api';
import { PipelineReportItem, ReportFilters } from '../../types/manager';
import { Application } from '../../types/hr';
import { ReportFilterBar } from '../../components/manager/ReportFilterBar';
import { GitMerge, AlertCircle, Layers, X, User, ArrowRight } from 'lucide-react';

export const ManagerPipelineReportPage: React.FC = () => {
  const [pipeline, setPipeline] = useState<PipelineReportItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Drilldown Modal State (S2-28)
  const [selectedStageDrilldown, setSelectedStageDrilldown] = useState<{
    positionId: string;
    positionTitle: string;
    stageId: string;
    stageName: string;
  } | null>(null);
  const [drilldownApplications, setDrilldownApplications] = useState<Application[]>([]);
  const [isDrilldownLoading, setIsDrilldownLoading] = useState(false);

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

  const handleStageClick = async (positionId: string, positionTitle: string, stageId: string, stageName: string) => {
    setSelectedStageDrilldown({ positionId, positionTitle, stageId, stageName });
    setIsDrilldownLoading(true);
    try {
      const res = await hrApplicationsApi.listApplications({ positionId, stageId });
      const matched = (res.data || []).filter(
        (app) => !stageId || app.currentStageId === stageId || app.currentStage?.id === stageId
      );
      setDrilldownApplications(matched);
    } catch {
      setDrilldownApplications([]);
    } finally {
      setIsDrilldownLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <GitMerge color="var(--accent-cyan)" size={24} /> Recruitment Pipeline Report
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
            Current distribution of candidate application volume across workflow pipeline stages. Click any stage to drill down into active candidates.
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

              {/* Stages Visual Funnel with Clickable Drilldown */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                {p.stages.map((stage) => (
                  <div
                    key={stage.stageId}
                    onClick={() => handleStageClick(p.positionId, p.positionTitle, stage.stageId, stage.stageName)}
                    title="Click to drill down into candidates at this stage"
                    style={{
                      padding: '14px 16px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-subtle)',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'transform 0.15s ease, border-color 0.15s ease, background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.borderColor = 'var(--primary)';
                      e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.06)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.borderColor = 'var(--border-subtle)';
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
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

      {/* Drilldown Modal (S2-28) */}
      {selectedStageDrilldown && (
        <div className="modal-backdrop" onClick={() => setSelectedStageDrilldown(null)}>
          <div
            className="modal-container"
            style={{ maxWidth: '640px', maxHeight: '85vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Pipeline Drill-Down
                </span>
                <h3 style={{ fontSize: '1.2rem', margin: '2px 0 0 0' }}>
                  {selectedStageDrilldown.positionTitle} &gt; {selectedStageDrilldown.stageName}
                </h3>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedStageDrilldown(null)}>✕</button>
            </div>

            <div className="modal-body">
              {isDrilldownLoading ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  <div className="spinner" />
                  <p>Loading candidates at this stage...</p>
                </div>
              ) : drilldownApplications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  <User size={36} style={{ opacity: 0.3, marginBottom: '8px' }} />
                  <p>No candidate applications currently at this stage.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Showing <strong>{drilldownApplications.length}</strong> candidate(s) currently active in <strong>{selectedStageDrilldown.stageName}</strong>:
                  </div>
                  {drilldownApplications.map((app) => (
                    <div
                      key={app.id}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                          {app.candidate?.name || 'Candidate'}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {app.candidate?.email} {app.candidate?.phone && `• ${app.candidate.phone}`}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-subtle)', marginTop: '2px' }}>
                          Applied: {new Date(app.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '12px',
                          background: app.status === 'Hired' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)',
                          color: app.status === 'Hired' ? '#10b981' : '#3b82f6',
                        }}
                      >
                        {app.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedStageDrilldown(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerPipelineReportPage;
