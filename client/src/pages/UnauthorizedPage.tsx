import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { Role } from '../types/auth';

export const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const getRoleHome = (role?: Role) => {
    switch (role) {
      case 'Manager':
        return '/manager';
      case 'HR':
        return '/hr';
      case 'TeamLead':
        return '/team-lead';
      default:
        return '/login';
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '480px', textAlign: 'center' }}>
      <div className="glass-card" style={{ padding: '48px 36px' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-rose)',
            marginBottom: '20px',
          }}
        >
          <ShieldAlert size={36} />
        </div>

        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '12px' }}>
          403 — Access Denied
        </h1>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '24px', lineHeight: '1.5' }}>
          You do not have the required role permissions to access this page. Your account role is{' '}
          <strong style={{ color: 'var(--primary)' }}>{user?.role || 'Unauthenticated'}</strong>.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={16} />
            Go Back
          </button>

          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => navigate(getRoleHome(user?.role))}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Home size={16} />
              Return to Portal
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              Go to Login
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
