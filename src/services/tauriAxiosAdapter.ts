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

function buildBody(data: unknown): BodyInit | undefined {
  if (data === undefined || data === null) {
    return undefined;
  }

  if (typeof data === 'string') {
    return data;
  }

  if (data instanceof ArrayBuffer) {
    return data;
  }

  if (data instanceof Uint8Array) {
    // Converter Uint8Array para ArrayBuffer para compatibilidade com BodyInit
    // Criar uma cópia para garantir que é um ArrayBuffer válido
    return new Uint8Array(data).buffer;
  }

  if (data instanceof FormData || data instanceof Blob) {
    return data;
  }

  // Para objetos, converter para JSON string
  return JSON.stringify(data);
}

const tauriAxiosAdapter: AxiosAdapter = async (config) => {
  const url = resolveUrl(config);
  const method = (config.method ?? 'GET').toUpperCase();

  console.log(`🌐 [Tauri Adapter] Fazendo requisição: ${method} ${url}`);

  const headers = (config.headers && typeof (config.headers as Record<string, unknown>).toJSON === 'function')
    ? (config.headers as { toJSON: () => Record<string, string> }).toJSON()
    : { ...(config.headers as Record<string, string> | undefined) };

  // Se não houver Content-Type e os dados forem um objeto, definir como application/json
  if (config.data && typeof config.data === 'object' && !(config.data instanceof FormData) && !(config.data instanceof Blob) && !(config.data instanceof ArrayBuffer) && !(config.data instanceof Uint8Array)) {
    if (!headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/json';
    }
  }

  // Adicionar Origin header (requerido pelo Tauri v2 e backend FastAPI com allow_credentials=True)
  // Garantir que headers seja um objeto
  const finalHeaders: Record<string, string> = {
    ...headers,
    'Origin': 'tauri://localhost',
  };

  const fetchOptions: RequestInit & { timeout?: number } = {
    method,
    headers: finalHeaders,
    body: buildBody(config.data),
  };

  // timeout pode não estar disponível em todas as versões do plugin
  if (config.timeout !== undefined) {
    (fetchOptions as { timeout?: number }).timeout = config.timeout;
  }

  console.log(`🌐 [Tauri Adapter] Opções de fetch:`, {
    method,
    url,
    hasHeaders: !!headers,
    hasBody: !!fetchOptions.body,
    timeout: fetchOptions.timeout,
  });

  let response: Response;
  try {
    response = await fetch(url, fetchOptions);
    console.log(`✅ [Tauri Adapter] Resposta recebida:`, {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      url: response.url,
    });
  } catch (error) {
    console.error(`❌ [Tauri Adapter] Erro na requisição:`, {
      url,
      method,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }

  const requestInfo = { url, method, headers };

  // Processar a resposta baseado no responseType do Axios
  let responseData: unknown;
  const responseType = config.responseType || 'json';

  try {
    switch (responseType) {
      case 'arraybuffer':
        responseData = await response.arrayBuffer();
        break;
      case 'blob':
        responseData = await response.blob();
        break;
      case 'text':
        responseData = await response.text();
        break;
      case 'json':
      default:
        responseData = await response.json();
        break;
    }
  } catch (error) {
    // Se falhar ao parsear JSON, tentar como texto
    if (responseType === 'json') {
      responseData = await response.text();
    } else {
      throw error;
    }
  }

  const axiosResponse: AxiosResponse = {
    data: responseData,
    status: response.status,
    statusText: response.statusText || (response.ok ? 'OK' : ''),
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
