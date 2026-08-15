export interface NavigatorOverrides {
  platform?: string;
  vendor?: string;
  userAgent?: string;
  hardwareConcurrency?: number;
  language?: string;
  languages?: string[];
  deviceMemory?: number;
  appVersion?: string;
  appName?: string;
  appCodeName?: string;
  product?: string;
  productSub?: string;
  oscpu?: string;
  maxTouchPoints?: number;
}

const WEBGL_VENDOR = 'Intel Inc.';
const WEBGL_RENDERER = 'Intel Iris OpenGL Engine';

const stealthPreamble = `(() => {
  const $ = (v) => v;

  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

  Object.defineProperty(navigator, 'plugins', {
    get: () => [
      { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
      { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
      { name: 'Native Client', filename: 'internal-nacl-plugin' },
    ],
  });
  Object.defineProperty(navigator, 'mimeTypes', {
    get: () => [
      { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' },
      { type: 'text/pdf', suffixes: 'pdf', description: 'Portable Document Format' },
    ],
  });

  window.chrome = window.chrome || {};
  window.chrome.runtime = {
    connect: () => ({ onMessage: { addListener: () => {} }, onDisconnect: { addListener: () => {} }, postMessage: () => {} }),
    sendMessage: () => Promise.resolve(),
    onMessage: { addListener: () => {} },
    onConnect: { addListener: () => {} },
    onInstalled: { addListener: () => {} },
    id: 'aapnijgdinmhnhmmojgejbnbhkfodcji',
  };

  if (navigator.permissions && navigator.permissions.query) {
    const origQuery = navigator.permissions.query.bind(navigator.permissions);
    navigator.permissions.query = (desc) => {
      if (desc.name === 'notifications') return Promise.resolve({ state: 'prompt' });
      if (desc.name === 'clipboard-read' || desc.name === 'clipboard-write') return Promise.resolve({ state: 'granted' });
      return origQuery(desc);
    };
  }

  if (navigator.connection) {
    Object.defineProperty(navigator.connection, 'rtt', { get: () => 100 });
    Object.defineProperty(navigator.connection, 'downlink', { get: () => 10 });
    Object.defineProperty(navigator.connection, 'effectiveType', { get: () => '4g' });
  }

  const patchGL = (proto) => {
    if (!proto) return;
    const orig = proto.getParameter;
    proto.getParameter = function(p) {
      if (p === 37445) return '${WEBGL_VENDOR}';
      if (p === 37446) return '${WEBGL_RENDERER}';
      return orig.call(this, p);
    };
  };
  patchGL(WebGLRenderingContext.prototype);
  patchGL(document.createElement('canvas').getContext('webgl2')?.__proto__);

  const origToString = Function.prototype.toString;
  Function.prototype.toString = function() {
    if (this === window.byted_acrawler?.frontierSign) return 'function frontierSign() { [native code] }';
    return origToString.call(this);
  };
})();`;

function navigatorOverrideScript(overrides: NavigatorOverrides): string {
  const json = JSON.stringify(overrides);
  return `(() => {
    const overrides = ${json};
    const navProto = (() => {
      try {
        return Object.getOwnPropertyDescriptor(Navigator.prototype, 'userAgent')?.configurable ? Navigator.prototype : null;
      } catch { return null; }
    })();
    for (const key of Object.keys(overrides)) {
      const val = overrides[key];
      Object.defineProperty(navigator, key, {
        get: () => val,
        configurable: true,
        enumerable: true,
      });
      if (navProto) {
        try { Object.defineProperty(navProto, key, { get: () => val, configurable: true }); } catch {}
      }
    }
  })();`;
}

export function buildStealthScript(overrides?: NavigatorOverrides): string {
  const parts: string[] = [stealthPreamble];
  if (overrides) parts.push(navigatorOverrideScript(overrides));
  return parts.join('\n\n');
}

// session stuff

