import { DEFAULT_CACHE_TTL } from '../utils/constants.js';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class CacheManager {
  private store = new Map<string, CacheEntry<unknown>>();
  private defaultTTL: number;

  constructor(defaultTTL?: number) {
    this.defaultTTL = defaultTTL ?? DEFAULT_CACHE_TTL;
    this.startEviction();
  }

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      // stale entry, drop it and move on
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttl?: number): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttl ?? this.defaultTTL),
    });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        // keep the cache from filling up with dead stuff
        this.store.delete(key);
      }
    }
  }

  private startEviction(): void {
    // quiet background cleanup so the cache stays tidy
    setInterval(() => this.evictExpired(), 30_000);
  }
}
