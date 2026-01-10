import type { AxiosAdapter, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { AxiosError } from 'axios';
import { fetch } from '@tauri-apps/plugin-http';
import { isTauri } from '@/utils/isTauri';

function resolveUrl(config: AxiosRequestConfig): string {
  let { url = '', baseURL } = config;

  // Primeiro, resolver a URL base
  if (!/^https?:\/\//i.test(url)) {
    if (baseURL) {
      try {
        // Tentar construir URL usando URL constructor
        const fullUrl = new URL(url, baseURL);
        url = fullUrl.toString();
      } catch (error) {
        // Se falhar, fazer concatenação manual mais robusta
        const trimmedBase = baseURL.replace(/\/+$/, '');
        const trimmedUrl = url.replace(/^\/+/, '');
        const combined = `${trimmedBase}/${trimmedUrl}`;
        
        // Validar se a URL resultante é válida
        try {
          new URL(combined);
          url = combined;
        } catch {
          // Se ainda falhar, retornar a URL combinada mesmo assim
          // O fetch do Tauri pode aceitar URLs relativas
          console.warn('URL construction warning:', { baseURL, url: url, combined, error });
          url = combined;
        }
      }
    }
  }

  // Adicionar query parameters se existirem
  if (config.params) {
    const urlObj = new URL(url);
    Object.entries(config.params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        urlObj.searchParams.append(key, String(value));
      }
    });
    url = urlObj.toString();
  }

  return url;
}

async function getResponseData(response: Response, responseType?: AxiosRequestConfig['responseType']): Promise<any> {
  switch (responseType) {
    case 'arraybuffer':
      return await response.arrayBuffer();
    case 'blob':
      return await response.blob();
    case 'text':
      return await response.text();
    case 'json':
    default:
      return await response.json();
  }
}

const tauriAxiosAdapter: AxiosAdapter = async (config) => {
  const url = resolveUrl(config);
  const method = (config.method ?? 'GET').toUpperCase();
  
  // Log para debug de query parameters
  if (config.params && Object.keys(config.params).length > 0) {
    console.log('[tauriAxiosAdapter] 📡 Query params:', config.params, 'URL final:', url);
  }

  const headers = new Headers();
  if (config.headers) {
    const headerObj = (config.headers && typeof (config.headers as any).toJSON === 'function')
      ? (config.headers as any).toJSON()
      : { ...(config.headers as Record<string, string> | undefined) };
    
    Object.entries(headerObj).forEach(([key, value]) => {
      // Não definir Content-Type para FormData - o fetch/Tauri define automaticamente
      if (value !== undefined && value !== null && !(key.toLowerCase() === 'content-type' && config.data instanceof FormData)) {
        headers.set(key, String(value));
      }
    });
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  if (config.data !== undefined && config.data !== null) {
    if (typeof config.data === 'string') {
      fetchOptions.body = config.data;
    } else if (config.data instanceof ArrayBuffer) {
      fetchOptions.body = config.data;
    } else if (config.data instanceof Uint8Array) {
      // Converter Uint8Array para ArrayBuffer para compatibilidade
      fetchOptions.body = config.data.buffer.slice(
        config.data.byteOffset,
        config.data.byteOffset + config.data.byteLength
      ) as ArrayBuffer;
    } else if (config.data instanceof FormData) {
      // FormData: o Tauri HTTP plugin precisa que seja passado diretamente
      // Não definir Content-Type - o fetch/Tauri define automaticamente com boundary
      fetchOptions.body = config.data;
      // Remover Content-Type se foi definido manualmente (não deve ter sido)
      // O fetch/Tauri define automaticamente multipart/form-data com boundary
    } else if (config.data instanceof Blob) {
      fetchOptions.body = config.data;
    } else {
      fetchOptions.body = JSON.stringify(config.data);
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
    }
  }

  const response = await fetch(url, {
    ...fetchOptions,
    connectTimeout: config.timeout,
  });

  const requestInfo = { url, method, headers: Object.fromEntries(headers.entries()) };

  const data = await getResponseData(response, config.responseType);

  const axiosResponse: AxiosResponse = {
    data,
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
    config,
    request: requestInfo,
  };

  const validateStatus = config.validateStatus;

  if (!validateStatus || validateStatus(axiosResponse.status)) {
    return axiosResponse;
  }

  throw new AxiosError(
    `Request failed with status code ${axiosResponse.status}`,
    AxiosError.ERR_BAD_RESPONSE,
    config,
    requestInfo,
    axiosResponse
  );
};

export function applyTauriAdapter(instance: AxiosInstance): void {
  if (isTauri()) {
    instance.defaults.adapter = tauriAxiosAdapter;
  }
}
