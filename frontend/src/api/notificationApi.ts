import { apiClient } from './client.js';
import { Notification } from '../types/index.js';

export const notificationApi = {
  getNotifications: (params?: { limit?: number; unreadOnly?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.unreadOnly) query.append('unreadOnly', 'true');
    return apiClient<{ success: boolean; data: { notifications: Notification[]; unreadCount: number } }>(
      `/notifications?${query.toString()}`
    );
  },

  markAsRead: (id: string) =>
    apiClient<{ success: boolean; data: { notification: Notification } }>(`/notifications/${id}/read`, {
      method: 'PATCH',
    }),

  markAllAsRead: () =>
    apiClient<{ success: boolean; message: string }>('/notifications/read-all', {
      method: 'PATCH',
    }),
};
