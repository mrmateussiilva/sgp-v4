import axios, { AxiosError, AxiosInstance } from 'axios';
import { applyTauriAdapter, setAdapterFallbackBaseUrl } from '../services/tauriAxiosAdapter';
import { logger } from '../utils/logger';
import { rustClient } from '../services/rustClient';

// Endpoints para verificação de conexão (sem autenticação)
const STATUS_ENDPOINTS = ['/health'];

let API_BASE_URL = '';
let authToken: string | null = null;

type ApiFailureListener = (error: AxiosError) => void;

const listeners = new Set<ApiFailureListener>();

const apiClient: AxiosInstance = axios.create({
  timeout: 10000, // Reduzido para 10 segundos para falhar mais rápido no browser
});

applyTauriAdapter(apiClient);

apiClient.interceptors.request.use((config) => {
  const headers = config.headers ?? {} as Record<string, string>;

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  // Bypass ngrok browser warning for all requests
  headers['ngrok-skip-browser-warning'] = 'any';

  config.headers = headers;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Log detalhado para erros 422 (Unprocessable Entity)
    if (error.response?.status === 422) {
      logger.error('[API Client] Erro 422 - Unprocessable Entity:', {
        url: error.config?.url,
        method: error.config?.method,
        data: error.config?.data,
        responseData: error.response?.data,
        headers: error.config?.headers,
      });
    }

    // Se a requisição tiver o header 'X-Silent-Request', não notificar os listeners globais
    // Isso evita que falhas em chamadas não essenciais (ex: logout) acionem a tela de fallback
    const isSilent = error.config?.headers?.['X-Silent-Request'] === 'true';

    if (!error.response && !isSilent) {
      listeners.forEach((listener) => listener(error));
    }
    return Promise.reject(error);
  }
);

const normalizeBaseUrl = (url: string) => url.replace(/\/+$/, '');

export function setApiUrl(url: string): void {
  API_BASE_URL = normalizeBaseUrl(url);
  apiClient.defaults.baseURL = API_BASE_URL;
  // Sincronizar o fallback do adaptador Tauri para garantir que requisições relativas
  // funcionem mesmo se o config.baseURL for perdido durante o merge do Axios
  setAdapterFallbackBaseUrl(API_BASE_URL);
  rustClient.syncAuthAndConfig(API_BASE_URL, authToken);
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

  // Reduzido para 8 segundos (metade do anterior) para evitar hang no browser
  const timeout = 8000;

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
    const errorMessage = (lastError.code === 'ECONNREFUSED' || lastError.code === 'ERR_NETWORK')
      ? `Não foi possível conectar ao servidor em ${normalized}. Verifique:\n- Se a API está rodando na porta 8000\n- Se o IP está correto (ex: 192.168.15.2:8000)\n- Se o firewall permite conexões\n- Se está na mesma rede`
      : lastError.code === 'ETIMEDOUT' || lastError.code === 'ECONNABORTED'
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
  rustClient.syncAuthAndConfig(API_BASE_URL, authToken);
}

export { apiClient };
