import React from 'react';
import { useAuth } from '../auth/AuthContext';
import { Briefcase, FileText, Calendar, ChevronRight } from 'lucide-react';

export const HRHomePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div>
      {/* Banner */}
      <div className="glass-card" style={{ padding: '28px 32px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <span className="badge badge-cyan">
            <Briefcase size={14} /> HR Operations Portal
          </span>
        </div>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
          Welcome back, {user?.name}!
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0 }}>
          Manage job position listings, process incoming candidate applications, and schedule interview stages.
        </p>
      </div>

      {/* Feature Preview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <Briefcase color="var(--accent-cyan)" size={22} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Positions & Pipelines</h3>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '16px' }}>
            Create job postings, configure interview pipeline stages, and manage position status.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-cyan)', fontSize: '0.85rem', fontWeight: 600 }}>
            <span>Module Scheduled for Batch 2</span>
            <ChevronRight size={14} />
          </div>
        </div>

        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <FileText color="var(--primary)" size={22} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Applications Processing</h3>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '16px' }}>
            Review candidate applications, assign applications to evaluation teams, and advance pipeline stages.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 600 }}>
            <span>Module Scheduled for Batch 2</span>
            <ChevronRight size={14} />
          </div>
        </div>

        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <Calendar color="var(--accent-emerald)" size={22} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Interview Scheduling</h3>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '16px' }}>
            Schedule interviews, assign interviewers, and send notification emails to candidate and team leads.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-emerald)', fontSize: '0.85rem', fontWeight: 600 }}>
            <span>Module Scheduled for Batch 2</span>
            <ChevronRight size={14} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HRHomePage;
