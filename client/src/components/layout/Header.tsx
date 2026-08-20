import React from 'react';
import { useAuth } from '../../auth/AuthContext';
import { LogOut, User as UserIcon } from 'lucide-react';
import { Role } from '../../types/auth';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();

  const getRoleBadgeClass = (role?: Role) => {
    switch (role) {
      case 'Manager':
        return 'badge badge-indigo';
      case 'HR':
        return 'badge badge-cyan';
      case 'TeamLead':
        return 'badge badge-emerald';
      default:
        return 'badge badge-indigo';
    }
  };

  return (
    <header
      style={{
        height: '64px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
          Recruitment & Hiring Tracker
        </h2>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
              }}
            >
              <UserIcon size={18} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: '1.2' }}>
                {user.name}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</span>
            </div>
            <span className={getRoleBadgeClass(user.role)} style={{ marginLeft: '6px' }}>
              {user.role}
            </span>
          </div>
        )}

        <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-subtle)' }} />

        <button
          type="button"
          onClick={logout}
          className="btn btn-secondary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            fontSize: '0.825rem',
            cursor: 'pointer',
          }}
          title="Sign out of your session"
        >
          <LogOut size={14} />
          Logout
        </button>
      </div>
    </header>
  );
};

export default Header;
