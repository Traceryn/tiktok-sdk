export interface PlaywrightBrowser {
  close(): Promise<void>;
  contexts(): unknown[];
  newContext(options?: Record<string, unknown>): Promise<PlaywrightContext>;
}

export interface PlaywrightContext {
  newPage(): Promise<PlaywrightPage>;
  close(): Promise<void>;
  cookies(): Promise<PlaywrightCookie[]>;
  setExtraHTTPHeaders(headers: Record<string, string>): Promise<void>;
  addInitScript(script: string | { content: string }): Promise<void>;
}

export interface PlaywrightResponse {
  url(): string;
  status(): number;
  headers(): Record<string, string>;
  text(): Promise<string>;
  json(): Promise<unknown>;
}

export interface PlaywrightPage {
  goto(url: string, options?: { waitUntil?: string; timeout?: number }): Promise<unknown>;
  close(): Promise<void>;
  evaluate<R = unknown>(fn: string | ((arg: string) => R), arg?: string): Promise<R>;
  setViewportSize(size: { width: number; height: number }): Promise<void>;
  waitForSelector(selector: string, options?: { timeout?: number }): Promise<unknown>;
  waitForFunction(fn: () => boolean, options?: { timeout?: number; polling?: number }): Promise<unknown>;
  waitForTimeout(ms: number): Promise<void>;
  on(event: 'crash' | 'close', listener: () => void): void;
  on(event: 'response', listener: (response: PlaywrightResponse) => void | Promise<void>): void;
  removeListener(event: 'response', listener: (response: PlaywrightResponse) => void | Promise<void>): void;
  addInitScript(script: string | { content: string }): Promise<void>;
  context(): PlaywrightContext;
  url(): string;
  headers(): Promise<Record<string, string>>;
}

export interface PlaywrightCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

export interface PlaywrightModule {
  chromium: {
    launch(options: {
      headless?: boolean;
      args?: string[];
      [key: string]: unknown;
    }): Promise<PlaywrightBrowser>;
  };
}