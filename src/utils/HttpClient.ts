import { ofetch } from 'ofetch';
import { DEFAULT_TIMEOUT } from './constants.js';

export interface HttpClientConfig {
  proxy?: string;
  timeout?: number;
  headers?: Record<string, string>;
  cookie?: string;
  onResponse?: (ctx: { response: Response | null }) => void;
}

export function textFetch(url: string, config?: HttpClientConfig): Promise<string> {
  return ofetch<string>(url, {
    ...(config?.headers ? { headers: config.headers } : {}),
    ...(config?.proxy ? { proxy: config.proxy } : {}),
    timeout: config?.timeout ?? DEFAULT_TIMEOUT,
    parseResponse: (txt: string) => txt,
    retry: 0,
    ...(config?.onResponse ? { onResponse: config.onResponse } : {}),
  });
}

export function jsonFetch<T>(url: string, config?: HttpClientConfig): Promise<T> {
  return ofetch<T>(url, {
    ...(config?.headers ? { headers: config.headers } : {}),
    ...(config?.proxy ? { proxy: config.proxy } : {}),
    timeout: config?.timeout ?? DEFAULT_TIMEOUT,
    parseResponse: JSON.parse,
    retry: 0,
    ...(config?.onResponse ? { onResponse: config.onResponse } : {}),
  });
}

export function bufferFetch(url: string, config?: HttpClientConfig): Promise<ArrayBuffer> {
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    Referer: 'https://www.tiktok.com/',
    Cookie: config?.cookie ?? '',
    Accept: '*/*',
    ...(config?.headers ?? {}),
  };
  return ofetch(url, {
    headers,
    ...(config?.proxy ? { proxy: config.proxy } : {}),
    timeout: config?.timeout ?? 60000,
    responseType: 'arrayBuffer',
    retry: 0,
    ...(config?.onResponse ? { onResponse: config.onResponse } : {}),
  }) as Promise<ArrayBuffer>;
}

export class HttpClient {
  async get<T>(url: string, config?: HttpClientConfig): Promise<T> {
    return jsonFetch<T>(url, config);
  }

  async getText(url: string, config?: HttpClientConfig): Promise<string> {
    return textFetch(url, config);
  }

  async getBuffer(url: string, config?: HttpClientConfig): Promise<ArrayBuffer> {
    return bufferFetch(url, config);
  }
}