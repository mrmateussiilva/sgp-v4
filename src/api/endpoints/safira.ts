import { apiClient } from '../client';

export interface SafiraRequest {
  question: string;
}

export interface SafiraResponse {
  recognized: boolean;
  intent: string;
  answer: string;
  meta?: any;
}

export const safiraApi = {
  ask: async (question: string): Promise<SafiraResponse> => {
    const response = await apiClient.post<SafiraResponse>('/safira/ask', { question });
    return response.data;
  }
};
