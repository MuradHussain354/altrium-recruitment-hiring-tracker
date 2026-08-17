import React, { useEffect, useState } from 'react';
import { ShieldCheck, Server, Database, Users, Briefcase, ChevronRight } from 'lucide-react';

interface ApiHealthResponse {
  status: string;
  message: string;
  timestamp: string;
  version: string;
}

export default function App() {
  const [apiHealth, setApiHealth] = useState<ApiHealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/health')
      .then((res) => {
        if (!res.ok) throw new Error('API server returned error status');
        return res.json();
      })
      .then((data: ApiHealthResponse) => {
        setApiHealth(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to connect to backend API server');
        setLoading(false);
      });
  }, []);

  return (
    <div className="container">
      {/* Header Banner */}
      <header style={{ textAlign: 'center', margin: '40px 0 60px' }}>
        <span className="badge badge-indigo" style={{ marginBottom: '16px' }}>
          <ShieldCheck size={14} /> Project Foundation Scaffold (Sprint 1)
        </span>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.025em', marginBottom: '12px' }}>
          Altrium Recruitment & Hiring Tracker
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '680px', margin: '0 auto' }}>
          Collaborative Full-Stack Recruitment Management Platform for Public Careers, Candidate Submissions, HR Processing, Team Assignments, and Leader Reviews.
        </p>
      </header>

      {/* Grid Status Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        {/* Backend API Status */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Server color="var(--primary)" size={24} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>API Server</h2>
            </div>
            {apiHealth ? (
              <span className="badge badge-emerald">Online</span>
            ) : (
              <span className="badge badge-indigo">Connecting...</span>
            )}
          </div>
          {loading && <p style={{ color: 'var(--text-subtle)' }}>Checking backend health check endpoint...</p>}
          {error && (
            <p style={{ color: 'var(--accent-rose)', fontSize: '0.9rem' }}>
              {error} (Ensure backend server is running on port 5000)
            </p>
          )}
          {apiHealth && (
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              <p><strong>Status:</strong> {apiHealth.status}</p>
              <p><strong>Message:</strong> {apiHealth.message}</p>
              <p><strong>Version:</strong> {apiHealth.version}</p>
            </div>
          )}
        </div>

        {/* Database ORM Status */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <Database color="var(--accent-cyan)" size={24} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Database & Prisma ORM</h2>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '12px' }}>
            Defined 10 core schema entities: <code>User</code>, <code>Team</code>, <code>Position</code>, <code>Stage</code>, <code>Candidate</code>, <code>Application</code>, <code>Interview</code>, <code>Feedback</code>, <code>Notification</code>, <code>AuditLog</code>.
          </p>
          <span className="badge badge-indigo">Schema Configured</span>
        </div>

        {/* Team Roles */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <Users color="var(--accent-emerald)" size={24} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Team Task Division</h2>
          </div>
          <ul style={{ color: 'var(--text-muted)', fontSize: '0.875rem', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <li><strong>Full-Stack Dev:</strong> API Routes, Auth, DB Schema, Workflow Engine</li>
            <li><strong>Frontend Dev:</strong> Public Careers Website, Design Tokens & Cards</li>
            <li><strong>Frontend + QA:</strong> HR/Manager Portals, Feedback Modals & Test Suite</li>
          </ul>
        </div>
      </div>

      {/* Intended Workflow Roadmap */}
      <div className="glass-card" style={{ padding: '32px', marginBottom: '40px' }}>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Briefcase color="var(--primary)" size={22} /> Sprint 1 Core Workflow Scope
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', color: 'var(--text-main)', fontSize: '0.95rem' }}>
          <span className="badge badge-indigo">1. Candidate Views Job</span>
          <ChevronRight size={16} color="var(--text-subtle)" />
          <span className="badge badge-indigo">2. Submits Application</span>
          <ChevronRight size={16} color="var(--text-subtle)" />
          <span className="badge badge-indigo">3. HR Processes Application</span>
          <ChevronRight size={16} color="var(--text-subtle)" />
          <span className="badge badge-indigo">4. Assigns to Team</span>
          <ChevronRight size={16} color="var(--text-subtle)" />
          <span className="badge badge-indigo">5. Team Lead Reviews & Gives Feedback</span>
          <ChevronRight size={16} color="var(--text-subtle)" />
          <span className="badge badge-emerald">6. Manager Oversees</span>
        </div>
      </div>
    </div>
  );
}
