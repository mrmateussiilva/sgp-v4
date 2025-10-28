import axios, { AxiosError, AxiosInstance } from 'axios';
import { applyTauriAdapter } from './tauriAxiosAdapter';

const STATUS_ENDPOINTS = ['/health', '/pedidos'];

let API_BASE_URL = '';
let authToken: string | null = null;

type ApiFailureListener = (error: AxiosError) => void;

const listeners = new Set<ApiFailureListener>();

const apiClient: AxiosInstance = axios.create({
  timeout: 20000,
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

  for (const endpoint of STATUS_ENDPOINTS) {
    try {
      const response = await apiClient.get(endpoint, { baseURL: normalized, timeout: 5000 });
      if (response.status >= 200 && response.status < 300) {
        return endpoint;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof AxiosError) {
    throw lastError;
  }

  throw new Error('API não respondeu aos endpoints de verificação.');
}

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export { apiClient };
