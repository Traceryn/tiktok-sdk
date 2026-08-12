import { ofetch } from 'ofetch';
import type { TikTokUserSearchResults, SearchUserResult, AvatarInfo, Session } from '../types.js';
import { HEADERS } from '../utils/constants.js';
import { CookieJar } from '../utils/CookieJar.js';
import { signUrl } from '../core/Signer.js';
import { TikTokFetchError } from '../utils/errors.js';

const SEARCH_USER_URI = 'https://www.tiktok.com/api/search/user/full/';
const USER_PAGE = 'https://www.tiktok.com/@tiktok';

const WEB_SEARCH_CODE = JSON.stringify({
  tiktok: {
    client_params_x: {
      search_engine: {
        ies_mt_user_live_video_card_use_libra: 1,
        mt_search_general_user_live_card: 1,
      },
    },
    search_server: {},
  },
});

export function buildAvatarInfo(url: string): AvatarInfo {
  const m = url.match(/cropcenter:(\d+):(\d+)/);
  const w = m && m[1] ? parseInt(m[1], 10) : 0;
  const h = m && m[2] ? parseInt(m[2], 10) : 0;
  let a = w, b = h;
  while (b) { const t = b; b = a % b; a = t; }
  const gcd = a || 1;
  const maxDim = Math.max(w, h);
  const fmtM = url.match(/\.(\w+)(?:\?|$)/);
  let fmt = 'jpeg';
  if (fmtM && fmtM[1]) {
    const ext = fmtM[1].toLowerCase();
    fmt = ext === 'jpg' ? 'jpeg' : ext;
  }
  return {
    url,
    width: w,
    height: h,
    ratio: w && h ? `${w / gcd}:${h / gcd}` : '',
    quality: maxDim > 0 ? `${maxDim}p` : 'unknown',
    format: fmt,
    size: 0,
  };
}

export function parseSearchUser(data: Record<string, any>): SearchUserResult {
  const u = data.user_info ?? data;
  return {
    by: 'Traceryn',
    id: String(u.uid ?? u.id ?? ''),
    uniqueId: String(u.uniqueId ?? u.unique_id ?? ''),
    nickname: String(u.nickname ?? ''),
    signature: String(u.signature ?? ''),
    verified: Boolean(u.verified ?? false),
    secUid: String(u.secUid ?? ''),
    avatar: {
      thumb: buildAvatarInfo(String(u.avatarThumb ?? u.avatar_thumb?.url_list?.[0] ?? '')),
      medium: buildAvatarInfo(String(u.avatarMedium ?? u.avatar_medium?.url_list?.[0] ?? '')),
      larger: buildAvatarInfo(String(u.avatarLarger ?? u.avatar_larger?.url_list?.[0] ?? '')),
    },
    followerCount: Number(u.followerCount ?? u.follower_count ?? 0),
    followingCount: Number(u.followingCount ?? u.following_count ?? 0),
    heartCount: Number(u.heartCount ?? u.heart ?? 0),
    videoCount: Number(u.videoCount ?? u.video_count ?? 0),
    commerceUserInfo: u.commerceUserInfo
      ? { commerceUser: Boolean(u.commerceUserInfo.commerceUser), category: u.commerceUserInfo.category }
      : undefined,
    privateAccount: Boolean(u.privateAccount ?? u.private_account ?? false),
    raw: data,
  };
}

async function fetchCookies(proxy: string): Promise<string> {
  const jar = new CookieJar();
  await ofetch<string>(USER_PAGE, {
    headers: HEADERS.desktop,
    ...({ proxy } as any),
    parseResponse: (t: string) => t,
    onResponse(_ctx) {
      const resp = _ctx.response;
      if (resp?.headers) jar.setFromHeaders(resp.headers as unknown as Headers);
    },
  });
  const blocked = new Set(['tt_chain_token', 'msToken']);
  return Object.entries(jar.all)
    .filter(([k]) => !blocked.has(k))
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

export async function searchUsers(
  query: string,
  proxy: string,
  cursor = 0,
  count = 20,
  session?: Session,
): Promise<TikTokUserSearchResults> {
  if (session?.isReady) {
    try {
      const code = JSON.stringify({ tiktok: { client_params_x: { search_engine: { ies_mt_user_live_video_card_use_libra: 1, mt_search_general_user_live_card: 1 } }, search_server: {} } });
      const res = await session.request<Record<string, any>>('/api/search/user/full/', {
        keyword: query, cursor: String(cursor), count: String(count), from_page: 'search', web_search_code: code,
      });
      const rawUsers: Array<Record<string, any>> = res.user_list ?? [];
      const users = rawUsers.map(parseSearchUser);
      return { users, cursor: Number(res.cursor ?? cursor), hasMore: Boolean(res.has_more ?? false), raw: res };
    } catch {
      // if the session path fails, use plain HTTP instead
    }
  }

  const cookieStr = await fetchCookies(proxy);

  const params = new URLSearchParams({
    keyword: query,
    cursor: String(cursor),
    count: String(count),
    from_page: 'search',
    web_search_code: WEB_SEARCH_CODE,
  });

  const ua = HEADERS.desktop['User-Agent'];
  const baseUrl = `${SEARCH_USER_URI}?${params.toString()}`;
  const signedUrl = signUrl(baseUrl, ua);

  let res: unknown;
  try {
    res = await ofetch<unknown>(signedUrl, {
      headers: {
        ...HEADERS.api,
        Referer: `https://www.tiktok.com/search/user?q=${encodeURIComponent(query)}`,
        Cookie: cookieStr,
      },
      ...({ proxy } as any),
    });
  } catch (err: unknown) {
    const ofetchErr = err as { status?: number };
    throw new TikTokFetchError(
      `Search API failed: ${(err as Error).message}`,
      ofetchErr.status,
    );
  }

  if (!res || typeof res !== 'object') {
    throw new TikTokFetchError(
      'TikTok API returned empty response for searchUsers. ' +
      'Try using a PlaywrightSession — install with: npm install playwright',
      0,
    );
  }
  const resObj = res as Record<string, any>;

  if (resObj.status_code && resObj.status_code !== 0) {
    throw new TikTokFetchError(
      `Search API returned error: ${resObj.status_msg ?? resObj.status_code}`,
      resObj.status_code,
    );
  }

  const rawUsers: Array<Record<string, any>> = resObj.user_list ?? [];
  const users = rawUsers.map(parseSearchUser);

  return {
    users,
    cursor: Number(resObj.cursor ?? cursor),
    hasMore: Boolean(resObj.has_more ?? false),
    raw: resObj,
  };
}
