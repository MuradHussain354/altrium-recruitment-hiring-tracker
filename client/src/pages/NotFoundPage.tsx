import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { FileQuestion, Home } from 'lucide-react';
import { Role } from '../types/auth';

export const NotFoundPage: React.FC = () => {
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
            backgroundColor: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)',
            marginBottom: '20px',
          }}
        >
          <FileQuestion size={36} />
        </div>

        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '12px' }}>
          404 — Page Not Found
        </h1>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '24px', lineHeight: '1.5' }}>
          The page or endpoint you are looking for does not exist or has been moved.
        </p>

        <button
          type="button"
          onClick={() => navigate(isAuthenticated ? getRoleHome(user?.role) : '/login')}
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <Home size={16} />
          {isAuthenticated ? 'Return to Home Portal' : 'Return to Login'}
        </button>
      </div>
    </div>
  );
};

export default NotFoundPage;
