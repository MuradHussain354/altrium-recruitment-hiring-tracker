import React, { useEffect, useState } from 'react';
import { getCrossTeamAnalytics, getHeadcountFulfillmentReport } from '../../api/batch2.api';
import { CrossTeamAnalytics, HeadcountFulfillmentReport } from '../../types/hr';
import { BarChart2, Users, TrendingUp, Target, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';

type ActiveSection = 'comparative' | 'headcount';

export const ManagerAnalyticsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<ActiveSection>('comparative');
  const [analytics, setAnalytics] = useState<CrossTeamAnalytics | null>(null);
  const [headcount, setHeadcount] = useState<HeadcountFulfillmentReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [ana, hc] = await Promise.all([
          getCrossTeamAnalytics(),
          getHeadcountFulfillmentReport(),
        ]);
        setAnalytics(ana);
        setHeadcount(hc);
      } catch (err: any) {
        setError(err?.message || 'Failed to load analytics data.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const getScoreColor = (rate: number) => {
    if (rate >= 75) return 'var(--accent-emerald)';
    if (rate >= 40) return 'var(--accent-amber)';
    return '#f87171';
  };

  const SECTIONS: { key: ActiveSection; label: string }[] = [
    { key: 'comparative', label: '📊 Cross-Team Analytics' },
    { key: 'headcount', label: '🎯 Headcount Fulfillment' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="glass-card" style={{ padding: '28px 32px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <BarChart2 size={28} color="var(--accent-indigo)" />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Analytics & Workforce Intelligence
          </h1>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
          Cross-departmental recruitment metrics, offer acceptance rates, and headcount fulfillment tracking.
        </p>
      </div>

      {/* Section Tabs */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.08))', marginBottom: '28px' }}>
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            style={{
              padding: '10px 20px',
              fontSize: '0.875rem',
              fontWeight: activeSection === s.key ? 700 : 500,
              color: activeSection === s.key ? 'var(--primary)' : 'var(--text-muted)',
              background: 'none',
              border: 'none',
              borderBottom: activeSection === s.key ? '2px solid var(--primary)' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{
          backgroundColor: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#f87171',
        }}>
          <AlertCircle size={18} /><span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading analytics data...
        </div>
      ) : (
        <>
          {/* ── COMPARATIVE ANALYTICS (S2-25 & S2-26) ─────────────────────── */}
          {activeSection === 'comparative' && analytics && (
            <div>
              {/* Summary stat cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>
                    {analytics.comparative.length}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Departments Tracked</div>
                </div>
                <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                    {analytics.comparative.reduce((sum, d) => sum + d.hiredCount, 0)}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Total Hires</div>
                </div>
                <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                    {analytics.comparative.reduce((sum, d) => sum + d.applicationCount, 0)}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Total Applications</div>
                </div>
                <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-amber)' }}>
                    {analytics.comparative.reduce((sum, d) => sum + d.interviewCount, 0)}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Total Interviews</div>
                </div>
              </div>

              {/* Comparative Table with drill-down */}
              <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.08))' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                    Department-by-Department Breakdown
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                    Click any row to expand detailed metrics
                  </p>
                </div>

                {analytics.comparative.length === 0 ? (
                  <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-subtle)' }}>
                    No departmental data available yet.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                        <th style={{ padding: '14px 20px', color: 'var(--text-muted)', fontWeight: 600 }}></th>
                        <th style={{ padding: '14px 20px', color: 'var(--text-muted)', fontWeight: 600 }}>Department</th>
                        <th style={{ padding: '14px 20px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>Positions</th>
                        <th style={{ padding: '14px 20px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>Applications</th>
                        <th style={{ padding: '14px 20px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>Interviews</th>
                        <th style={{ padding: '14px 20px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>Hired</th>
                        <th style={{ padding: '14px 20px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>Offer Accept %</th>
                        <th style={{ padding: '14px 20px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>Avg Time-to-Hire</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.comparative.map((dept) => (
                        <React.Fragment key={dept.department}>
                          <tr
                            onClick={() => setExpandedRow(expandedRow === dept.department ? null : dept.department)}
                            style={{
                              borderBottom: '1px solid rgba(255,255,255,0.04)',
                              cursor: 'pointer',
                              transition: 'background 0.15s',
                              background: expandedRow === dept.department ? 'rgba(99,102,241,0.06)' : undefined,
                            }}
                            onMouseEnter={(e) => { if (expandedRow !== dept.department) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                            onMouseLeave={(e) => { if (expandedRow !== dept.department) e.currentTarget.style.background = ''; }}
                          >
                            <td style={{ padding: '14px 8px 14px 20px', color: 'var(--text-subtle)' }}>
                              {expandedRow === dept.department ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </td>
                            <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-main)' }}>{dept.department}</td>
                            <td style={{ padding: '14px 20px', textAlign: 'center', color: 'var(--text-main)' }}>{dept.positionCount}</td>
                            <td style={{ padding: '14px 20px', textAlign: 'center', color: 'var(--text-main)' }}>{dept.applicationCount}</td>
                            <td style={{ padding: '14px 20px', textAlign: 'center', color: 'var(--text-main)' }}>{dept.interviewCount}</td>
                            <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                              <span style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>{dept.hiredCount}</span>
                            </td>
                            <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                              <span style={{ fontWeight: 700, color: getScoreColor(dept.offerAcceptanceRate) }}>
                                {dept.offerAcceptanceRate.toFixed(1)}%
                              </span>
                            </td>
                            <td style={{ padding: '14px 20px', textAlign: 'center', color: 'var(--text-main)' }}>
                              {dept.avgTimeToHireDays > 0 ? `${dept.avgTimeToHireDays.toFixed(0)} days` : '—'}
                            </td>
                          </tr>
                          {/* Drill-down expanded row (S2-26) */}
                          {expandedRow === dept.department && (
                            <tr style={{ background: 'rgba(99,102,241,0.04)' }}>
                              <td colSpan={8} style={{ padding: '0' }}>
                                <div style={{ padding: '16px 24px 20px 52px' }}>
                                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '12px' }}>
                                    {dept.department} — Detailed Metrics
                                  </h4>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                                    {[
                                      { label: 'Offer Approvals', value: dept.offerApprovedCount, color: 'var(--accent-emerald)' },
                                      { label: 'Rejected Applications', value: dept.rejectedCount, color: '#f87171' },
                                      {
                                        label: 'Conversion Rate',
                                        value: dept.applicationCount > 0
                                          ? `${((dept.hiredCount / dept.applicationCount) * 100).toFixed(1)}%`
                                          : '0%',
                                        color: 'var(--accent-cyan)',
                                      },
                                      {
                                        label: 'Interview-to-Hire',
                                        value: dept.interviewCount > 0
                                          ? `${((dept.hiredCount / dept.interviewCount) * 100).toFixed(1)}%`
                                          : '0%',
                                        color: 'var(--accent-amber)',
                                      },
                                    ].map((item) => (
                                      <div key={item.label} style={{
                                        padding: '12px 14px',
                                        borderRadius: '8px',
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid var(--border-subtle)',
                                      }}>
                                        <div style={{ fontSize: '1.3rem', fontWeight: 800, color: item.color }}>{item.value}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{item.label}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ── HEADCOUNT FULFILLMENT (S2-28) ─────────────────────────────── */}
          {activeSection === 'headcount' && headcount && (
            <div>
              {/* Summary cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>
                    {headcount.summary.totalPositions}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Total Positions</div>
                </div>
                <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                    {headcount.summary.overallTargetHeadcount}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Target Headcount</div>
                </div>
                <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                    {headcount.summary.overallHired}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Total Hired</div>
                </div>
                <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: getScoreColor(headcount.summary.overallFulfillmentPercent) }}>
                    {headcount.summary.overallFulfillmentPercent.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Overall Fulfillment</div>
                </div>
              </div>

              {/* Overall progress bar */}
              <div className="glass-card" style={{ padding: '20px 24px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>Overall Headcount Fulfillment</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: getScoreColor(headcount.summary.overallFulfillmentPercent) }}>
                    {headcount.summary.overallHired} / {headcount.summary.overallTargetHeadcount}
                  </span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '999px', height: '10px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min(headcount.summary.overallFulfillmentPercent, 100)}%`,
                    height: '100%',
                    borderRadius: '999px',
                    background: `linear-gradient(90deg, ${getScoreColor(headcount.summary.overallFulfillmentPercent)}, ${getScoreColor(headcount.summary.overallFulfillmentPercent)}bb)`,
                    transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>

              {/* Per-position table */}
              <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.08))' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>Position-by-Position Fulfillment</h3>
                </div>
                {headcount.positions.length === 0 ? (
                  <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-subtle)' }}>No position data available.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                        <th style={{ padding: '14px 20px', color: 'var(--text-muted)', fontWeight: 600 }}>Position</th>
                        <th style={{ padding: '14px 20px', color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
                        <th style={{ padding: '14px 20px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>Target</th>
                        <th style={{ padding: '14px 20px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>Hired</th>
                        <th style={{ padding: '14px 20px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>Remaining</th>
                        <th style={{ padding: '14px 20px', color: 'var(--text-muted)', fontWeight: 600 }}>Fulfillment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {headcount.positions.map((pos) => (
                        <tr key={pos.positionId} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '14px 20px' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{pos.title}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>{pos.department}</div>
                          </td>
                          <td style={{ padding: '14px 20px' }}>
                            <span className={`badge ${
                              pos.status === 'Open' ? 'badge-emerald' :
                              pos.status === 'Closed' ? 'badge-amber' :
                              'badge-cyan'
                            }`} style={{ fontSize: '0.75rem' }}>
                              {pos.status}
                            </span>
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'center', color: 'var(--text-main)', fontWeight: 600 }}>
                            {pos.targetHeadcount}
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                            <span style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>{pos.hiredCount}</span>
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                            <span style={{ fontWeight: 600, color: pos.remainingHeadcount > 0 ? '#f87171' : 'var(--accent-emerald)' }}>
                              {pos.remainingHeadcount}
                            </span>
                          </td>
                          <td style={{ padding: '14px 20px', minWidth: '160px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: '999px', height: '7px', overflow: 'hidden' }}>
                                <div style={{
                                  width: `${Math.min(pos.fulfillmentPercent, 100)}%`,
                                  height: '100%',
                                  borderRadius: '999px',
                                  background: getScoreColor(pos.fulfillmentPercent),
                                  transition: 'width 0.4s ease',
                                }} />
                              </div>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: getScoreColor(pos.fulfillmentPercent), minWidth: '42px' }}>
                                {pos.fulfillmentPercent.toFixed(0)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ManagerAnalyticsPage;
