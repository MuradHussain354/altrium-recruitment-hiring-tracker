import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useNotificationBell } from '../../hooks/useNotificationBell';
import {
  Bell,
  CheckCheck,
  Calendar,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { NotificationItem } from '../../types/teamlead';

export const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    unreadCount,
    notifications,
    isOpen,
    setIsOpen,
    isLoading,
    isMarkingAll,
    markAsRead,
    markAllAsRead
  } = useNotificationBell();

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, setIsOpen]);

  if (!user) return null;

  const getFullInboxPath = () => {
    if (user.role === 'Manager') return '/manager/notifications';
    if (user.role === 'TeamLead') return '/team-lead/notifications';
    return null;
  };

  const formatNotificationMeta = (type: string): { label: string; icon: React.ReactNode; color: string } => {
    switch (type) {
      case 'InterviewScheduled':
      case 'INTERVIEW_SCHEDULED':
      case 'INTERVIEW_ASSIGNED':
        return {
          label: 'Interview Scheduled',
          icon: <Calendar size={16} />,
          color: 'var(--accent-cyan, #06b6d4)'
        };
      case 'CommentMention':
      case 'COMMENT_MENTION':
        return {
          label: 'Mentioned in Comment',
          icon: <MessageSquare size={16} />,
          color: 'var(--primary, #6366f1)'
        };
      case 'FeedbackReminder':
      case 'FEEDBACK_REQUIRED':
      case 'FEEDBACK_SUBMITTED':
        return {
          label: 'Feedback Reminder',
          icon: <CheckCircle2 size={16} />,
          color: 'var(--accent-emerald, #10b981)'
        };
      default:
        return {
          label: type.replace(/([A-Z])/g, ' $1').trim(),
          icon: <AlertCircle size={16} />,
          color: 'var(--accent-amber, #f59e0b)'
        };
    }
  };

  const handleNotificationClick = async (n: NotificationItem) => {
    if (!n.isRead) {
      await markAsRead(n.id);
    }
    // If application reference exists, navigate if possible
    if (n.applicationId) {
      if (user.role === 'Manager') {
        navigate(`/manager/reports/pipeline?applicationId=${n.applicationId}`);
      } else if (user.role === 'HR') {
        navigate(`/hr/applications?applicationId=${n.applicationId}`);
      }
      setIsOpen(false);
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        id="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications (${unreadCount} unread)`}
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          background: isOpen ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)',
          color: unreadCount > 0 ? 'var(--text-main, #f8fafc)' : 'var(--text-muted, #94a3b8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.15s ease-in-out',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
          e.currentTarget.style.color = 'var(--text-main, #f8fafc)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = isOpen ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)';
          e.currentTarget.style.color = unreadCount > 0 ? 'var(--text-main, #f8fafc)' : 'var(--text-muted, #94a3b8)';
        }}
      >
        <Bell size={18} />

        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span
            id="notification-unread-badge"
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: '#ef4444',
              color: '#ffffff',
              fontSize: '0.68rem',
              fontWeight: 700,
              minWidth: '18px',
              height: '18px',
              borderRadius: '999px',
              padding: '0 4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #0f172a',
              boxShadow: '0 2px 6px rgba(239, 68, 68, 0.5)',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Popover Dropdown */}
      {isOpen && (
        <div
          id="notification-dropdown-panel"
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            width: '360px',
            background: '#0f172a',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '12px',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.65)',
            zIndex: 100,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(255, 255, 255, 0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main, #f8fafc)' }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: 'rgba(99, 102, 241, 0.2)',
                    color: 'var(--primary, #6366f1)',
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>

            <button
              type="button"
              id="mark-all-notifications-read-btn"
              onClick={markAllAsRead}
              disabled={isMarkingAll || unreadCount === 0}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.75rem',
                color: unreadCount > 0 ? 'var(--primary, #818cf8)' : 'var(--text-muted, #64748b)',
                background: 'transparent',
                border: 'none',
                cursor: unreadCount > 0 ? 'pointer' : 'default',
                padding: '4px 6px',
                borderRadius: '6px',
                opacity: isMarkingAll ? 0.6 : 1,
              }}
              title="Mark all notifications as read"
            >
              <CheckCheck size={14} />
              {isMarkingAll ? 'Marking...' : 'Mark all read'}
            </button>
          </div>

          {/* Body / List */}
          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {isLoading ? (
              <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted, #94a3b8)', fontSize: '0.85rem' }}>
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                <Bell size={32} color="var(--text-muted, #64748b)" style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main, #f8fafc)' }}>
                  All caught up!
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)', marginTop: '4px' }}>
                  You have no notifications in your inbox.
                </div>
              </div>
            ) : (
              notifications.map((n) => {
                const meta = formatNotificationMeta(n.type);
                const formattedDate = new Date(n.sentAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px 16px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      background: n.isRead ? 'transparent' : 'rgba(99, 102, 241, 0.06)',
                      cursor: 'pointer',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = n.isRead
                        ? 'rgba(255, 255, 255, 0.03)'
                        : 'rgba(99, 102, 241, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = n.isRead
                        ? 'transparent'
                        : 'rgba(99, 102, 241, 0.06)';
                    }}
                  >
                    {/* Icon */}
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: `${meta.color}15`,
                        color: meta.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '2px',
                      }}
                    >
                      {meta.icon}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '0.85rem',
                            fontWeight: n.isRead ? 500 : 700,
                            color: 'var(--text-main, #f8fafc)',
                          }}
                        >
                          {meta.label}
                        </span>
                        {!n.isRead && (
                          <span
                            style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              background: 'var(--primary, #6366f1)',
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)' }}>
                          {formattedDate}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748b)' }}>•</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)', textTransform: 'capitalize' }}>
                          {n.channel.toLowerCase()}
                        </span>
                      </div>

                      {n.applicationId && (
                        <div style={{ marginTop: '4px', fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)' }}>
                          App: <code style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: '4px' }}>{n.applicationId.slice(0, 8)}...</code>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer (view all if full page exists) */}
          {getFullInboxPath() && (
            <div
              style={{
                padding: '10px 16px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(255, 255, 255, 0.02)',
                textAlign: 'center',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  const path = getFullInboxPath();
                  if (path) navigate(path);
                  setIsOpen(false);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary, #818cf8)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                View full notification inbox <ExternalLink size={12} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
