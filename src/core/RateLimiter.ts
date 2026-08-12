export interface RateLimiterConfig {
  tokensPerSecond: number;
  maxBurst: number;
}

export class RateLimiter {
  private tokensPerSecond: number;
  private maxBurst: number;
  private tokens: number;
  private lastRefill: number;
  private waitQueue: Array<{
    resolve: () => void;
    reject: (err: Error) => void;
    deadline: number;
  }> = [];

  constructor(config: RateLimiterConfig) {
    this.tokensPerSecond = config.tokensPerSecond;
    this.maxBurst = config.maxBurst;
    this.tokens = config.maxBurst;
    this.lastRefill = Date.now();
  }

  async acquire(count = 1, timeout = 10_000): Promise<void> {
    this.refill();

    if (this.tokens >= count) {
      this.tokens -= count;
      return;
    }

    return new Promise<void>((resolve, reject) => {
      this.waitQueue.push({
        resolve,
        reject,
        deadline: Date.now() + timeout,
      });
      this.processQueue();
    });
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxBurst, this.tokens + elapsed * this.tokensPerSecond);
    this.lastRefill = now;
  }

  private processQueue(): void {
    this.refill();

    while (this.waitQueue.length > 0 && this.tokens > 0) {
      const item = this.waitQueue[0]!;
      if (Date.now() > item.deadline) {
        this.waitQueue.shift();
        item.reject(new Error('Rate limit acquire timeout'));
        continue;
      }
      this.tokens -= 1;
      this.waitQueue.shift();
      item.resolve();
    }
  }

  getTokensRemaining(): number {
    this.refill();
    return this.tokens;
  }
}
