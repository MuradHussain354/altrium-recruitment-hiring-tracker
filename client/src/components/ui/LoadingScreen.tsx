import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading...',
  fullScreen = true,
}) => {
  const content = (
    <div className="loading-container" style={{ textAlign: 'center', padding: '40px 20px' }}>
      <Loader2 className="spinner" size={36} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
      <p style={{ marginTop: '16px', color: 'var(--text-muted)', fontSize: '0.95rem' }}>{message}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: 'var(--bg-dark)',
        }}
      >
        {content}
      </div>
    );
  }

  return content;
};

export default LoadingScreen;
