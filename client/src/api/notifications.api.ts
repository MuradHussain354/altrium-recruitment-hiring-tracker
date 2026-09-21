import { apiClient } from './apiClient';
import { NotificationItem, ListNotificationsParams } from '../types/teamlead';

export interface NotificationsListResponse {
  data: NotificationItem[];
  count: number;
}

export interface NotificationDetailResponse {
  data: NotificationItem;
}

export interface UnreadCountResponse {
  data: {
    unreadCount: number;
  };
  unreadCount?: number;
}

export interface MarkAllReadResponse {
  data: {
    count: number;
  };
  message: string;
}

export const notificationsApi = {
  listNotifications: async (params?: ListNotificationsParams): Promise<NotificationsListResponse> => {
    const query = new URLSearchParams();
    if (params?.type) query.append('type', params.type);
    if (params?.limit !== undefined) query.append('limit', params.limit.toString());
    if (params?.offset !== undefined) query.append('offset', params.offset.toString());

    const queryString = query.toString();
    const endpoint = queryString ? `/notifications?${queryString}` : '/notifications';
    return apiClient.get<NotificationsListResponse>(endpoint);
  },

  getNotification: async (notificationId: string): Promise<NotificationDetailResponse> => {
    return apiClient.get<NotificationDetailResponse>(`/notifications/${notificationId}`);
  },

  getUnreadCount: async (): Promise<UnreadCountResponse> => {
    return apiClient.get<UnreadCountResponse>('/notifications/unread-count');
  },

  markAsRead: async (notificationId: string): Promise<NotificationDetailResponse> => {
    return apiClient.patch<NotificationDetailResponse>(`/notifications/${notificationId}/read`);
  },

  markAllAsRead: async (): Promise<MarkAllReadResponse> => {
    return apiClient.patch<MarkAllReadResponse>('/notifications/read-all');
  }
};
