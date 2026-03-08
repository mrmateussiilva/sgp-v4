import type { AxiosAdapter, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { AxiosError } from 'axios';
import { isTauri } from '@/utils/isTauri';

let fallbackBaseUrl = '';

/**
 * Define uma URL base de fallback caso não seja fornecida no config do Axios.
 * Útil para situações onde o merge do Axios falha ou em chamadas diretas.
 */
export function setAdapterFallbackBaseUrl(url: string): void {
  fallbackBaseUrl = url;
}

function resolveUrl(config: AxiosRequestConfig): string {
  const { baseURL } = config;
  let { url = '' } = config;

  // Usar fallback se baseURL do config estiver ausente
  const effectiveBaseUrl = baseURL || fallbackBaseUrl;

  // Primeiro, resolver a URL base
  if (!/^https?:\/\//i.test(url)) {
    if (effectiveBaseUrl) {
      // Garantir que baseURL tenha protocolo
      const baseWithProtocol = /^https?:\/\//i.test(effectiveBaseUrl) ? effectiveBaseUrl : `http://${effectiveBaseUrl}`;

      try {
        // Garantir que a URL relativa não comece com / se a base termina com / (ou vice-versa)
        // O construtor URL lida bem com isso se url começar com /
        const normalizedRelUrl = url.startsWith('/') ? url : `/${url}`;
        const fullUrl = new URL(normalizedRelUrl, baseWithProtocol);
        url = fullUrl.toString();
      } catch (error) {
        // Se falhar, fazer concatenação manual mais robusta
        const trimmedBase = baseWithProtocol.replace(/\/+$/, '');
        const trimmedUrl = url.replace(/^\/+/, '');
        const combined = `${trimmedBase}/${trimmedUrl}`;

        // Validar se a URL resultante é válida
        try {
          new URL(combined);
          url = combined;
        } catch {
          // Se ainda falhar, retornar a URL combinada mesmo assim
          // O fetch do Tauri pode aceitar URLs relativas
          url = combined;
        }
      }
    } else {
      // Se não houver baseURL e a URL for relativa, lançar erro mais descritivo
      throw new Error(`Configuração de API ausente. Não foi possível resolver a URL alvo: ${url}. Verifique se a URL base da API foi configurada corretamente.`);
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getResponseData(response: Response, responseType?: AxiosRequestConfig['responseType']): Promise<any> {
  // Se o status for 204 No Content ou 205 Reset Content, ou se o status for 200/201 mas o corpo estiver vazio
  if (response.status === 204 || response.status === 205) {
    return null;
  }

  try {
    if (responseType === 'arraybuffer') {
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength === 0) return null;
      return buffer;
    }

    if (responseType === 'blob') {
      const blob = await response.blob();
      if (blob.size === 0) return null;
      return blob;
    }

    // Para text e json, lemos como texto
    const text = await response.text();

    if (!text || text.trim().length === 0) {
      return null;
    }

    if (responseType === 'text') {
      return text;
    }

    // Default ou json
    try {
      return JSON.parse(text);
    } catch (e) {
      // Se falhou o parse JSON mas o responseType era padrão, retorna como texto
      if (!responseType || responseType === 'json') {
        return text;
      }
      throw e;
    }
  } catch {
    return null;
  }
}

const tauriAxiosAdapter: AxiosAdapter = async (config) => {
  const url = resolveUrl(config);
  const method = (config.method ?? 'GET').toUpperCase();

  const headers = new Headers();
  if (config.headers) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const headerObj = (config.headers && typeof (config.headers as any).toJSON === 'function')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  const response = await fetch(url, fetchOptions);

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
