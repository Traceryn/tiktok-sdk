import { ofetch } from 'ofetch';
import type {
  HashtagInfo, SoundInfo, SoundItemList, TikTokUserVideo,
  TrendingVideos, PlaylistInfo, PlaylistItemList,
  LikedVideos, Session,
} from '../types.js';
import { HEADERS } from '../utils/constants.js';
import { fetchTikTokCookies } from '../utils/CookieJar.js';
import { TikTokFetchError, TikTokWafError } from '../utils/errors.js';

const BASE = 'https://www.tiktok.com';

async function getCookies(_url: string, _proxy?: string): Promise<string> {
  return fetchTikTokCookies();
}

function parseVideo(data: Record<string, any>): TikTokUserVideo {
  return {
    id: String(data.id ?? ''),
    desc: String(data.desc ?? ''),
    createTime: String(data.createTime ?? ''),
    duration: Number(data.video?.duration ?? data.duration ?? 0),
    playCount: Number(data.stats?.playCount ?? data.playCount ?? 0),
    diggCount: Number(data.stats?.diggCount ?? data.diggCount ?? 0),
    commentCount: Number(data.stats?.commentCount ?? data.commentCount ?? 0),
    cover: String(data.video?.cover ?? data.cover ?? ''),
    raw: data,
  };
}

function guardResponse(res: unknown, endpoint: string): asserts res is Record<string, any> {
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
    res = await ofetch<unknown>(url, {
      headers: {
        ...HEADERS.api,
        Referer: referer,
        Cookie: cookieStr,
      },
      ...(proxy ? { proxy } as any : {}),
      timeout: 15000,
    });
  } catch (err: unknown) {
    const ofetchErr = err as { status?: number };
    throw new TikTokFetchError(
      `API request failed: ${(err as Error).message}`,
      ofetchErr.status,
    );
  }
  const ep = url.split('?')[0]?.split('/').filter(Boolean).pop() ?? 'api';
  guardResponse(res, ep);
  return res as T;
}

export async function fetchHashtag(name: string, proxy?: string): Promise<HashtagInfo> {
  const cookieStr = await getCookies(`${BASE}/tag/${name}`, proxy);
  const res = await apiGet<Record<string, any>>(
    `${BASE}/api/challenge/detail/?aid=1988&challengeName=${encodeURIComponent(name)}`,
    cookieStr, `${BASE}/tag/${name}`, proxy,
  );
  const ci = res.challengeInfo ?? {};
  const ch = ci.challenge ?? {};
  const st = ci.stats ?? {};
  const st2 = ci.statsV2 ?? {};
  return {
    by: 'Traceryn',
    id: String(ch.id ?? ''),
    title: String(ch.title ?? name),
    desc: String(ch.desc ?? ''),
    stats: {
      videoCount: Number(st2.videoCount ?? st.videoCount ?? 0),
      viewCount: Number(st2.viewCount ?? st.viewCount ?? 0),
    },
    raw: res,
  };
}

export async function fetchSound(musicId: string, proxy?: string, session?: Session): Promise<SoundInfo> {
  if (session?.isReady) {
    const res = await session.request<Record<string, any>>('/api/music/detail/', {
      aid: '1988', musicId,
    });
    const mi = res.musicInfo ?? {};
    const m = mi.music ?? {};
    const s = mi.stats ?? {};
    const a = mi.author ?? {};
    return {
      by: 'Traceryn',
      id: String(m.id ?? musicId),
      title: String(m.title ?? ''),
      author: String(a.uniqueId ?? a.nickname ?? ''),
      original: Boolean(m.original ?? false),
      duration: Number(m.duration ?? 0),
      playUrl: String(m.playUrl ?? ''),
      coverLarge: String(m.coverLarge ?? ''),
      coverMedium: String(m.coverMedium ?? ''),
      coverThumb: String(m.coverThumb ?? ''),
      stats: { videoCount: Number(s.videoCount ?? 0) },
      raw: res,
    };
  }
  const cookieStr = await getCookies(`${BASE}/music/${musicId}`, proxy);
  const res = await apiGet<Record<string, any>>(
    `${BASE}/api/music/detail/?aid=1988&musicId=${musicId}`,
    cookieStr, `${BASE}/music/${musicId}`, proxy,
  );
  const mi = res.musicInfo ?? {};
  const m = mi.music ?? {};
  const s = mi.stats ?? {};
  const a = mi.author ?? {};
  return {
    by: 'Traceryn',
    id: String(m.id ?? musicId),
    title: String(m.title ?? ''),
    author: String(a.uniqueId ?? a.nickname ?? ''),
    original: Boolean(m.original ?? false),
    duration: Number(m.duration ?? 0),
    playUrl: String(m.playUrl ?? ''),
    coverLarge: String(m.coverLarge ?? ''),
    coverMedium: String(m.coverMedium ?? ''),
    coverThumb: String(m.coverThumb ?? ''),
    stats: { videoCount: Number(s.videoCount ?? 0) },
    raw: res,
  };
}

