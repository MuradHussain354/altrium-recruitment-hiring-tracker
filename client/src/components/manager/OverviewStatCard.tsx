import React from 'react';
import { Link } from 'react-router-dom';

interface OverviewStatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: string;
  linkTo?: string;
}

export const OverviewStatCard: React.FC<OverviewStatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color = 'var(--primary)',
  linkTo,
}) => {
  const content = (
    <div
      className="glass-card"
      style={{
        padding: '20px 24px',
        transition: 'transform 0.15s ease, border-color 0.15s ease',
        cursor: linkTo ? 'pointer' : 'default',
        height: '100%',
      }}
      onMouseEnter={(e) => {
        if (linkTo) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.borderColor = color;
        }
      }}
      onMouseLeave={(e) => {
        if (linkTo) {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.borderColor = 'var(--border-subtle)';
        }
      }}
    >
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

  if (linkTo) {
    return (
      <Link to={linkTo} style={{ textDecoration: 'none', display: 'block', color: 'inherit' }}>
        {content}
      </Link>
    );
  }

  return content;
};
