import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ErrorBannerProps {
  message: string;
  details?: Array<{ field?: string; message: string }>;
  onDismiss?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, details, onDismiss }) => {
  if (!message) return null;

  return (
    <div className="error-banner" style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--accent-rose)' }} />
        <div style={{ flexGrow: 1 }}>
          <p style={{ fontWeight: 600, color: 'var(--accent-rose)', margin: 0, fontSize: '0.9rem' }}>
            {message}
          </p>
          {details && details.length > 0 && (
            <ul style={{ margin: '8px 0 0', paddingLeft: '16px', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
              {details.map((d, index) => (
                <li key={index}>
                  {d.field ? <strong>{d.field}: </strong> : null}
                  {d.message}
                </li>
              ))}
            </ul>
          )}
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label="Dismiss error"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorBanner;
