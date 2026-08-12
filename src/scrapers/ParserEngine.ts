import type { ItemStruct } from '../types.js';
import { TikTokParseError } from '../utils/errors.js';

export interface ParseResult {
  itemStruct: ItemStruct;
  strategy: string;
  raw?: string;
}

type ParserStrategy = (html: string) => ItemStruct | null;

function extractUniversalData(html: string): ItemStruct | null {
  const match = html.match(
    /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>(.*?)<\/script>/s,
  );
  if (!match?.[1]) return null;
  try {
    const data = JSON.parse(match[1]);
    const scope = data.__DEFAULT_SCOPE__ ?? data;

    // Try known paths first
    const knownPaths = [
      () => scope?.['webapp.video-detail']?.itemInfo?.itemStruct,
      () => scope?.webapp?.['video-detail']?.itemInfo?.itemStruct,
      () => scope?.['video-detail']?.itemInfo?.itemStruct,
    ];
    for (const getter of knownPaths) {
      const result = getter();
      if (result && result.id && result.video) return result as ItemStruct;
    }

    // Recursive search: find ANY object with id+video fields (TikTok's HTML varies by IP)
    function findItemStruct(obj: unknown, depth = 0): ItemStruct | null {
      if (depth > 8 || !obj || typeof obj !== 'object') return null;
      if (Array.isArray(obj)) {
        for (const item of obj) {
          const found = findItemStruct(item, depth + 1);
          if (found) return found;
        }
        return null;
      }
      const o = obj as Record<string, unknown>;
      if (o.id && o.video && typeof o.video === 'object') {
        return o as unknown as ItemStruct;
      }
      for (const val of Object.values(o)) {
        const found = findItemStruct(val, depth + 1);
        if (found) return found;
      }
      return null;
    }

    return findItemStruct(scope);
  } catch {
    return null;
  }
}

function extractSigiState(html: string): ItemStruct | null {
  const match = html.match(
    /<script id="SIGI_STATE"[^>]*>(.*?)<\/script>/s,
  );
  if (!match?.[1]) return null;
  try {
    const data = JSON.parse(match[1]);
    const modules = data.ItemModule;
    if (modules) {
      const keys = Object.keys(modules);
      if (keys.length) return modules[keys[0]!] as unknown as ItemStruct;
    }
    const users = data.UserModule?.users;
    if (users) {
      const keys = Object.keys(users);
      if (keys.length) return users[keys[0]!] as unknown as ItemStruct;
    }
    return null;
  } catch {
    return null;
  }
}

function extractLDJson(html: string): ItemStruct | null {
  const matches = html.matchAll(
    /<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs,
  );
  for (const m of matches) {
    try {
      const data = JSON.parse(m[1]!);
      if (data?.['@type'] === 'VideoObject' || data?.['@type']?.includes?.('VideoObject')) {
        const partial: Partial<ItemStruct> = {
          id: data.identifier ?? data.url?.match(/\/(\d+)/)?.[1] ?? '',
          desc: data.description ?? data.name ?? '',
          createTime: data.datePublished
            ? Math.floor(new Date(data.datePublished).getTime() / 1000)
            : 0,
          video: {
            id: data.identifier ?? '',
            height: data.height ?? 0,
            width: data.width ?? 0,
            duration: parseISO8601Duration(data.duration ?? ''),
            ratio: '',
            cover: data.thumbnailUrl?.[0] ?? '',
            originCover: data.thumbnailUrl?.[0] ?? '',
            dynamicCover: '',
            playAddr: data.contentUrl ?? '',
            downloadAddr: '',
            bitrate: 0,
            encodedType: '',
            format: 'mp4',
            videoQuality: '',
            codecType: '',
            definition: '',
            subtitleInfos: [],
            size: 0,
            PlayAddrStruct: { DataSize: '0', Width: 0, Height: 0, Uri: '', UrlList: [], UrlKey: '' },
            zoomCover: {},
          },
          author: {
            id: data.author?.identifier ?? '',
            uniqueId: data.author?.name?.toLowerCase?.() ?? '',
            nickname: data.author?.name ?? '',
            signature: '',
            verified: false,
            secUid: '',
            avatarLarger: '',
            avatarMedium: '',
            avatarThumb: '',
            followerCount: 0,
            followingCount: 0,
            heartCount: 0,
            videoCount: 0,
          },
          stats: { playCount: 0, diggCount: 0, commentCount: 0, shareCount: 0, collectCount: 0 },
        };
        return partial as ItemStruct;
      }
    } catch {}
  }
  return null;
}

function parseISO8601Duration(dur: string): number {
  const match = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const h = parseInt(match[1] ?? '0', 10);
  const m = parseInt(match[2] ?? '0', 10);
  const s = parseInt(match[3] ?? '0', 10);
  return h * 3600 + m * 60 + s;
}

function extractFromScripts(html: string): ItemStruct | null {
  const matches = html.matchAll(/<script[^>]*>(.*?)<\/script>/gs);
  for (const m of matches) {
    const text = m[1]?.trim();
    if (!text) continue;
    if (!text.includes('itemInfo') && !text.includes('ItemModule')) continue;
    try {
      const data = JSON.parse(text);
      const item =
        data?.itemInfo?.itemStruct ??
        (data?.ItemModule ? Object.values(data.ItemModule)[0] : null);
      if (item) return item as ItemStruct;
    } catch {}
  }
  return null;
}

export function extractUserPageData(
  html: string,
): { user: Record<string, unknown>; stats: Record<string, unknown>; userInfo: Record<string, unknown> } | null {
  const match = html.match(
    /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>(.*?)<\/script>/s,
  );
  if (!match?.[1]) return null;
  try {
    const data = JSON.parse(match[1]);
    const scope = data.__DEFAULT_SCOPE__;
    const userInfo = scope?.['webapp.user-detail']?.userInfo;
    if (!userInfo?.user) return null;
    return {
      user: userInfo.user as Record<string, unknown>,
      stats: userInfo.stats as Record<string, unknown>,
      userInfo: userInfo as Record<string, unknown>,
    };
  } catch {
    return null;
  }
}

export class ParserEngine {
  private strategies: ParserStrategy[];

  constructor() {
    this.strategies = [
      extractUniversalData,
      extractSigiState,
      extractFromScripts,
      extractLDJson,
    ];
  }

  parse(html: string): ParseResult {
    let attempts = 0;
    for (const strategy of this.strategies) {
      attempts++;
      const result = strategy(html);
      if (result && result.id && result.video) {
        return { itemStruct: result, strategy: strategy.name };
      }
    }
    throw new TikTokParseError(
      `Failed to parse TikTok page data after ${attempts} strategies`,
      attempts,
    );
  }
}
