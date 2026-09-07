import type { TikTokComment, TikTokCommentList, CommentUser, CommentImage, CommentLabel } from '../types.js';
import { HEADERS } from '../utils/constants.js';
import { CookieJar } from '../utils/CookieJar.js';
import { TikTokFetchError } from '../utils/errors.js';
import { jsonFetch, textFetch } from '../utils/HttpClient.js';

const VIDEO_BASE = 'https://www.tiktok.com';
const COMMENT_API = 'https://www.tiktok.com/api/comment/list/';

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

export function parseCommentUser(raw: Record<string, unknown>): CommentUser {
  const avatarThumb = raw.avatar_thumb as { url_list?: string[] } | undefined;
  return {
    uid: getStr(raw, 'uid', ''),
    uniqueId: getStr(raw, 'unique_id', ''),
    nickname: getStr(raw, 'nickname', ''),
    secUid: getStr(raw, 'sec_uid', ''),
    avatarThumb: avatarThumb?.url_list?.[0] ?? getStr(raw, 'avatar_thumd', ''),
  };
}

function getUrlList(obj: unknown): string {
  if (!obj || typeof obj !== 'object') return '';
  const nested = obj as { url_list?: string[] };
  return String(nested.url_list?.[0] ?? '');
}

export function parseCommentImages(raw: unknown): CommentImage[] {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return (list as Array<Record<string, unknown>>).map((img) => {
    const originUrl = img.origin_url as { url_list?: string[]; width?: number; height?: number } | undefined;
    const cropUrl = img.crop_url as { url_list?: string[]; width?: number; height?: number } | undefined;
    return {
      url: getUrlList(originUrl) || getUrlList(cropUrl),
      width: getNum(originUrl, 'width', getNum(cropUrl, 'width', 0)),
      height: getNum(originUrl, 'height', getNum(cropUrl, 'height', 0)),
    };
  }).filter((img) => img.url);
}

export function parseLabels(raw: Array<Record<string, unknown>> | undefined): CommentLabel[] {
  if (!raw) return [];
  return raw.map((l) => ({
    text: getStr(l, 'text', ''),
    type: getNum(l, 'type', 0),
  }));
}

async function fetchVideoCookies(videoId: string, authorUsername: string, proxy?: string): Promise<string> {
  const jar = new CookieJar();
  try {
    await textFetch(`${VIDEO_BASE}/@${authorUsername}/video/${videoId}`, {
      headers: HEADERS.desktop,
      proxy,
      timeout: 15000,
      onResponse({ response }) {
        if (response?.headers) jar.setFromHeaders(response.headers);
      },
    });
  } catch {
    // cookies might already be in place from an earlier hit
  }
  return Object.entries(jar.all).map(([k, v]) => `${k}=${v}`).join('; ');
}

export async function fetchComments(
  videoId: string,
  authorUsername: string,
  cursor = 0,
  count = 20,
  proxy?: string,
): Promise<TikTokCommentList> {
  const cookieStr = await fetchVideoCookies(videoId, authorUsername, proxy);

  const params = new URLSearchParams({
    aid: '1988',
    aweme_id: videoId,
    count: String(count),
    cursor: String(cursor),
  });

  const url = `${COMMENT_API}?${params}`;

  let res: Record<string, unknown>;
  try {
    res = await jsonFetch<Record<string, unknown>>(url, {
      headers: {
        ...HEADERS.api,
        Referer: `${VIDEO_BASE}/@${authorUsername}/video/${videoId}`,
        Cookie: cookieStr,
      },
      proxy,
      timeout: 15000,
    });
  } catch (err) {
    const status = (err as { status?: number })?.status;
    throw new TikTokFetchError(
      `Comment API failed: ${(err as Error).message}`,
      status,
    );
  }

  if (res.status_code !== 0) {
    throw new TikTokFetchError(
      `Comment API returned error: ${res.status_msg ?? res.status_code}`,
      Number(res.status_code),
    );
  }

  const rawComments = (res.comments as Array<Record<string, unknown>>) ?? [];

  const comments: TikTokComment[] = rawComments.map((c) => ({
    by: 'Traceryn',
    cid: getStr(c, 'cid', ''),
    text: getStr(c, 'text', ''),
    createTime: new Date((Number(c.create_time ?? 0)) * 1000).toISOString(),
    timestamp: getNum(c, 'create_time', 0),
    likes: getNum(c, 'digg_count', 0),
    replyTotal: getNum(c, 'reply_comment_total', 0),
    status: getNum(c, 'status', 0),
    user: parseCommentUser((c.user as Record<string, unknown>) ?? {}),
    isAuthorDigged: getBool(c, 'is_author_digged'),
    labels: parseLabels(c.label_list as Array<Record<string, unknown>> | undefined),
    images: parseCommentImages(c.image_list),
    stickPosition: getNum(c, 'stick_position', 0),
    raw: c,
  }));

  return {
    comments,
    total: getNum(res, 'total', 0),
    cursor: getNum(res, 'cursor', cursor),
    hasMore: getBool(res, 'has_more'),
    hasFilteredComments: getBool(res, 'has_filtered_comments'),
    raw: res,
  };
}