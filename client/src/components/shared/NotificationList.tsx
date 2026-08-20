import React from 'react';
import { NotificationItem } from '../../types/teamlead';
import { Bell, Calendar, CheckCircle2, UserCheck, AlertCircle } from 'lucide-react';

interface NotificationListProps {
  notifications: NotificationItem[];
  isLoading?: boolean;
}

export const NotificationList: React.FC<NotificationListProps> = ({ notifications, isLoading }) => {
  if (isLoading) {
    return (
      <div className="glass-card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading notifications...
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="glass-card" style={{ padding: '40px 24px', textAlign: 'center' }}>
        <Bell size={36} color="var(--text-subtle)" style={{ marginBottom: '12px', opacity: 0.5 }} />
        <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
          No Notifications
        </h4>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
          You have no notifications in your inbox.
        </p>
      </div>
    );
  }

  const formatNotificationType = (type: string): { label: string; icon: React.ReactNode; color: string } => {
    switch (type) {
      case 'INTERVIEW_SCHEDULED':
      case 'INTERVIEW_ASSIGNED':
        return {
          label: 'Interview Scheduled / Assigned',
          icon: <Calendar size={18} />,
          color: 'var(--accent-cyan)'
        };
      case 'FEEDBACK_SUBMITTED':
      case 'FEEDBACK_REQUIRED':
        return {
          label: 'Feedback Event',
          icon: <CheckCircle2 size={18} />,
          color: 'var(--accent-emerald)'
        };
      case 'APPLICATION_STAGE_CHANGED':
        return {
          label: 'Application Stage Updated',
          icon: <UserCheck size={18} />,
          color: 'var(--primary)'
        };
      default:
        return {
          label: type.replace(/_/g, ' '),
          icon: <AlertCircle size={18} />,
          color: 'var(--accent-amber)'
        };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {notifications.map((n) => {
        const { label, icon, color } = formatNotificationType(n.type);
        const formattedDate = new Date(n.sentAt).toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short'
        });

        return (
          <div key={n.id} className="glass-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: `${color}15`,
                color: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {icon}
              </div>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '2px' }}>
                  {label}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Channel: <span style={{ textTransform: 'capitalize', color: 'var(--text-main)' }}>{n.channel.toLowerCase()}</span>
                  {n.applicationId && (
                    <span style={{ marginLeft: '12px' }}>
                      Application Ref: <code style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>{n.applicationId.slice(0, 8)}...</code>
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', whiteSpace: 'nowrap' }}>
              {formattedDate}
            </div>
          </div>
        );
      })}
    </div>
  );
};
