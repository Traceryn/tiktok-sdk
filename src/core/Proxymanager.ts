import { PROXY_HEALTH_INTERVAL } from '../utils/constants.js';

export interface ProxyEntry {
  url: string;
  failures: number;
  successes: number;
  lastUsed: number;
  avgResponseTime: number;
  score: number;
  enabled: boolean;
}

export type ProxyRotation = 'round-robin' | 'random' | 'lowest-failures';

export class Proxymanager {
  private proxies: ProxyEntry[] = [];
  private index = 0;
  private rotation: ProxyRotation;
  private healthTimer: ReturnType<typeof setInterval> | null = null;

  constructor(proxies?: string[], rotation: ProxyRotation = 'round-robin') {
    this.rotation = rotation;
    if (proxies?.length) {
      this.addProxies(proxies);
    }
    this.startHealthCheck();
  }

  addProxies(urls: string[]): void {
    for (const url of urls) {
      if (!this.proxies.some((p) => p.url === url)) {
        this.proxies.push({
          url,
          failures: 0,
          successes: 0,
          lastUsed: 0,
          avgResponseTime: 0,
          score: 1,
          enabled: true,
        });
      }
    }
  }

  removeProxy(url: string): void {
    this.proxies = this.proxies.filter((p) => p.url !== url);
  }

  getProxy(): ProxyEntry | null {
    const enabled = this.proxies.filter((p) => p.enabled);
    if (!enabled.length) return null;

    let entry: ProxyEntry;

    switch (this.rotation) {
      case 'round-robin': {
        this.index = (this.index + 1) % enabled.length;
        entry = enabled[this.index]!;
        break;
      }
      case 'random': {
        entry = enabled[Math.floor(Math.random() * enabled.length)]!;
        break;
      }
      case 'lowest-failures': {
        entry = enabled.reduce((a, b) =>
          a.failures < b.failures ? a : b,
        );
        break;
      }
    }

    entry.lastUsed = Date.now();
    return entry;
  }

  reportSuccess(url: string, responseTime?: number): void {
    const entry = this.proxies.find((p) => p.url === url);
    if (!entry) return;
    entry.successes++;
    entry.failures = Math.max(0, entry.failures - 1);
    if (responseTime) {
      entry.avgResponseTime =
        entry.avgResponseTime > 0
          ? (entry.avgResponseTime + responseTime) / 2
          : responseTime;
    }
    entry.score = this.calculateScore(entry);
  }

  reportFailure(url: string): void {
    const entry = this.proxies.find((p) => p.url === url);
    if (!entry) return;
    entry.failures++;
    entry.score = this.calculateScore(entry);
    if (entry.failures >= 10) {
      entry.enabled = false;
    }
  }

  private calculateScore(entry: ProxyEntry): number {
    const successRate = entry.successes + entry.failures > 0
      ? entry.successes / (entry.successes + entry.failures)
      : 1;
    const responseWeight = entry.avgResponseTime > 0
      ? Math.max(0, 1 - entry.avgResponseTime / 10000)
      : 1;
    return successRate * 0.6 + responseWeight * 0.4;
  }

  getStats(): { total: number; enabled: number; avgScore: number } {
    const enabled = this.proxies.filter((p) => p.enabled);
    return {
      total: this.proxies.length,
      enabled: enabled.length,
      avgScore: enabled.length > 0
        ? enabled.reduce((s, p) => s + p.score, 0) / enabled.length
        : 0,
    };
  }

  async healthCheck(): Promise<void> {
    for (const entry of this.proxies) {
      if (entry.enabled && entry.failures > 0 && entry.failures % 3 === 0) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 5000);
          await fetch(entry.url, {
            method: 'CONNECT',
            signal: controller.signal,
          });
          clearTimeout(timer);
          entry.enabled = true;
        } catch {
          entry.failures++;
          if (entry.failures >= 10) entry.enabled = false;
        }
      }
    }
  }

  private startHealthCheck(): void {
    this.healthTimer = setInterval(() => {
      this.healthCheck().catch(() => {});
    }, PROXY_HEALTH_INTERVAL);
  }

  destroy(): void {
    if (this.healthTimer) clearInterval(this.healthTimer);
  }
}
