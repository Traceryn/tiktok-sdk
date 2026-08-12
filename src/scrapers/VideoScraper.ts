import { ofetch } from 'ofetch';
import type { Session, ScrapeResult, VideoDetailResponse } from '../types.js';
import { CookieJar } from '../utils/CookieJar.js';
import { HEADERS } from '../utils/constants.js';
import { normalizePhotoUrl, extractVideoId } from './UrlExtractor.js';
import { ParserEngine } from './ParserEngine.js';
import { TikTokFetchError, TikTokWafError } from '../utils/errors.js';

let parserEngine: ParserEngine | null = null;
function getParser(): ParserEngine {
  if (!parserEngine) parserEngine = new ParserEngine();
  return parserEngine;
}

async function scrapeVideoHTML(url: string, proxy: string): Promise<ScrapeResult> {
  const jar = new CookieJar();
  const fetchUrl = normalizePhotoUrl(url);

  const html = await ofetch<string>(fetchUrl, {
    headers: { ...HEADERS.desktop, Referer: url },
    parseResponse: (txt: string) => txt,
    ...({ proxy } as any),
    onResponse(_ctx) {
      const resp = _ctx.response;
      if (resp?.headers) jar.setFromHeaders(resp.headers as unknown as Headers);
    },
  });

  // Detect WAF: empty or tiny HTML means blocked
  if (!html || html.length < 500) {
    throw new TikTokWafError(`Video HTML too short (${html?.length ?? 0} bytes)`, proxy);
  }

  const { itemStruct } = getParser().parse(html);
  return { html, itemStruct, cookies: jar.all };
}

export async function scrapeVideo(
  url: string,
  session: Session | undefined,
  proxy: string,
): Promise<ScrapeResult> {
  // Strategy 1: Session API path
  if (session?.isReady) {
    try {
      const videoId = extractVideoId(url);
      const res = await session.request<VideoDetailResponse>('/api/item/detail/', {
        item_id: videoId,
      });
      const itemStruct = res?.itemInfo?.itemStruct;
      if (itemStruct) return { html: '', itemStruct, cookies: {} };
    } catch {
      // fall through
    }
  }

  // 2) render the page if the session path misses
  if (session?.render) {
    try {
      const renderedHtml = await session.render(url);
      if (renderedHtml && renderedHtml.includes('itemStruct')) {
        const { itemStruct } = getParser().parse(renderedHtml);
        return { html: renderedHtml, itemStruct, cookies: {} };
      }
    } catch {
      // fall through to HTML scrape
    }
  }

  // 3) raw HTML scrape as the last shot
  return scrapeVideoHTML(url, proxy);
}
