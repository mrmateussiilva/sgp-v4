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
            // Usar header X-Silent-Request para evitar que falhas no logout 
            // disparem a tela global de erro de conexão
            await apiClient.post('/auth/logout', null, {
                headers: {
                    'X-Silent-Request': 'true'
                }
            });
        } catch (error) {
            // No logout, ignoramos erros de API pois o objetivo principal 
            // é limpar o estado local do usuário.
            console.warn('[authApi] Erro ao notificar servidor sobre logout:', error);
        } finally {
            setAuthToken(null);
            useAuthStore.getState().logout();
        }
    },
};
