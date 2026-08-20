import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Briefcase,
  FileText,
  Calendar,
  Bell,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role;

  const renderNavLinks = () => {
    switch (role) {
      case 'Manager':
        return (
          <>
            <div className="sidebar-group-title">MANAGER PORTAL</div>
            <NavLink
              to="/manager"
              end
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </NavLink>
            <NavLink
              to="/manager/users"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={(e) => e.preventDefault()}
            >
              <Users size={18} />
              <span>Accounts (Sprint 1)</span>
              <span className="sidebar-pill">Preview</span>
            </NavLink>
            <NavLink
              to="/manager/reports"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={(e) => e.preventDefault()}
            >
              <BarChart3 size={18} />
              <span>Manager Reports</span>
              <span className="sidebar-pill">Preview</span>
            </NavLink>
          </>
        );

      case 'HR':
        return (
          <>
            <div className="sidebar-group-title">HR PORTAL</div>
            <NavLink
              to="/hr"
              end
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </NavLink>
            <NavLink
              to="/hr/positions"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={(e) => e.preventDefault()}
            >
              <Briefcase size={18} />
              <span>Positions</span>
              <span className="sidebar-pill">Preview</span>
            </NavLink>
            <NavLink
              to="/hr/applications"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={(e) => e.preventDefault()}
            >
              <FileText size={18} />
              <span>Applications</span>
              <span className="sidebar-pill">Preview</span>
            </NavLink>
            <NavLink
              to="/hr/interviews"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={(e) => e.preventDefault()}
            >
              <Calendar size={18} />
              <span>Interviews</span>
              <span className="sidebar-pill">Preview</span>
            </NavLink>
          </>
        );

      case 'TeamLead':
        return (
          <>
            <div className="sidebar-group-title">TEAM LEAD PORTAL</div>
            <NavLink
              to="/team-lead"
              end
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </NavLink>
            <NavLink
              to="/team-lead/applications"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={(e) => e.preventDefault()}
            >
              <FileText size={18} />
              <span>Assigned Apps</span>
              <span className="sidebar-pill">Preview</span>
            </NavLink>
            <NavLink
              to="/team-lead/interviews"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={(e) => e.preventDefault()}
            >
              <Calendar size={18} />
              <span>Interviews</span>
              <span className="sidebar-pill">Preview</span>
            </NavLink>
            <NavLink
              to="/team-lead/notifications"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={(e) => e.preventDefault()}
            >
              <Bell size={18} />
              <span>Notifications</span>
              <span className="sidebar-pill">Preview</span>
            </NavLink>
            <NavLink
              to="/team-lead/feedback"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={(e) => e.preventDefault()}
            >
              <MessageSquare size={18} />
              <span>Feedback</span>
              <span className="sidebar-pill">Preview</span>
            </NavLink>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <aside
      style={{
        width: '260px',
        borderRight: '1px solid var(--border-subtle)',
        backgroundColor: 'rgba(10, 13, 20, 0.95)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
      }}
    >
      {/* Sidebar Logo */}
      <div
        style={{
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '0 20px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-cyan) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
          }}
        >
          <ShieldCheck size={20} />
        </div>
        <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)' }}>
          Altrium Tracker
        </span>
      </div>

      {/* Nav Section */}
      <nav style={{ flexGrow: 1, padding: '20px 12px', overflowY: 'auto' }}>
        {renderNavLinks()}
      </nav>

      {/* Footer Info */}
      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border-subtle)',
          fontSize: '0.75rem',
          color: 'var(--text-subtle)',
        }}
      >
        <span>Altrium Hiring Tracker v1.0</span>
      </div>
    </aside>
  );
};

export default Sidebar;