export async function fetchSoundVideos(musicId: string, cursor = 0, count = 30, proxy?: string, session?: Session): Promise<SoundItemList> {
  if (session?.isReady) {
    const res = await session.request<Record<string, any>>('/api/music/item_list/', {
      aid: '1988', musicID: musicId, count: String(count), cursor: String(cursor),
    });
    const items: Array<Record<string, any>> = res.itemList ?? [];
    return { videos: items.map(parseVideo), cursor: Number(res.cursor ?? cursor), hasMore: Boolean(res.hasMore ?? false), raw: res };
  }
  const cookieStr = await getCookies(`${BASE}/music/${musicId}`, proxy);
  const res = await apiGet<Record<string, any>>(
    `${BASE}/api/music/item_list/?aid=1988&musicID=${musicId}&count=${count}&cursor=${cursor}`,
    cookieStr, `${BASE}/music/${musicId}`, proxy,
  );
  const items: Array<Record<string, any>> = res.itemList ?? [];
  return {
    videos: items.map(parseVideo),
    cursor: Number(res.cursor ?? cursor),
    hasMore: Boolean(res.hasMore ?? false),
    raw: res,
  };
}

export async function fetchTrending(count = 30, proxy?: string, session?: Session): Promise<TrendingVideos> {
  if (session?.isReady) {
    const res = await session.request<Record<string, any>>('/api/recommend/item_list/', {
      aid: '1988', from_page: 'fyp', count: String(count),
    });
    const items: Array<Record<string, any>> = res.itemList ?? [];
    return { videos: items.map(parseVideo), cursor: Number(res.cursor ?? 0), hasMore: Boolean(res.hasMore ?? false), raw: res };
  }
  const cookieStr = await getCookies(`${BASE}/foryou`, proxy);
  const res = await apiGet<Record<string, any>>(
    `${BASE}/api/recommend/item_list/?aid=1988&from_page=fyp&count=${count}`,
    cookieStr, `${BASE}/foryou`, proxy,
  );
  const items: Array<Record<string, any>> = res.itemList ?? [];
  return {
    videos: items.map(parseVideo),
    cursor: Number(res.cursor ?? 0),
    hasMore: Boolean(res.hasMore ?? false),
    raw: res,
  };
}

export async function fetchUserLikedVideos(secUid: string, cursor = 0, count = 30, proxy?: string, session?: Session): Promise<LikedVideos> {
  if (session?.isReady) {
    const res = await session.request<Record<string, any>>('/api/favorite/item_list/', {
      aid: '1988', secUid, count: String(count), cursor: String(cursor),
    });
    const items: Array<Record<string, any>> = res.itemList ?? [];
    return { videos: items.map(parseVideo), cursor: Number(res.cursor ?? cursor), hasMore: Boolean(res.hasMore ?? false), raw: res };
  }
  const cookieStr = await getCookies(`${BASE}/`, proxy);
  const res = await apiGet<Record<string, any>>(
    `${BASE}/api/favorite/item_list/?aid=1988&secUid=${secUid}&count=${count}&cursor=${cursor}`,
    cookieStr, `${BASE}/`, proxy,
  );
  const items: Array<Record<string, any>> = res.itemList ?? [];
  return {
    videos: items.map(parseVideo),
    cursor: Number(res.cursor ?? cursor),
    hasMore: Boolean(res.hasMore ?? false),
    raw: res,
  };
}

