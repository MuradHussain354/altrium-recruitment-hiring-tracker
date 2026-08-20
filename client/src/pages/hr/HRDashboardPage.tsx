import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { hrPositionsApi } from '../../api/hrPositions.api';
import { hrApplicationsApi } from '../../api/hrApplications.api';
import { hrInterviewsApi } from '../../api/hrInterviews.api';
import { Position, Application, Interview } from '../../types/hr';
import { HRStatCard } from '../../components/hr/HRStatCard';
import { StatusBadge } from '../../components/hr/StatusBadge';

export const HRDashboardPage: React.FC = () => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchOperationalData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [posRes, appRes, intRes] = await Promise.all([
          hrPositionsApi.listPositions(),
          hrApplicationsApi.listApplications(),
          hrInterviewsApi.listInterviews()
        ]);

        if (isMounted) {
          setPositions(posRes.data || []);
          setApplications(appRes.data || []);
          setInterviews(intRes.data || []);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Failed to load dashboard operational metrics.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchOperationalData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Compute operational metrics locally
  const totalPositions = positions.length;
  const openPositions = positions.filter((p) => p.status === 'Open').length;
  const totalApplications = applications.length;
  const inProgressApplications = applications.filter((a) => a.status === 'InProgress').length;
  const scheduledInterviews = interviews.filter((i) => i.status === 'Scheduled').length;
  const completedInterviews = interviews.filter((i) => i.status === 'Completed').length;

  // Recent applications (top 5 sorted by createdAt desc)
  const recentApplications = [...applications]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // Upcoming scheduled interviews (sorted by scheduledAt asc)
  const upcomingInterviews = interviews
    .filter((i) => i.status === 'Scheduled')
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="page-container hr-dashboard-page">
        <div className="page-loading-state">
          <div className="spinner"></div>
          <p>Loading HR operational dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container hr-dashboard-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">HR & Recruiter Dashboard</h1>
          <p className="page-subtitle">Manage hiring pipelines, positions, candidates, and interview workflows.</p>
        </div>
        <div className="page-actions">
          <Link to="/hr/positions/new" className="btn btn-primary">
            + New Position
          </Link>
        </div>
      </div>

      {error && <div className="page-alert page-alert--error">{error}</div>}

      {/* Operational Metrics Cards */}
      <div className="dashboard-stats-grid">
        <HRStatCard
          title="Open Positions"
          value={openPositions}
          subtitle={`${totalPositions} Total Positions`}
          icon="💼"
          colorVariant="primary"
        />
        <HRStatCard
          title="Active Candidates"
          value={inProgressApplications}
          subtitle={`${totalApplications} Total Applications`}
          icon="👥"
          colorVariant="info"
        />
        <HRStatCard
          title="Scheduled Interviews"
          value={scheduledInterviews}
          subtitle={`${completedInterviews} Completed`}
          icon="📅"
          colorVariant="warning"
        />
        <HRStatCard
          title="Hired Candidates"
          value={applications.filter((a) => a.status === 'Hired').length}
          subtitle={`${applications.filter((a) => a.status === 'Rejected').length} Rejected`}
          icon="🎉"
          colorVariant="success"
        />
      </div>

      {/* Quick Action Navigation */}
      <div className="dashboard-quick-actions">
        <h3>Quick Navigation</h3>
        <div className="quick-action-buttons">
          <Link to="/hr/positions" className="quick-action-card">
            <span className="quick-action-card__icon">📋</span>
            <div className="quick-action-card__info">
              <h4>Positions & Pipelines</h4>
              <p>Manage job requisitions, requirements & gating stages</p>
            </div>
          </Link>
          <Link to="/hr/applications" className="quick-action-card">
            <span className="quick-action-card__icon">📄</span>
            <div className="quick-action-card__info">
              <h4>Applications</h4>
              <p>Review candidate profiles, stage moves & team assignments</p>
            </div>
          </Link>
          <Link to="/hr/interviews" className="quick-action-card">
            <span className="quick-action-card__icon">🗓️</span>
            <div className="quick-action-card__info">
              <h4>Interview Schedule</h4>
              <p>Manage interviewers, schedules & view ratings/feedback</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Dashboard Sections Grid */}
      <div className="dashboard-sections-grid">
        {/* Recent Applications Panel */}
        <div className="dashboard-card">
          <div className="dashboard-card__header">
            <h3>Recent Applications</h3>
            <Link to="/hr/applications" className="dashboard-card__link">View All ({applications.length}) →</Link>
          </div>

          {recentApplications.length === 0 ? (
            <div className="dashboard-empty-state">
              <p>No candidate applications yet.</p>
              <Link to="/careers" target="_blank" className="btn btn-secondary btn-sm">Visit Public Careers</Link>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Position</th>
                    <th>Stage</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentApplications.map((app) => (
                    <tr key={app.id}>
                      <td>
                        <div className="table-user-cell">
                          <strong>{app.candidate?.name}</strong>
                          <span className="table-subtext">{app.candidate?.email}</span>
                        </div>
                      </td>
                      <td>{app.position?.title}</td>
                      <td>
                        <span className="stage-pill">{app.currentStage?.name || 'Stage 1'}</span>
                      </td>
                      <td>
                        <StatusBadge status={app.status} type="application" />
                      </td>
                      <td>
                        <Link to={`/hr/applications/${app.id}`} className="btn btn-sm btn-secondary">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Upcoming Interviews Panel */}
        <div className="dashboard-card">
          <div className="dashboard-card__header">
            <h3>Upcoming Interviews</h3>
            <Link to="/hr/interviews" className="dashboard-card__link">View All ({interviews.length}) →</Link>
          </div>

          {upcomingInterviews.length === 0 ? (
            <div className="dashboard-empty-state">
              <p>No interviews currently scheduled.</p>
              <span className="form-help-text">Interviews can be scheduled from the candidate's application page.</span>
            </div>
          ) : (
            <div className="upcoming-interviews-list">
              {upcomingInterviews.map((int) => (
                <div key={int.id} className="upcoming-interview-item">
                  <div className="upcoming-interview-item__date">
                    <span className="date-month">
                      {new Date(int.scheduledAt).toLocaleDateString(undefined, { month: 'short' })}
                    </span>
                    <span className="date-day">
                      {new Date(int.scheduledAt).getDate()}
                    </span>
                  </div>
                  <div className="upcoming-interview-item__details">
                    <h4>{int.application?.candidate?.name}</h4>
                    <p className="upcoming-interview-item__sub">
                      {int.application?.position?.title} • {int.stage?.name}
                    </p>
                    <div className="upcoming-interview-item__time">
                      🕒 {new Date(int.scheduledAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      {int.location && ` • 📍 ${int.location}`}
                    </div>
                  </div>
                  <div className="upcoming-interview-item__action">
                    <Link to={`/hr/interviews`} className="btn btn-sm btn-secondary">
                      Manage
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
