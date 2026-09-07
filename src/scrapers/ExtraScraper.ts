import type {
  HashtagInfo, SoundInfo, SoundItemList, TikTokUserVideo,
  TrendingVideos, PlaylistInfo, PlaylistItemList,
  LikedVideos, Session,
} from '../types.js';
import { HEADERS } from '../utils/constants.js';
import { fetchTikTokCookies } from '../utils/CookieJar.js';
import { TikTokFetchError, TikTokWafError } from '../utils/errors.js';
import { jsonFetch } from '../utils/HttpClient.js';

const BASE = 'https://www.tiktok.com';

async function getCookies(_url: string, _proxy?: string): Promise<string> {
  return fetchTikTokCookies();
}

function parseVideo(data: Record<string, unknown>): TikTokUserVideo {
  const video = data.video as Record<string, unknown> | undefined;
  const stats = data.stats as Record<string, unknown> | undefined;
  const num = (a: unknown, b: unknown) => Number(a ?? b ?? 0);
  const str = (a: unknown, b: unknown) => String(a ?? b ?? '');
  return {
    id: str(data.id, ''),
    desc: str(data.desc, ''),
    createTime: str(data.createTime, ''),
    duration: num(video?.duration, data.duration),
    playCount: num(stats?.playCount, data.playCount),
    diggCount: num(stats?.diggCount, data.diggCount),
    commentCount: num(stats?.commentCount, data.commentCount),
    cover: str(video?.cover, data.cover),
    raw: data,
  };
}

function guardResponse(res: unknown, endpoint: string): asserts res is Record<string, unknown> {
  if (!res || typeof res !== 'object') {
    throw new TikTokWafError(
      `TikTok API returned empty response for ${endpoint}. ` +
      `Try using a PlaywrightSession — install with: npm install playwright`
    );
  }
}

async function apiGet<T>(
  url: string,
  cookieStr: string,
  referer: string,
  proxy?: string,
): Promise<T> {
  let res: unknown;
  try {
    res = await jsonFetch<unknown>(url, {
      headers: {
        ...HEADERS.api,
        Referer: referer,
        Cookie: cookieStr,
      },
      proxy,
      timeout: 15000,
    });
  } catch (err) {
    const status = (err as { status?: number })?.status;
    throw new TikTokFetchError(
      `API request failed: ${(err as Error).message}`,
      status,
    );
  }
  const ep = url.split('?')[0]?.split('/').filter(Boolean).pop() ?? 'api';
  guardResponse(res, ep);
  return res as T;
}

function getStr(obj: unknown, key: string, fallback = ''): string {
  if (!obj || typeof obj !== 'object') return fallback;
  return String((obj as Record<string, unknown>)[key] ?? fallback);
}

function getNum(obj: unknown, key: string, fallback = 0): number {
  if (!obj || typeof obj !== 'object') return fallback;
  return Number((obj as Record<string, unknown>)[key] ?? fallback);
}

function getBool(obj: unknown, key: string): boolean {
  if (!obj || typeof obj !== 'object') return false;
  return Boolean((obj as Record<string, unknown>)[key] ?? false);
}

export async function fetchHashtag(name: string, proxy?: string): Promise<HashtagInfo> {
  const cookieStr = await getCookies(`${BASE}/tag/${name}`, proxy);
  const res = await apiGet<Record<string, unknown>>(
    `${BASE}/api/challenge/detail/?aid=1988&challengeName=${encodeURIComponent(name)}`,
    cookieStr, `${BASE}/tag/${name}`, proxy,
  );
  const ci = (res.challengeInfo as Record<string, unknown> | undefined) ?? {};
  const ch = (ci.challenge as Record<string, unknown> | undefined) ?? {};
  const st = (ci.stats as Record<string, unknown> | undefined) ?? {};
  const st2 = (ci.statsV2 as Record<string, unknown> | undefined) ?? {};
  return {
    by: 'Traceryn',
    id: getStr(ch, 'id', ''),
    title: getStr(ch, 'title', name),
    desc: getStr(ch, 'desc', ''),
    stats: {
      videoCount: getNum(st2, 'videoCount', getNum(st, 'videoCount', 0)),
      viewCount: getNum(st2, 'viewCount', getNum(st, 'viewCount', 0)),
    },
    raw: res,
  };
}

