import React from 'react';
import { NotificationItem } from '../../types/teamlead';
import {
  Bell,
  Calendar,
  CheckCircle2,
  UserCheck,
  AlertCircle,
  MessageSquare,
  CheckCheck,
  Check
} from 'lucide-react';

interface NotificationListProps {
  notifications: NotificationItem[];
  isLoading?: boolean;
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
}

export const NotificationList: React.FC<NotificationListProps> = ({
  notifications,
  isLoading,
  onMarkAsRead,
  onMarkAllAsRead
}) => {
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

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const formatNotificationType = (type: string): { label: string; icon: React.ReactNode; color: string } => {
    switch (type) {
      case 'InterviewScheduled':
      case 'INTERVIEW_SCHEDULED':
      case 'INTERVIEW_ASSIGNED':
        return {
          label: 'Interview Scheduled / Assigned',
          icon: <Calendar size={18} />,
          color: 'var(--accent-cyan)'
        };
      case 'CommentMention':
      case 'COMMENT_MENTION':
        return {
          label: 'Mentioned in Application Comment',
          icon: <MessageSquare size={18} />,
          color: 'var(--primary)'
        };
      case 'FeedbackReminder':
      case 'FEEDBACK_SUBMITTED':
      case 'FEEDBACK_REQUIRED':
        return {
          label: 'Feedback Event / Reminder',
          icon: <CheckCircle2 size={18} />,
          color: 'var(--accent-emerald)'
        };
      case 'APPLICATION_STAGE_CHANGED':
        return {
          label: 'Application Stage Updated',
          icon: <UserCheck size={18} />,
          color: 'var(--primary)'
        };
      case 'Offer':
        return {
          label: 'Job Offer Extended',
          icon: <CheckCircle2 size={18} />,
          color: 'var(--accent-emerald)'
        };
      case 'Rejection':
        return {
          label: 'Candidate Application Rejected',
          icon: <AlertCircle size={18} />,
          color: 'var(--accent-amber)'
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
      {/* Optional Toolbar when there are unread notifications and onMarkAllAsRead is provided */}
      {unreadCount > 0 && onMarkAllAsRead && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: '8px',
          }}
        >
          <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </span>
          <button
            type="button"
            onClick={onMarkAllAsRead}
            className="btn btn-secondary"
            style={{
              fontSize: '0.78rem',
              padding: '4px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <CheckCheck size={14} /> Mark all as read
          </button>
        </div>
      )}

      {notifications.map((n) => {
        const { label, icon, color } = formatNotificationType(n.type);
        const formattedDate = new Date(n.sentAt).toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short'
        });

        return (
          <div
            key={n.id}
            className="glass-card"
            style={{
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              borderLeft: n.isRead ? '1px solid var(--border-subtle)' : '3px solid var(--primary)',
              background: n.isRead ? undefined : 'rgba(99, 102, 241, 0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: `${color}15`,
                  color: color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                {icon}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: n.isRead ? 600 : 700, color: 'var(--text-main)' }}>
                    {label}
                  </span>
                  {!n.isRead && (
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '999px',
                        background: 'rgba(99, 102, 241, 0.2)',
                        color: 'var(--primary)',
                        textTransform: 'uppercase',
                      }}
                    >
                      New
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Channel: <span style={{ textTransform: 'capitalize', color: 'var(--text-main)' }}>{n.channel.toLowerCase()}</span>
                  {n.applicationId && (
                    <span style={{ marginLeft: '12px' }}>
                      Application Ref: <code style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>{n.applicationId.slice(0, 8)}...</code>
                    </span>
                  )}
                  {n.interviewId && (
                    <span style={{ marginLeft: '12px' }}>
                      Interview Ref: <code style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>{n.interviewId.slice(0, 8)}...</code>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', whiteSpace: 'nowrap' }}>
                {formattedDate}
              </div>

              {!n.isRead && onMarkAsRead && (
                <button
                  type="button"
                  onClick={() => onMarkAsRead(n.id)}
                  className="btn btn-secondary"
                  style={{
                    padding: '4px 8px',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="Mark as read"
                >
                  <Check size={12} /> Read
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
