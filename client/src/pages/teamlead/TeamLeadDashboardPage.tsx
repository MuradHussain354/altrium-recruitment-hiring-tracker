import React, { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { teamLeadInterviewsApi } from '../../api/teamLeadInterviews.api';
import { TLInterviewListItem } from '../../types/teamlead';
import { Calendar, CheckCircle2, Clock, ChevronRight, AlertCircle, CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';

export const TeamLeadDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [interviews, setInterviews] = useState<TLInterviewListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInterviews = async () => {
      try {
        setIsLoading(true);
        const res = await teamLeadInterviewsApi.listMyInterviews();
        setInterviews(res.data);
        setIsLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to load assigned interviews.');
        setIsLoading(false);
      }
    };
    fetchInterviews();
  }, []);

  const totalAssigned = interviews.length;
  const now = new Date();
  const upcomingCount = interviews.filter(
    (i) => i.status === 'Scheduled' && i.scheduledAt && new Date(i.scheduledAt) > now
  ).length;
  const scheduledCount = interviews.filter((i) => i.status === 'Scheduled').length;
  const completedCount = interviews.filter((i) => i.status === 'Completed').length;

  const upcomingInterviews = interviews
    .filter((i) => i.status === 'Scheduled')
    .slice(0, 5);

  return (
    <div>
      {/* Banner */}
      <div className="glass-card" style={{ padding: '28px 32px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <span className="badge badge-emerald">
            Technical Evaluator Portal
          </span>
        </div>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
          Welcome back, {user?.name}!
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0 }}>
          Manage assigned technical interviews, evaluate candidate skills, and record feedback scores.
        </p>
      </div>

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

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="glass-card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Assigned</span>
            <Calendar color="var(--primary)" size={20} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {isLoading ? '...' : totalAssigned}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Upcoming Scheduled</span>
            <Clock color="var(--accent-cyan)" size={20} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {isLoading ? '...' : upcomingCount}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Scheduled Status</span>
            <CalendarDays color="var(--accent-amber)" size={20} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {isLoading ? '...' : scheduledCount}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Completed</span>
            <CheckCircle2 color="var(--accent-emerald)" size={20} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {isLoading ? '...' : completedCount}
          </div>
        </div>
      </div>

      {/* Upcoming Schedule */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
              Upcoming Assigned Interviews
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Next scheduled evaluations requiring technical assessment
            </span>
          </div>
          <Link to="/team-lead/interviews" className="btn btn-secondary" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            View All <ChevronRight size={16} />
          </Link>
        </div>

        {isLoading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading upcoming schedule...
          </div>
        ) : upcomingInterviews.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '0.9rem' }}>
            No upcoming scheduled interviews assigned to you.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {upcomingInterviews.map((item) => {
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
                      {item.application.candidate.name}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span>Position: <strong>{item.application.position.title}</strong> ({item.application.position.department})</span>
                      <span>Stage: <strong>{item.stage.name}</strong></span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                        {formattedDate}
                      </div>
                      <span className="badge badge-emerald" style={{ marginTop: '4px', fontSize: '0.75rem' }}>
                        {item.status}
                      </span>
                    </div>
                    <Link
                      to={`/team-lead/interviews/${item.id}`}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                    >
                      Inspect
                    </Link>
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

export default TeamLeadDashboardPage;