export async function fetchSound(musicId: string, proxy?: string, session?: Session): Promise<SoundInfo> {
  if (session?.isReady) {
    const res = await session.request<Record<string, unknown>>('/api/music/detail/', {
      aid: '1988', musicId,
    });
    const mi = (res.musicInfo as Record<string, unknown> | undefined) ?? {};
    const m = (mi.music as Record<string, unknown> | undefined) ?? {};
    const s = (mi.stats as Record<string, unknown> | undefined) ?? {};
    const a = (mi.author as Record<string, unknown> | undefined) ?? {};
    return {
      by: 'Traceryn',
      id: getStr(m, 'id', musicId),
      title: getStr(m, 'title', ''),
      author: getStr(a, 'uniqueId', getStr(a, 'nickname', '')),
      original: getBool(m, 'original'),
      duration: getNum(m, 'duration', 0),
      playUrl: getStr(m, 'playUrl', ''),
      coverLarge: getStr(m, 'coverLarge', ''),
      coverMedium: getStr(m, 'coverMedium', ''),
      coverThumb: getStr(m, 'coverThumb', ''),
      stats: { videoCount: getNum(s, 'videoCount', 0) },
      raw: res,
    };
  }
  const cookieStr = await getCookies(`${BASE}/music/${musicId}`, proxy);
  const res = await apiGet<Record<string, unknown>>(
    `${BASE}/api/music/detail/?aid=1988&musicId=${musicId}`,
    cookieStr, `${BASE}/music/${musicId}`, proxy,
  );
  const mi = (res.musicInfo as Record<string, unknown> | undefined) ?? {};
  const m = (mi.music as Record<string, unknown> | undefined) ?? {};
  const s = (mi.stats as Record<string, unknown> | undefined) ?? {};
  const a = (mi.author as Record<string, unknown> | undefined) ?? {};
  return {
    by: 'Traceryn',
    id: getStr(m, 'id', musicId),
    title: getStr(m, 'title', ''),
    author: getStr(a, 'uniqueId', getStr(a, 'nickname', '')),
    original: getBool(m, 'original'),
    duration: getNum(m, 'duration', 0),
    playUrl: getStr(m, 'playUrl', ''),
    coverLarge: getStr(m, 'coverLarge', ''),
    coverMedium: getStr(m, 'coverMedium', ''),
    coverThumb: getStr(m, 'coverThumb', ''),
    stats: { videoCount: getNum(s, 'videoCount', 0) },
    raw: res,
  };
}

export async function fetchSoundVideos(musicId: string, cursor = 0, count = 30, proxy?: string, session?: Session): Promise<SoundItemList> {
  if (session?.isReady) {
    const res = await session.request<Record<string, unknown>>('/api/music/item_list/', {
      aid: '1988', musicID: musicId, count: String(count), cursor: String(cursor),
    });
    const items = (res.itemList as Array<Record<string, unknown>>) ?? [];
    return { videos: items.map(parseVideo), cursor: Number(res.cursor ?? cursor), hasMore: Boolean(res.hasMore ?? false), raw: res };
  }
  const cookieStr = await getCookies(`${BASE}/music/${musicId}`, proxy);
  const res = await apiGet<Record<string, unknown>>(
    `${BASE}/api/music/item_list/?aid=1988&musicID=${musicId}&count=${count}&cursor=${cursor}`,
    cookieStr, `${BASE}/music/${musicId}`, proxy,
  );
  const items = (res.itemList as Array<Record<string, unknown>>) ?? [];
  return {
    videos: items.map(parseVideo),
    cursor: Number(res.cursor ?? cursor),
    hasMore: Boolean(res.hasMore ?? false),
    raw: res,
  };
}

export async function fetchTrending(count = 30, proxy?: string, session?: Session): Promise<TrendingVideos> {
  if (session?.isReady) {
    const res = await session.request<Record<string, unknown>>('/api/recommend/item_list/', {
      aid: '1988', from_page: 'fyp', count: String(count),
    });
    const items = (res.itemList as Array<Record<string, unknown>>) ?? [];
    return { videos: items.map(parseVideo), cursor: Number(res.cursor ?? 0), hasMore: Boolean(res.hasMore ?? false), raw: res };
  }
  const cookieStr = await getCookies(`${BASE}/foryou`, proxy);
  const res = await apiGet<Record<string, unknown>>(
    `${BASE}/api/recommend/item_list/?aid=1988&from_page=fyp&count=${count}`,
    cookieStr, `${BASE}/foryou`, proxy,
  );
  const items = (res.itemList as Array<Record<string, unknown>>) ?? [];
  return {
    videos: items.map(parseVideo),
    cursor: Number(res.cursor ?? 0),
    hasMore: Boolean(res.hasMore ?? false),
    raw: res,
  };
}

export async function fetchUserLikedVideos(secUid: string, cursor = 0, count = 30, proxy?: string, session?: Session): Promise<LikedVideos> {
  if (session?.isReady) {
    const res = await session.request<Record<string, unknown>>('/api/favorite/item_list/', {
      aid: '1988', secUid, count: String(count), cursor: String(cursor),
    });
    const items = (res.itemList as Array<Record<string, unknown>>) ?? [];
    return { videos: items.map(parseVideo), cursor: Number(res.cursor ?? cursor), hasMore: Boolean(res.hasMore ?? false), raw: res };
  }
  const cookieStr = await getCookies(`${BASE}/`, proxy);
  const res = await apiGet<Record<string, unknown>>(
    `${BASE}/api/favorite/item_list/?aid=1988&secUid=${secUid}&count=${count}&cursor=${cursor}`,
    cookieStr, `${BASE}/`, proxy,
  );
  const items = (res.itemList as Array<Record<string, unknown>>) ?? [];
  return {
    videos: items.map(parseVideo),
    cursor: Number(res.cursor ?? cursor),
    hasMore: Boolean(res.hasMore ?? false),
    raw: res,
  };
}

