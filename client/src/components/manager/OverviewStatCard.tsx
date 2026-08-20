import React from 'react';

interface OverviewStatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: string;
}

export const OverviewStatCard: React.FC<OverviewStatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color = 'var(--primary)'
}) => {
  return (
    <div className="glass-card" style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>{title}</span>
        {icon && (
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: `${color}15`,
            color: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {icon}
          </div>
        )}
      </div>
      <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
        {value}
      </div>
      {subtitle && (
        <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)' }}>
          {subtitle}
        </span>
      )}
    </div>
  );
};
