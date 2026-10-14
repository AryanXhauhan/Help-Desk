import { apiClient } from './client.js';
import { DashboardMetrics } from '../types/index.js';

export const dashboardApi = {
  getMetrics: () =>
    apiClient<{ success: boolean; data: { metrics: DashboardMetrics } }>('/dashboard/metrics'),
};
