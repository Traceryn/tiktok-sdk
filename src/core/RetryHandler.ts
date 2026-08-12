export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  jitterFactor: number;
}

export class RetryHandler {
  private config: RetryConfig;

  constructor(config?: Partial<RetryConfig>) {
    this.config = {
      maxRetries: config?.maxRetries ?? 3,
      baseDelay: config?.baseDelay ?? 1000,
      maxDelay: config?.maxDelay ?? 30_000,
      jitterFactor: config?.jitterFactor ?? 0.5,
    };
  }

  shouldRetry(error: unknown, attempt: number): boolean {
    if (attempt >= this.config.maxRetries) return false;

    if (error && typeof error === 'object') {
      const err = error as Record<string, unknown>;
      if (err.name === 'TikTokParseError') return false;
      if (err.name === 'TikTokCircuitOpenError') return false;
      // WAF block usually means the proxy got burned, so try again
      if (err.name === 'TikTokWafError') return true;
      const status = err.statusCode ?? err.status;
      if (status && typeof status === 'number' && status < 500 && status !== 429) return false;
    }

    return true;
  }

  async delay(attempt: number): Promise<void> {
    const exp = Math.pow(2, attempt);
    const base = Math.min(this.config.baseDelay * exp, this.config.maxDelay);
    const jitter = base * this.config.jitterFactor * Math.random();
    const total = base + jitter;
    return new Promise((r) => setTimeout(r, total));
  }
}
