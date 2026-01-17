import axios, { AxiosError, AxiosInstance } from 'axios';
import { applyTauriAdapter } from '../services/tauriAxiosAdapter';
import { logger } from '../utils/logger';

// Endpoints para verificação de conexão (sem autenticação)
const STATUS_ENDPOINTS = ['/health'];

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
    const headers = config.headers ?? {} as Record<string, string>;
    headers.Authorization = `Bearer ${authToken}`;
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
  let lastResponse: AxiosError | null = null;

  // Aumentar timeout para 15 segundos para dar tempo em conexões de rede
  const timeout = 15000;

  for (const endpoint of STATUS_ENDPOINTS) {
    try {
      const fullUrl = `${normalized}${endpoint}`;
      logger.debug(`Verificando conexão em: ${fullUrl}`);

      // Criar uma requisição sem o interceptor de autenticação para verificação
      const response = await apiClient.get(endpoint, {
        baseURL: normalized,
        timeout,
        headers: {
          'Accept': 'application/json',
        },
        // Aceitar qualquer status HTTP (mesmo 401/403/404) como indicação de que API está acessível
        validateStatus: () => true,
      });

      logger.debug(`Endpoint ${endpoint} respondeu com status ${response.status}`);

      // Se recebeu qualquer resposta HTTP (mesmo que seja erro), significa que API está acessível
      if (response.status >= 200 && response.status < 500) {
        return endpoint;
      }
    } catch (error) {
      lastError = error;
      if (error instanceof AxiosError) {
        const fullUrl = `${normalized}${endpoint}`;
        lastResponse = error;

        logger.debug(`Erro ao verificar ${fullUrl}:`, {
          message: error.message,
          code: error.code,
          response: error.response?.status,
          isApiAccessible: error.response !== undefined,
        });

        // Se recebeu resposta HTTP (mesmo que seja erro 401/403/404/307), API está acessível
        if (error.response && error.response.status < 500) {
          logger.debug(`API acessível (respondeu com status ${error.response.status})`);
          return endpoint;
        }
      }
    }
  }

  // Se chegou aqui, nenhum endpoint respondeu
  if (lastResponse && lastResponse.response) {
    const status = lastResponse.response.status;
    logger.warn(`API respondeu mas endpoints de verificação falharam (status: ${status})`);
    // Mesmo assim, considerar como sucesso se recebeu resposta HTTP
    if (status < 500) {
      return STATUS_ENDPOINTS[0]; // Retornar primeiro endpoint tentado
    }
  }

  if (lastError instanceof AxiosError) {
    // Melhorar mensagem de erro
    const errorMessage = lastError.code === 'ECONNREFUSED'
      ? `Não foi possível conectar ao servidor em ${normalized}. Verifique:\n- Se a API está rodando na porta 8000\n- Se o IP está correto (ex: 192.168.15.2:8000)\n- Se o firewall permite conexões\n- Se está na mesma rede`
      : lastError.code === 'ETIMEDOUT'
        ? `Timeout ao conectar ao servidor em ${normalized}. Verifique a conexão de rede.`
        : lastError.message || 'Erro desconhecido ao conectar à API';

    const enhancedError = new Error(errorMessage);
    // Adicionar erro original para debug
    Object.assign(enhancedError, { originalError: lastError });
    throw enhancedError;
  }

  throw new Error(`API não respondeu aos endpoints de verificação em ${normalized}. Verifique se a API está rodando e acessível na rede.`);
}

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export { apiClient };
