import { ofetch } from 'ofetch';
import { DEFAULT_TIMEOUT } from './constants.js';

export interface HttpClientConfig {
  proxy?: string;
  timeout?: number;
  headers?: Record<string, string>;
  cookie?: string;
}

export class HttpClient {
  async get<T>(url: string, config?: HttpClientConfig): Promise<T> {
    return ofetch<T>(url, {
      headers: config?.headers,
      ...(config?.proxy ? { proxy: config.proxy } : {}),
      timeout: config?.timeout ?? DEFAULT_TIMEOUT,
      parseResponse: JSON.parse,
      retry: 0,
    } as any);
  }

  async getText(url: string, config?: HttpClientConfig): Promise<string> {
    return ofetch<string>(url, {
      headers: config?.headers,
      ...(config?.proxy ? { proxy: config.proxy } : {}),
      timeout: config?.timeout ?? DEFAULT_TIMEOUT,
      parseResponse: (txt: string) => txt,
      retry: 0,
    } as any);
  }

  async getBuffer(url: string, config?: HttpClientConfig): Promise<ArrayBuffer> {
    const buf = await ofetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Referer: 'https://www.tiktok.com/',
        Cookie: config?.cookie ?? '',
        Accept: '*/*',
        ...config?.headers,
      },
      ...(config?.proxy ? { proxy: config.proxy } : {}),
      timeout: config?.timeout ?? 60000,
      responseType: 'arrayBuffer',
      retry: 0,
    } as any);
    return buf as unknown as ArrayBuffer;
  }
}
