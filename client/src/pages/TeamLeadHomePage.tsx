import React from 'react';
import { useAuth } from '../auth/AuthContext';
import { Users, MessageSquare, Calendar, ChevronRight } from 'lucide-react';

export const TeamLeadHomePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div>
      {/* Banner */}
      <div className="glass-card" style={{ padding: '28px 32px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <span className="badge badge-emerald">
            <Users size={14} /> Team Lead Technical Portal
          </span>
        </div>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
          Welcome back, {user?.name}!
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0 }}>
          Review assigned candidate applications, conduct technical evaluations, and submit feedback scores.
        </p>
      </div>

      {/* Feature Preview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <Users color="var(--accent-emerald)" size={22} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Assigned Candidate Reviews</h3>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '16px' }}>
            Access assigned candidate profiles, inspect resumes, and evaluate technical experience against position criteria.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-emerald)', fontSize: '0.85rem', fontWeight: 600 }}>
            <span>Module Scheduled for Batch 2</span>
            <ChevronRight size={14} />
          </div>
        </div>

        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <MessageSquare color="var(--primary)" size={22} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Evaluation Feedback & Scoring</h3>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '16px' }}>
            Submit interview ratings, criterion-specific scores, and qualitative feedback for stage progression decisions.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 600 }}>
            <span>Module Scheduled for Batch 2</span>
            <ChevronRight size={14} />
          </div>
        </div>

        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <Calendar color="var(--accent-cyan)" size={22} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Interview Schedule</h3>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '16px' }}>
            View upcoming scheduled interviews, candidate details, meeting links, and feedback submission deadlines.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-cyan)', fontSize: '0.85rem', fontWeight: 600 }}>
            <span>Module Scheduled for Batch 2</span>
            <ChevronRight size={14} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamLeadHomePage;