export async function fetchUserPlaylists(secUid: string, cursor = 0, count = 30, proxy?: string, session?: Session): Promise<{ playlists: PlaylistInfo[]; cursor: number; hasMore: boolean; raw?: Record<string, unknown> }> {
  if (session?.isReady) {
    const res = await session.request<Record<string, any>>('/api/user/playlist', {
      aid: '1988', secUid, count: String(count), cursor: String(cursor),
    });
    const items: Array<Record<string, any>> = res.playList ?? [];
    const plItems: Array<Record<string, any>> = res.playList ?? [];
    return {
      playlists: plItems.map((p: Record<string, any>) => ({
        by: 'Traceryn', id: String(p.id ?? p.mixId ?? ''), name: String(p.name ?? p.mixName ?? ''),
        videoCount: Number(p.videoCount ?? 0), coverUrl: String(p.cover ?? ''),
        authorName: String(p.creator?.uniqueId ?? p.creator?.nickname ?? ''),
        raw: p,
      })),
      cursor: Number(res.cursor ?? cursor), hasMore: Boolean(res.hasMore ?? false), raw: res,
    };
  }
  const cookieStr = await getCookies(`${BASE}/`, proxy);
  const res = await apiGet<Record<string, any>>(
    `${BASE}/api/user/playlist?aid=1988&secUid=${secUid}&count=${count}&cursor=${cursor}`,
    cookieStr, `${BASE}/`, proxy,
  );
  const plItems: Array<Record<string, any>> = res.playList ?? [];
  return {
    playlists: plItems.map((p: Record<string, any>) => ({
      by: 'Traceryn',
      id: String(p.id ?? p.mixId ?? ''),
      name: String(p.name ?? p.mixName ?? ''),
      videoCount: Number(p.videoCount ?? 0),
      coverUrl: String(p.cover ?? ''),
      authorName: String(p.creator?.uniqueId ?? p.creator?.nickname ?? ''),
      raw: p,
    })),
    cursor: Number(res.cursor ?? cursor),
    hasMore: Boolean(res.hasMore ?? false),
    raw: res,
  };
}

export async function fetchPlaylist(mixId: string, proxy?: string, session?: Session): Promise<PlaylistInfo> {
  if (session?.isReady) {
    const res = await session.request<Record<string, any>>('/api/mix/detail/', { aid: '1988', mixId });
    const mi = res.mixInfo ?? {};
    return {
      by: 'Traceryn', id: String(mi.id ?? mi.mixId ?? mixId), name: String(mi.name ?? mi.mixName ?? ''),
      videoCount: Number(mi.videoCount ?? 0), coverUrl: String(mi.cover ?? ''),
      authorName: String(mi.creator?.uniqueId ?? mi.creator?.nickname ?? ''),
      raw: res,
    };
  }
  const cookieStr = await getCookies(`${BASE}/`, proxy);
  const res = await apiGet<Record<string, any>>(
    `${BASE}/api/mix/detail/?aid=1988&mixId=${mixId}`,
    cookieStr, `${BASE}/`, proxy,
  );
  const mi = res.mixInfo ?? {};
  return {
    by: 'Traceryn',
    id: String(mi.id ?? mi.mixId ?? mixId),
    name: String(mi.name ?? mi.mixName ?? ''),
    videoCount: Number(mi.videoCount ?? 0),
    coverUrl: String(mi.cover ?? ''),
    authorName: String(mi.creator?.uniqueId ?? mi.creator?.nickname ?? ''),
    raw: res,
  };
}

export async function fetchPlaylistVideos(mixId: string, cursor = 0, count = 30, proxy?: string, session?: Session): Promise<PlaylistItemList> {
  if (session?.isReady) {
    const res = await session.request<Record<string, any>>('/api/mix/item_list/', {
      aid: '1988', mixId, count: String(count), cursor: String(cursor),
    });
    const items: Array<Record<string, any>> = res.itemList ?? [];
    return { videos: items.map(parseVideo), cursor: Number(res.cursor ?? cursor), hasMore: Boolean(res.hasMore ?? false), raw: res };
  }
  const cookieStr = await getCookies(`${BASE}/`, proxy);
  const res = await apiGet<Record<string, any>>(
    `${BASE}/api/mix/item_list/?aid=1988&mixId=${mixId}&count=${count}&cursor=${cursor}`,
    cookieStr, `${BASE}/`, proxy,
  );
  const items: Array<Record<string, any>> = res.itemList ?? [];
  return {
    videos: items.map(parseVideo),
    cursor: Number(res.cursor ?? cursor),
    hasMore: Boolean(res.has_more ?? false),
    raw: res,
  };
}

