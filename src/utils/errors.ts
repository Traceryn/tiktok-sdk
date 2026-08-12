export class TikTokError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TikTokError';
  }
}

export class TikTokParseError extends TikTokError {
  public strategiesAttempted: number;

  constructor(message = 'Failed to parse TikTok page data', strategiesAttempted = 0) {
    super(message);
    this.name = 'TikTokParseError';
    this.strategiesAttempted = strategiesAttempted;
  }
}

export class TikTokFetchError extends TikTokError {
  public statusCode?: number;
  public proxy?: string;

  constructor(message: string, statusCode?: number, proxy?: string) {
    super(message);
    this.name = 'TikTokFetchError';
    this.statusCode = statusCode;
    this.proxy = proxy;
  }
}

export class TikTokRateLimitError extends TikTokError {
  public retryAfter: number;

  constructor(retryAfter = 5000) {
    super(`Rate limited. Retry after ${retryAfter}ms`);
    this.name = 'TikTokRateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class TikTokProxyError extends TikTokError {
  public proxy?: string;

  constructor(message: string, proxy?: string) {
    super(message);
    this.name = 'TikTokProxyError';
    this.proxy = proxy;
  }
}

export class TikTokCircuitOpenError extends TikTokError {
  public retryAfter: number;

  constructor(retryAfter: number) {
    super(`Circuit breaker open. Retry after ${retryAfter}ms`);
    this.name = 'TikTokCircuitOpenError';
    this.retryAfter = retryAfter;
  }
}

export class TikTokCacheError extends TikTokError {
  constructor(message: string) {
    super(message);
    this.name = 'TikTokCacheError';
  }
}

export class TikTokWafError extends TikTokFetchError {
  constructor(message?: string, proxy?: string) {
    const msg = message ?? (
      'TikTok is blocking the request (WAF). ' +
      'Try using a PlaywrightSession — npm install playwright'
    );
    super(msg, 200, proxy);
    this.name = 'TikTokWafError';
  }
}
