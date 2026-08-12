export class CookieJar {
  private cookies: Record<string, string> = {};

  setFromHeaders(headers: Headers): void {
    try {
      const setCookies = headers.getSetCookie?.() ?? [];
      for (const entry of setCookies) {
        const [pair] = entry.split(';');
        if (!pair) continue;
        const i = pair.indexOf('=');
        if (i > 0) {
          this.cookies[pair.slice(0, i).trim()] = pair.slice(i + 1);
        }
      }
    } catch {}
  }

  get all(): Record<string, string> {
    return { ...this.cookies };
  }

  toCookieString(): string {
    return Object.entries(this.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }
}

let sharedCookies: Record<string, string> | null = null;
let cookieExpiry = 0;
const COOKIE_TTL = 5 * 60_000;

export async function fetchTikTokCookies(): Promise<string> {
  if (sharedCookies && Date.now() < cookieExpiry) {
    return Object.entries(sharedCookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  try {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36';
    const url = 'https://www.tiktok.com/api/comment/list/?aid=1988&aweme_id=1&count=0&cursor=0';
    const res = await fetch(url, { headers: { 'User-Agent': ua, Accept: 'application/json' } });
    const jar = new CookieJar();
    if (res.headers) jar.setFromHeaders(res.headers as unknown as Headers);
    sharedCookies = jar.all;
    cookieExpiry = Date.now() + COOKIE_TTL;
    return jar.toCookieString();
  } catch {
    return '';
  }
}
