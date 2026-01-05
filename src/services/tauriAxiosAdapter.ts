import type { AxiosAdapter, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { AxiosError } from 'axios';
import { fetch } from '@tauri-apps/plugin-http';
import { isTauri } from '@/utils/isTauri';

function resolveUrl(config: AxiosRequestConfig): string {
  const { url = '', baseURL } = config;

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  if (baseURL) {
    try {
      return new URL(url, baseURL).toString();
    } catch {
      const trimmedBase = baseURL.replace(/\/+$/, '');
      const trimmedUrl = url.replace(/^\/+/, '');
      return `${trimmedBase}/${trimmedUrl}`;
    }
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