export interface PlaywrightSessionOptions {
  headless?: boolean;
  proxy?: string;
  numSessions?: number;
  navigatorOverrides?: NavigatorOverrides;
}

interface SessionState {
  page: any;
  browser: any;
  context: any;
  msToken: string;
  csrfToken: string;
  params: Record<string, string>;
  crashed: boolean;
}

const defaultNavOverrides: NavigatorOverrides = {
  platform: 'Win32',
  vendor: 'Google Inc.',
  hardwareConcurrency: 8,
  language: 'en-US',
  languages: ['en-US', 'en'],
  deviceMemory: 8,
  appVersion:
    '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
  maxTouchPoints: 0,
  appName: 'Netscape',
  appCodeName: 'Mozilla',
  product: 'Gecko',
  productSub: '20030107',
  oscpu: 'Windows NT 10.0',
};

export class PlaywrightSession {
  private state: SessionState | null = null;
  private _browser: any = null;
  private _playwrightMod: any = null;
  private options: PlaywrightSessionOptions;

  constructor(options: PlaywrightSessionOptions = {}) {
    this.options = {
      headless: true,
      numSessions: 1,
      ...options,
    };
  }

  get msToken(): string {
    return this.state?.msToken ?? '';
  }

  get params(): Record<string, string> {
    return this.state?.params ?? {};
  }

  get isReady(): boolean {
    return this._browser !== null;
  }

  private async ensurePage(): Promise<{ page: any; context: any }> {
    // browser is gone, stop here
    if (!this._browser) throw new Error('Browser not launched. Call init() first.');

    // If page crashed, recreate context + page + navigate to TikTok for acrawler
    if (!this.state || this.state.crashed) {
      const context = await this._browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
        locale: 'en-US', timezoneId: 'America/New_York',
        viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1,
        hasTouch: false, javaScriptEnabled: true, bypassCSP: true,
      });
      const page = await context.newPage();
      page.on('crash', () => { if (this.state) this.state.crashed = true; });
      page.on('close', () => { if (this.state) this.state.crashed = true; });

      const overrides = { ...defaultNavOverrides, ...this.options.navigatorOverrides };
      await page.addInitScript({ content: buildStealthScript(overrides) });

      let msToken = '', csrfToken = '';
      for (let attempt = 0; attempt < 3; attempt++) {
        await page.goto('https://www.tiktok.com/foryou', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
        if (attempt < 2) await page.waitForTimeout(3000);
        try {
          const cookies = await context.cookies();
          msToken = cookies.find((c: any) => c.name === 'msToken')?.value ?? '';
          csrfToken = cookies.find((c: any) => c.name === 'csrf_token')?.value ?? '';
        } catch {}
        if (msToken) break;
      }

      const deviceId = String(Math.floor(Math.random() * 9e18) + 1e18);
      const params: Record<string, string> = {
        aid: '1988', app_language: 'en', app_name: 'tiktok_web',
        browser_language: 'en', browser_name: 'Mozilla', browser_online: 'true',
        browser_platform: 'Win32',
        browser_version: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
        channel: 'tiktok_web', cookie_enabled: 'true', device_id: deviceId,
        device_platform: 'web_pc', focus_state: 'true', from_page: 'user',
        history_len: '1', is_fullscreen: 'false', is_page_visible: 'true',
        language: 'en', os: 'windows', priority_region: '', referer: '',
        region: 'US', screen_height: '1080', screen_width: '1920',
        tz_name: 'America/New_York', webcast_language: 'en',
      };

      this.state = { page, context, browser: this._browser, msToken, csrfToken, params, crashed: false };
    }

