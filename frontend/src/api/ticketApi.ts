import { apiClient } from './client.js';
import { Ticket, TicketMessage, TicketActivity, Pagination, Priority, Status } from '../types/index.js';

interface TicketListResponse {
  success: boolean;
  data: {
    tickets: Ticket[];
    pagination: Pagination;
  };
}

export const ticketApi = {
  getTickets: (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    priority?: string;
    category?: string;
    assignedAgentId?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, String(value));
      }
    });
    return apiClient<TicketListResponse>(`/tickets?${query.toString()}`);
  },

  getTicketById: (id: string) =>
    apiClient<{ success: boolean; data: { ticket: Ticket } }>(`/tickets/${id}`),

  createTicket: (data: {
    subject: string;
    description: string;
    category?: string;
    priority?: Priority;
    dueDate?: string | null;
  }) =>
    apiClient<{ success: boolean; message: string; data: { ticket: Ticket } }>('/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateStatus: (id: string, status: Status, reason?: string) =>
    apiClient<{ success: boolean; data: { ticket: Ticket } }>(`/tickets/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    }),

  updatePriority: (id: string, priority: Priority) =>
    apiClient<{ success: boolean; data: { ticket: Ticket } }>(`/tickets/${id}/priority`, {
      method: 'PATCH',
      body: JSON.stringify({ priority }),
    }),

  assignTicket: (id: string, agentId: string | null) =>
    apiClient<{ success: boolean; data: { ticket: Ticket } }>(`/tickets/${id}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ agentId }),
    }),

  getTicketActivity: (id: string) =>
    apiClient<{ success: boolean; data: { activities: TicketActivity[] } }>(`/tickets/${id}/activity`),

  getMessages: (id: string) =>
    apiClient<{ success: boolean; data: { messages: TicketMessage[] } }>(`/tickets/${id}/messages`),

  createMessage: (id: string, data: { body: string; isInternal?: boolean }) =>
    apiClient<{ success: boolean; data: { message: TicketMessage } }>(`/tickets/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
