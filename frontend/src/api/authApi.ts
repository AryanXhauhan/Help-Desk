import { apiClient } from './client.js';
import { User } from '../types/index.js';

interface AuthResponse {
  success: boolean;
  message?: string;
  data: {
    user: User;
    accessToken?: string;
  };
}

export const authApi = {
  login: (data: { email: string; password: string }) =>
    apiClient<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  register: (data: { name: string; email: string; password: string }) =>
    apiClient<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: () =>
    apiClient<{ success: boolean }>('/auth/logout', {
      method: 'POST',
    }),

  getMe: () =>
    apiClient<{ success: boolean; data: { user: User } }>('/auth/me'),

  updateProfile: (data: { name?: string; avatarUrl?: string | null; currentPassword?: string; newPassword?: string }) =>
    apiClient<{ success: boolean; data: { user: User } }>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};
