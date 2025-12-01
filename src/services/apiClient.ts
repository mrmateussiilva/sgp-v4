import axios, { AxiosError, AxiosInstance } from 'axios';
import { applyTauriAdapter } from './tauriAxiosAdapter';

const STATUS_ENDPOINTS = ['/health', '/pedidos'];

let API_BASE_URL = '';
let authToken: string | null = null;

type ApiFailureListener = (error: AxiosError) => void;

const listeners = new Set<ApiFailureListener>();

const apiClient: AxiosInstance = axios.create({
  timeout: 30000, // Aumentar timeout para 30 segundos para conexões de rede
});

applyTauriAdapter(apiClient);

apiClient.interceptors.request.use((config) => {
  if (authToken) {
    const headers = config.headers ?? {};
    (headers as any).Authorization = `Bearer ${authToken}`;
    config.headers = headers;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (!error.response) {
      listeners.forEach((listener) => listener(error));
    }
    return Promise.reject(error);
  }
);

const normalizeBaseUrl = (url: string) => url.replace(/\/+$/, '');

export function setApiUrl(url: string): void {
  API_BASE_URL = normalizeBaseUrl(url);
  apiClient.defaults.baseURL = API_BASE_URL;
}

export function getApiUrl(): string {
  return API_BASE_URL;
}

export function onApiFailure(listener: ApiFailureListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function normalizeApiUrl(url: string): string {
  return normalizeBaseUrl(url);
}

export async function verifyApiConnection(baseUrl: string): Promise<string> {
  const normalized = normalizeBaseUrl(baseUrl);
  let lastError: unknown;

  // Aumentar timeout para 15 segundos para dar tempo em conexões de rede
  const timeout = 15000;

  for (const endpoint of STATUS_ENDPOINTS) {
    try {
      const response = await apiClient.get(endpoint, { 
        baseURL: normalized, 
        timeout,
        // Permitir requisições para qualquer origem em Tauri
        headers: {
          'Accept': 'application/json',
        }
      });
      if (response.status >= 200 && response.status < 300) {
        return endpoint;
      }
    } catch (error) {
      lastError = error;
      // Log mais detalhado para debug
      if (error instanceof AxiosError) {
        console.error(`Erro ao verificar ${endpoint} em ${normalized}:`, {
          message: error.message,
          code: error.code,
          response: error.response?.status,
          config: error.config?.url
        });
      }
    }
  }

  if (lastError instanceof AxiosError) {
    // Melhorar mensagem de erro
    const errorMessage = lastError.code === 'ECONNREFUSED' 
      ? `Não foi possível conectar ao servidor em ${normalized}. Verifique se a API está rodando e acessível na rede.`
      : lastError.code === 'ETIMEDOUT'
      ? `Timeout ao conectar ao servidor em ${normalized}. Verifique a conexão de rede.`
      : lastError.message || 'Erro desconhecido ao conectar à API';
    
    const enhancedError = new Error(errorMessage);
    (enhancedError as any).originalError = lastError;
    throw enhancedError;
  }

  throw new Error(`API não respondeu aos endpoints de verificação em ${normalized}. Verifique se a API está rodando e acessível.`);
}

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export { apiClient };
