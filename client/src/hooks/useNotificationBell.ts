import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { notificationsApi } from '../api/notifications.api';
import { NotificationItem } from '../types/teamlead';

export const useNotificationBell = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMarkingAll, setIsMarkingAll] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const res = await notificationsApi.getUnreadCount();
      const count = res.data?.unreadCount ?? res.unreadCount ?? 0;
      setUnreadCount(count);
    } catch {
      // Silently ignore polling errors to avoid interrupting user workflow
    }
  }, [user]);

  const fetchRecentNotifications = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await notificationsApi.listNotifications({ limit: 8 });
      setNotifications(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load notifications.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch recent notifications whenever dropdown is opened
  useEffect(() => {
    if (isOpen && user) {
      fetchRecentNotifications();
      fetchUnreadCount();
    }
  }, [isOpen, user, fetchRecentNotifications, fetchUnreadCount]);

  // Set up 30-second polling for unread count
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setNotifications([]);
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    // Initial fetch
    fetchUnreadCount();

    const startPolling = () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      pollTimerRef.current = setInterval(() => {
        if (!document.hidden) {
          fetchUnreadCount();
        }
      }, 30000);
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Document became active again, fetch immediately
        fetchUnreadCount();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, fetchUnreadCount]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationsApi.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Failed to mark as read
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (unreadCount === 0 && notifications.every((n) => n.isRead)) return;
    setIsMarkingAll(true);
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: n.readAt || new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err: any) {
      setError(err.message || 'Failed to mark all as read.');
    } finally {
      setIsMarkingAll(false);
    }
  }, [unreadCount, notifications]);

  return {
    unreadCount,
    notifications,
    isOpen,
    setIsOpen,
    isLoading,
    isMarkingAll,
    error,
    fetchUnreadCount,
    fetchRecentNotifications,
    markAsRead,
    markAllAsRead
  };
};
