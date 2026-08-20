import React, { useEffect, useState } from 'react';
import { notificationsApi } from '../../api/notifications.api';
import { NotificationItem } from '../../types/teamlead';
import { NotificationList } from '../../components/shared/NotificationList';
import { Bell, AlertCircle, RefreshCw } from 'lucide-react';

export const TeamLeadNotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await notificationsApi.listNotifications();
      setNotifications(res.data);
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load notifications.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bell color="var(--primary)" size={24} /> Evaluation Inbox Notifications
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
            System events addressed to your technical evaluator account.
          </p>
        </div>

        <button
          onClick={fetchNotifications}
          className="btn btn-secondary"
          disabled={isLoading}
          style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={14} className={isLoading ? 'spin' : ''} /> Refresh Inbox
        </button>
      </div>

      {error && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#f87171'
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Notification List */}
      <NotificationList notifications={notifications} isLoading={isLoading} />
    </div>
  );
};

export default TeamLeadNotificationsPage;