export async function fetchUserPlaylists(secUid: string, cursor = 0, count = 30, proxy?: string, session?: Session): Promise<{ playlists: PlaylistInfo[]; cursor: number; hasMore: boolean; raw?: Record<string, unknown> }> {
  if (session?.isReady) {
    const res = await session.request<Record<string, unknown>>('/api/user/playlist', {
      aid: '1988', secUid, count: String(count), cursor: String(cursor),
    });
    const plItems = (res.playList as Array<Record<string, unknown>>) ?? [];
    return {
      playlists: plItems.map(parsePlaylist),
      cursor: Number(res.cursor ?? cursor), hasMore: Boolean(res.hasMore ?? false), raw: res,
    };
  }
  const cookieStr = await getCookies(`${BASE}/`, proxy);
  const res = await apiGet<Record<string, unknown>>(
    `${BASE}/api/user/playlist?aid=1988&secUid=${secUid}&count=${count}&cursor=${cursor}`,
    cookieStr, `${BASE}/`, proxy,
  );
  const plItems = (res.playList as Array<Record<string, unknown>>) ?? [];
  return {
    playlists: plItems.map(parsePlaylist),
    cursor: Number(res.cursor ?? cursor),
    hasMore: Boolean(res.hasMore ?? false),
    raw: res,
  };
}

function parsePlaylist(p: Record<string, unknown>): PlaylistInfo {
  const creator = p.creator as Record<string, unknown> | undefined;
  return {
    by: 'Traceryn',
    id: getStr(p, 'id', getStr(p, 'mixId', '')),
    name: getStr(p, 'name', getStr(p, 'mixName', '')),
    videoCount: getNum(p, 'videoCount', 0),
    coverUrl: getStr(p, 'cover', ''),
    authorName: getStr(creator, 'uniqueId', getStr(creator, 'nickname', '')),
    raw: p,
  };
}

export async function fetchPlaylist(mixId: string, proxy?: string, session?: Session): Promise<PlaylistInfo> {
  if (session?.isReady) {
    const res = await session.request<Record<string, unknown>>('/api/mix/detail/', { aid: '1988', mixId });
    const mi = (res.mixInfo as Record<string, unknown> | undefined) ?? {};
    return {
      by: 'Traceryn',
      id: getStr(mi, 'id', getStr(mi, 'mixId', mixId)),
      name: getStr(mi, 'name', getStr(mi, 'mixName', '')),
      videoCount: getNum(mi, 'videoCount', 0),
      coverUrl: getStr(mi, 'cover', ''),
      authorName: getStr((mi.creator as Record<string, unknown> | undefined), 'uniqueId', getStr((mi.creator as Record<string, unknown> | undefined), 'nickname', '')),
      raw: res,
    };
  }
  const cookieStr = await getCookies(`${BASE}/`, proxy);
  const res = await apiGet<Record<string, unknown>>(
    `${BASE}/api/mix/detail/?aid=1988&mixId=${mixId}`,
    cookieStr, `${BASE}/`, proxy,
  );
  const mi = (res.mixInfo as Record<string, unknown> | undefined) ?? {};
  return {
    by: 'Traceryn',
    id: getStr(mi, 'id', getStr(mi, 'mixId', mixId)),
    name: getStr(mi, 'name', getStr(mi, 'mixName', '')),
    videoCount: getNum(mi, 'videoCount', 0),
    coverUrl: getStr(mi, 'cover', ''),
    authorName: getStr((mi.creator as Record<string, unknown> | undefined), 'uniqueId', getStr((mi.creator as Record<string, unknown> | undefined), 'nickname', '')),
    raw: res,
  };
}

export async function fetchPlaylistVideos(mixId: string, cursor = 0, count = 30, proxy?: string, session?: Session): Promise<PlaylistItemList> {
  if (session?.isReady) {
    const res = await session.request<Record<string, unknown>>('/api/mix/item_list/', {
      aid: '1988', mixId, count: String(count), cursor: String(cursor),
    });
    const items = (res.itemList as Array<Record<string, unknown>>) ?? [];
    return { videos: items.map(parseVideo), cursor: Number(res.cursor ?? cursor), hasMore: Boolean(res.hasMore ?? false), raw: res };
  }
  const cookieStr = await getCookies(`${BASE}/`, proxy);
  const res = await apiGet<Record<string, unknown>>(
    `${BASE}/api/mix/item_list/?aid=1988&mixId=${mixId}&count=${count}&cursor=${cursor}`,
    cookieStr, `${BASE}/`, proxy,
  );
  const items = (res.itemList as Array<Record<string, unknown>>) ?? [];
  return {
    videos: items.map(parseVideo),
    cursor: Number(res.cursor ?? cursor),
    hasMore: Boolean(res.has_more ?? false),
    raw: res,
  };
}