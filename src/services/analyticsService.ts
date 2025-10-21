import axios from 'axios';
import { AnalyticsFilters, AnalyticsResponse } from '@/types';
import { useAuthStore } from '@/store/authStore';

const analyticsClient = axios.create({
  baseURL: import.meta.env.VITE_ANALYTICS_API_URL ?? '',
  timeout: 20000,
});

const normalizeFilters = (filters: AnalyticsFilters = {}) => {
  return Object.entries(filters).reduce<Record<string, string>>((accumulator, [key, value]) => {
    if (value === undefined || value === null || value === '') {
      return accumulator;
    }
    accumulator[key] = String(value);
    return accumulator;
  }, {});
};

export const analyticsService = {
  getAnalytics: async (filters: AnalyticsFilters = {}): Promise<AnalyticsResponse> => {
    const params = normalizeFilters(filters);
    const sessionToken = useAuthStore.getState().sessionToken;

    const response = await analyticsClient.get<AnalyticsResponse>('/analytics', {
      params,
      headers: sessionToken
        ? {
            Authorization: `Bearer ${sessionToken}`,
          }
        : undefined,
    });

    return response.data;
  },
};
