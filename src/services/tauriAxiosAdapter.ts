import type { AxiosAdapter, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { AxiosError } from 'axios';
import { Body, ResponseType, fetch, type HttpVerb } from '@tauri-apps/api/http';
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

function mapResponseType(responseType?: AxiosRequestConfig['responseType']): ResponseType {
  switch (responseType) {
    case 'arraybuffer':
    case 'blob':
      return ResponseType.Binary;
    case 'document':
    case 'text':
      return ResponseType.Text;
    case 'json':
    default:
      return ResponseType.JSON;
  }
}

function buildBody(data: unknown) {
  if (data === undefined || data === null) {
    return undefined;
  }

  if (typeof data === 'string') {
    return Body.text(data);
  }

  if (data instanceof ArrayBuffer) {
    return Body.bytes(new Uint8Array(data));
  }

  if (data instanceof Uint8Array) {
    return Body.bytes(data);
  }

  return Body.json(data as any);
}

function toHttpVerb(method?: string): HttpVerb {
  const normalized = (method ?? 'GET').toUpperCase() as HttpVerb;
  return normalized;
}

const tauriAxiosAdapter: AxiosAdapter = async (config) => {
  const url = resolveUrl(config);
  const method = toHttpVerb(config.method);

  const headers = (config.headers && typeof (config.headers as any).toJSON === 'function')
    ? (config.headers as any).toJSON()
    : { ...(config.headers as Record<string, string> | undefined) };

  const response = await fetch(url, {
    method,
    headers,
    timeout: config.timeout,
    responseType: mapResponseType(config.responseType),
    body: buildBody(config.data),
  });

  const requestInfo = { url, method, headers };

  const axiosResponse: AxiosResponse = {
    data: response.data,
    status: response.status,
    statusText: response.statusText ?? '',
    headers: response.headers ?? {},
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

