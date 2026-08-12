import { ofetch } from 'ofetch';
import type { TikTokComment, TikTokCommentList, CommentUser, CommentImage, CommentLabel } from '../types.js';
import { HEADERS } from '../utils/constants.js';
import { CookieJar } from '../utils/CookieJar.js';
import { TikTokFetchError } from '../utils/errors.js';

const VIDEO_BASE = 'https://www.tiktok.com';
const COMMENT_API = 'https://www.tiktok.com/api/comment/list/';

export function parseCommentUser(raw: Record<string, any>): CommentUser {
  return {
    uid: String(raw.uid ?? ''),
    uniqueId: String(raw.unique_id ?? ''),
    nickname: String(raw.nickname ?? ''),
    secUid: String(raw.sec_uid ?? ''),
    avatarThumb: String(raw.avatar_thumb?.url_list?.[0] ?? raw.avatar_thumd ?? ''),
  };
}

export function parseCommentImages(raw: Record<string, any> | undefined): CommentImage[] {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.map((img: Record<string, any>) => ({
    url: String(img.origin_url?.url_list?.[0] ?? img.crop_url?.url_list?.[0] ?? ''),
    width: Number(img.origin_url?.width ?? img.crop_url?.width ?? 0),
    height: Number(img.origin_url?.height ?? img.crop_url?.height ?? 0),
  })).filter((img) => img.url);
}

export function parseLabels(raw: Record<string, any>[] | undefined): CommentLabel[] {
  if (!raw) return [];
  return raw.map((l) => ({
    text: String(l.text ?? ''),
    type: Number(l.type ?? 0),
  }));
}

async function fetchVideoCookies(videoId: string, authorUsername: string, proxy?: string): Promise<string> {
  const jar = new CookieJar();
  try {
    await ofetch<string>(`${VIDEO_BASE}/@${authorUsername}/video/${videoId}`, {
      headers: HEADERS.desktop,
      ...(proxy ? { proxy } as any : {}),
      parseResponse: (t: string) => t,
      timeout: 15000,
      onResponse(ctx) {
        if (ctx.response?.headers) jar.setFromHeaders(ctx.response.headers as unknown as Headers);
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

  let res: Record<string, any>;
  try {
    res = await ofetch<Record<string, any>>(url, {
      headers: {
        ...HEADERS.api,
        Referer: `${VIDEO_BASE}/@${authorUsername}/video/${videoId}`,
        Cookie: cookieStr,
      },
      ...(proxy ? { proxy } as any : {}),
      timeout: 15000,
    });
  } catch (err: unknown) {
    const ofetchErr = err as { status?: number };
    throw new TikTokFetchError(
      `Comment API failed: ${(err as Error).message}`,
      ofetchErr.status,
    );
  }

  if (res.status_code !== 0) {
    throw new TikTokFetchError(
      `Comment API returned error: ${res.status_msg ?? res.status_code}`,
      res.status_code,
    );
  }

  const rawComments: Array<Record<string, any>> = res.comments ?? [];

  const comments: TikTokComment[] = rawComments.map((c) => ({
    by: 'Traceryn',
    cid: String(c.cid ?? ''),
    text: String(c.text ?? ''),
    createTime: new Date((c.create_time ?? 0) * 1000).toISOString(),
    timestamp: Number(c.create_time ?? 0),
    likes: Number(c.digg_count ?? 0),
    replyTotal: Number(c.reply_comment_total ?? 0),
    status: Number(c.status ?? 0),
    user: parseCommentUser(c.user ?? {}),
    isAuthorDigged: Boolean(c.is_author_digged ?? false),
    labels: parseLabels(c.label_list),
    images: parseCommentImages(c.image_list),
    stickPosition: Number(c.stick_position ?? 0),
    raw: c,
  }));

  return {
    comments,
    total: Number(res.total ?? 0),
    cursor: Number(res.cursor ?? cursor),
    hasMore: Boolean(res.has_more ?? false),
    hasFilteredComments: Boolean(res.has_filtered_comments ?? false),
    raw: res,
  };
}
