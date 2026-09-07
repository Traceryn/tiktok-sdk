import type { Session, ScrapeResult, VideoDetailResponse } from '../types.js';
import { HEADERS } from '../utils/constants.js';
import { normalizePhotoUrl, extractVideoId } from './UrlExtractor.js';
import { ParserEngine } from './ParserEngine.js';
import { TikTokWafError } from '../utils/errors.js';
import { textFetch } from '../utils/HttpClient.js';

let parserEngine: ParserEngine | null = null;
function getParser(): ParserEngine {
  if (!parserEngine) parserEngine = new ParserEngine();
  return parserEngine;
}

async function scrapeVideoHTML(url: string, proxy: string): Promise<ScrapeResult> {
  const fetchUrl = normalizePhotoUrl(url);

  const html = await textFetch(fetchUrl, {
    headers: { ...HEADERS.desktop, Referer: url },
    proxy,
  });

  if (!html || html.length < 500) {
    throw new TikTokWafError(`Video HTML too short (${html?.length ?? 0} bytes)`, proxy);
  }

  const { itemStruct } = getParser().parse(html);
  return { html, itemStruct, cookies: {} };
}

export async function scrapeVideo(
  url: string,
  session: Session | undefined,
  proxy: string,
): Promise<ScrapeResult> {
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

  return scrapeVideoHTML(url, proxy);
}