    return { page: this.state.page, context: this.state.context };
  }

  async init(videoUrl?: string): Promise<void> {
    let playwright: any;
    try {
      playwright = await import('playwright');
    } catch {
      throw new Error(
        'Playwright is required for PlaywrightSession. Install it with: npm install playwright',
      );
    }
    this._playwrightMod = playwright;

    let browser;
    try {
      browser = await playwright.chromium.launch({
        headless: this.options.headless,
        proxy: this.options.proxy
          ? { server: this.options.proxy }
          : undefined,
        args: [
          '--no-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
        ],
      });
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes('Executable') || msg.includes('browser') || msg.includes('chromium')) {
        throw new Error(
          `Chromium binary not found. We ship the playwright package but skip the 300MB browser download. ` +
          `To enable browser APIs, run: npx playwright install chromium\n` +
          `(Original error: ${msg})`,
          { cause: e },
        );
      }
      throw e;
    }

    this._browser = browser;

    // Create initial page state (ensures page + context exist)
    await this.ensurePage();
  }

  /**
   * Wait for window.byted_acrawler to show up.
   * TikTok can be slow here, so give it a few shots.
   */
  private async ensureAcrawler(page: any): Promise<void> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await page.waitForFunction(
          () => typeof (window as any).byted_acrawler?.frontierSign === 'function',
          { timeout: 10000, polling: 500 },
        );
        return;
      } catch {
        if (attempt < 2) {
          await page.goto('https://www.tiktok.com/foryou', { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
          await page.waitForTimeout(2000);
        }
      }
    }
    throw new Error('byted_acrawler not available after 3 attempts');
  }

  async sign(url: string): Promise<string> {
    const { page } = await this.ensurePage();

    // try the easy path first, since acrawler might already be ready
    let result: any;
    try {
      result = await page.evaluate((u: string) => {
        const w = window as any;
        return w.byted_acrawler?.frontierSign?.(u) ?? null;
      }, url);
    } catch {
      result = null;
    }

    // if that flops, wait for acrawler and try again
    if (!result) {
      await this.ensureAcrawler(page);
      result = await page.evaluate((u: string) => {
        return (window as any).byted_acrawler.frontierSign(u);
      }, url);
    }

    if (!result) throw new Error('Failed to generate X-Bogus signature');

    const xBogus = result['X-Bogus'];
    if (!xBogus) throw new Error('X-Bogus missing from sign response');

    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}X-Bogus=${xBogus}`;
  }

  async request<T>(
    path: string,
    extraParams: Record<string, string> = {},
  ): Promise<T> {
    const { page } = await this.ensurePage();
    if (!this.state) throw new Error('Session not initialized');
    const { msToken, params } = this.state;

    const allParams = { ...params, msToken, ...extraParams };
    const query = new URLSearchParams(allParams).toString();
    const baseUrl = `https://www.tiktok.com${path}`;
    const signedUrl = await this.sign(`${baseUrl}?${query}`);

    // fetch from inside the browser so it looks like normal page traffic
    const result = await page.evaluate(async (url: string) => {
      try {
        const res = await fetch(url, {
          credentials: 'include',
          headers: {
            Accept: 'application/json, text/plain, */*',
            Referer: 'https://www.tiktok.com/',
          },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (err: any) {
        return { __fetchError: err.message };
      }
    }, signedUrl);

    if (!result) throw new Error('Empty response from browser fetch');
    if (result.__fetchError) throw new Error(`Browser fetch failed: ${result.__fetchError}`);

    return result as T;
  }

  async render(url: string): Promise<string> {
    const { context } = await this.ensurePage();
    const tempPage = await context.newPage();
    try {
      await tempPage.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
      await tempPage.waitForTimeout(3000);
      const html = await tempPage.evaluate(() => {
        const el = document.getElementById('__UNIVERSAL_DATA_FOR_REHYDRATION__');
        return el?.textContent || document.documentElement.outerHTML;
      });
      return html;
    } finally {
      await tempPage.close().catch(() => {});
    }
  }

  async close(): Promise<void> {
    this.state = null;
    if (this._browser) {
      try { await this._browser.close(); } catch {}
      this._browser = null;
    }
  }

  get browser(): any {
    return this._browser;
  }
}
