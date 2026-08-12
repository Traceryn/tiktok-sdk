import { ofetch } from 'ofetch';
import { Proxymanager } from './core/Proxymanager.js';

export interface ProxiflyConfig {
  protocol?: 'http' | 'socks4' | 'socks5';
  country?: string;
  https?: boolean;
  quantity?: number;
  refreshInterval?: number;
}

const CDN_BASE = 'https://cdn.jsdelivr.net/gh/proxifly/free-proxy-list@main/proxies';

export class ProxiflyProvider {
  private proxyManager: Proxymanager;
  private defaults: ProxiflyConfig;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private _ready: Promise<void>;
  private _resolveReady!: () => void;
  private _rejectReady!: (err: Error) => void;
  private _fulfilled = false;

  constructor(
    proxyManager: Proxymanager,
    config?: ProxiflyConfig,
    manualProxies?: string[],
  ) {
    this.proxyManager = proxyManager;

    if (manualProxies?.length) {
      proxyManager.addProxies(manualProxies);
    }

    this.defaults = {
      protocol: 'http',
      country: 'US',
      https: true,
      quantity: 10,
      refreshInterval: 300_000,
      ...config,
    };

    this._ready = new Promise<void>((resolve, reject) => {
      this._resolveReady = resolve;
      this._rejectReady = reject;
    });

    if (manualProxies?.length) {
      this._fulfilled = true;
      this._resolveReady();
    } else {
      this.fetchFromCDN()
        .then((urls) => {
          if (urls.length > 0) {
            this.proxyManager.addProxies(urls);
            this._fulfilled = true;
            this._resolveReady();
            this.startAutoRefresh();
          } else {
            this._rejectReady(new Error('ProxiflyProvider: no proxies returned from CDN'));
          }
        })
        .catch((err) => {
          this._rejectReady(err);
        });
    }
  }

  get ready(): Promise<void> {
    return this._ready;
  }

  get isReady(): boolean {
    return this._fulfilled;
  }

  async fetchFromCDN(): Promise<string[]> {
    const country = this.defaults.country?.toUpperCase() ?? '';
    const protocol = this.defaults.protocol ?? 'http';

    const sources = [
      country ? `${CDN_BASE}/countries/${country}/data.txt` : null,
      `${CDN_BASE}/protocols/${protocol}/data.txt`,
      `${CDN_BASE}/all/data.txt`,
    ].filter(Boolean) as string[];

    const seen = new Set<string>();

    for (const url of sources) {
      try {
        const text = await ofetch<string>(url, {
          parseResponse: (t: string) => t,
          timeout: 10000,
        });

        for (const line of text.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          if (trimmed.includes('://')) {
            if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
              seen.add(trimmed);
            }
          } else {
            seen.add(`http://${trimmed}`);
          }
        }

        if (seen.size >= (this.defaults.quantity ?? 10)) break;
      } catch {}
    }

    return Array.from(seen).slice(0, this.defaults.quantity ?? 10);
  }

  startAutoRefresh(): void {
    if (this.refreshTimer) return;
    const interval = this.defaults.refreshInterval ?? 300_000;
    this.refreshTimer = setInterval(() => {
      this.fetchFromCDN()
        .then((urls) => {
          if (urls.length > 0) this.proxyManager.addProxies(urls);
        })
        .catch(() => {});
    }, interval);
  }

  stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}
