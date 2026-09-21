import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
  LayoutDashboard,
  Users,
  Users2,
  BarChart3,
  Briefcase,
  FileText,
  Calendar,
  Bell,
  GitMerge,
  ShieldCheck,
  TrendingUp,
  CheckSquare,
  ListChecks,
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
              <span>Overview</span>
            </NavLink>

            <div className="sidebar-group-title" style={{ marginTop: '12px' }}>REPORTS</div>
            <NavLink
              to="/manager/reports/positions"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Briefcase size={18} />
              <span>Positions Report</span>
            </NavLink>
            <NavLink
              to="/manager/reports/pipeline"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <GitMerge size={18} />
              <span>Pipeline Report</span>
            </NavLink>
            <NavLink
              to="/manager/reports/interviews"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Calendar size={18} />
              <span>Interviews Report</span>
            </NavLink>
            <NavLink
              to="/manager/analytics"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <TrendingUp size={18} />
              <span>Analytics &amp; Headcount</span>
            </NavLink>

            <div className="sidebar-group-title" style={{ marginTop: '12px' }}>APPROVALS</div>
            <NavLink
              to="/manager/offer-approvals"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <CheckSquare size={18} />
              <span>Offer Approvals</span>
            </NavLink>

            <div className="sidebar-group-title" style={{ marginTop: '12px' }}>ADMINISTRATION</div>
            <NavLink
              to="/manager/accounts"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Users size={18} />
              <span>User Accounts</span>
            </NavLink>
            <NavLink
              to="/manager/teams"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Users2 size={18} />
              <span>Teams</span>
            </NavLink>
            <NavLink
              to="/manager/notifications"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Bell size={18} />
              <span>Notifications</span>
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
            >
              <Briefcase size={18} />
              <span>Positions</span>
            </NavLink>
            <NavLink
              to="/hr/applications"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <FileText size={18} />
              <span>Applications</span>
            </NavLink>
            <NavLink
              to="/hr/interviews"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Calendar size={18} />
              <span>Interviews</span>
            </NavLink>
            <NavLink
              to="/hr/question-sets"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <ListChecks size={18} />
              <span>Question Sets</span>
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
              to="/team-lead/interviews"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Calendar size={18} />
              <span>Assigned Interviews</span>
            </NavLink>
            <NavLink
              to="/team-lead/interviews?tab=history"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <BarChart3 size={18} />
              <span>Interview History</span>
            </NavLink>
            <NavLink
              to="/team-lead/notifications"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Bell size={18} />
              <span>Notifications</span>
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
