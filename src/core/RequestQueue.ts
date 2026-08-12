type Task<T> = () => Promise<T>;

interface QueueItem<T> {
  task: Task<T>;
  priority: number;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
}

export class RequestQueue {
  private queue: Array<QueueItem<unknown>> = [];
  private activeCount = 0;
  private maxConcurrency: number;
  private paused = false;

  constructor(maxConcurrency = 3) {
    this.maxConcurrency = maxConcurrency;
  }

  enqueue<T>(task: Task<T>, priority = 0): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ task, priority, resolve, reject } as QueueItem<unknown>);
      this.queue.sort((a, b) => b.priority - a.priority);
      this.processNext();
    });
  }

  private processNext(): void {
    if (this.paused || this.activeCount >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    this.activeCount++;
    const item = this.queue.shift()!;

    item
      .task()
      .then((result) => item.resolve(result))
      .catch((error) => item.reject(error))
      .finally(() => {
        this.activeCount--;
        this.processNext();
      });
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
    this.processNext();
  }

  getActiveCount(): number {
    return this.activeCount;
  }

  getPendingCount(): number {
    return this.queue.length;
  }

  clear(): void {
    for (const item of this.queue) {
      item.reject(new Error('Queue cleared'));
    }
    this.queue = [];
  }
}
