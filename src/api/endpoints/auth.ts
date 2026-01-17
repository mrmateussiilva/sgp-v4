import { apiClient, setAuthToken } from '../client';
import { LoginRequest, LoginResponse } from '../types';
import { useAuthStore } from '../../store/authStore';

const requireSessionToken = (): void => {
    const token = useAuthStore.getState().sessionToken;
    if (!token) {
        throw new Error('Sessão expirada. Faça login novamente.');
    }
    setAuthToken(token);
};

export const authApi = {
    login: async (request: LoginRequest): Promise<LoginResponse> => {
        const response = await apiClient.post<LoginResponse>('/auth/login', request);
        if (response.data.session_token) {
            setAuthToken(response.data.session_token);
        }
        return response.data;
    },

    logout: async (): Promise<void> => {
        try {
            requireSessionToken();
            await apiClient.post('/auth/logout');
        } finally {
            setAuthToken(null);
            useAuthStore.getState().logout();
        }
    },
};
