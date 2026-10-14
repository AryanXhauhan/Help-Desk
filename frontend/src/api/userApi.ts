import { apiClient } from './client.js';
import { User, AgentPerformance, Pagination, Role } from '../types/index.js';

interface UserListResponse {
  success: boolean;
  data: {
    users: User[];
    pagination: Pagination;
  };
}

export const userApi = {
  getUsers: (params: { page?: number; limit?: number; role?: string; search?: string; isActive?: boolean }) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, String(value));
      }
    });
    return apiClient<UserListResponse>(`/users?${query.toString()}`);
  },

  getAgents: () =>
    apiClient<{ success: boolean; data: { agents: User[] } }>('/users/agents'),

  createUser: (data: { name: string; email: string; password: string; role: Role }) =>
    apiClient<{ success: boolean; data: { user: User } }>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateUser: (id: string, data: { name?: string; role?: Role; isActive?: boolean }) =>
    apiClient<{ success: boolean; data: { user: User } }>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getAgentPerformance: (agentId?: string) => {
    const query = agentId ? `?agentId=${agentId}` : '';
    return apiClient<{ success: boolean; data: { performance: AgentPerformance[] } }>(
      `/agents/performance${query}`
    );
  },
};
