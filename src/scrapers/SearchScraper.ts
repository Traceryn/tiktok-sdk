import type { TikTokUserSearchResults, SearchUserResult, AvatarInfo, Session } from '../types.js';
import { HEADERS } from '../utils/constants.js';
import { CookieJar } from '../utils/CookieJar.js';
import { signUrl } from '../core/Signer.js';
import { TikTokFetchError } from '../utils/errors.js';
import { jsonFetch, textFetch } from '../utils/HttpClient.js';

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

export function parseSearchUser(data: Record<string, unknown>): SearchUserResult {
  const u = (data.user_info as Record<string, unknown> | undefined) ?? data;
  const getStr = (key: string, snakeKey: string) => String(u[key] ?? u[snakeKey] ?? '');
  const getNum = (key: string, snakeKey: string) => Number(u[key] ?? u[snakeKey] ?? 0);
  const getBool = (key: string, snakeKey: string) => Boolean(u[key] ?? u[snakeKey] ?? false);
  const nestedUrl = (key: string, snakeKey: string) => {
    const nested = u[snakeKey] as { url_list?: string[] } | undefined;
    return String(u[key] ?? nested?.url_list?.[0] ?? '');
  };

  const commerce = u.commerceUserInfo as { commerceUser?: boolean; category?: string } | undefined;

  return {
    by: 'Traceryn',
    id: getStr('uid', 'id'),
    uniqueId: getStr('uniqueId', 'unique_id'),
    nickname: getStr('nickname', 'nickname'),
    signature: getStr('signature', 'signature'),
    verified: getBool('verified', 'verified'),
    secUid: getStr('secUid', 'sec_uid'),
    avatar: {
      thumb: buildAvatarInfo(nestedUrl('avatarThumb', 'avatar_thumb')),
      medium: buildAvatarInfo(nestedUrl('avatarMedium', 'avatar_medium')),
      larger: buildAvatarInfo(nestedUrl('avatarLarger', 'avatar_larger')),
    },
    followerCount: getNum('followerCount', 'follower_count'),
    followingCount: getNum('followingCount', 'following_count'),
    heartCount: getNum('heartCount', 'heart'),
    videoCount: getNum('videoCount', 'video_count'),
    commerceUserInfo: commerce?.commerceUser
      ? { commerceUser: true, category: commerce.category }
      : undefined,
    privateAccount: getBool('privateAccount', 'private_account'),
    raw: data,
  };
}

async function fetchCookies(proxy: string): Promise<string> {
  const jar = new CookieJar();
  await textFetch(USER_PAGE, {
    headers: HEADERS.desktop,
    proxy,
    onResponse({ response }) {
      if (response?.headers) jar.setFromHeaders(response.headers);
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
      const res = await session.request<Record<string, unknown>>('/api/search/user/full/', {
        keyword: query, cursor: String(cursor), count: String(count), from_page: 'search', web_search_code: code,
      });
      const rawUsers = (res.user_list as Array<Record<string, unknown>>) ?? [];
      const users = rawUsers.map(parseSearchUser);
      return {
        users,
        cursor: Number(res.cursor ?? cursor),
        hasMore: Boolean(res.has_more ?? false),
        raw: res,
      };
    } catch {
      // fall through to plain HTTP
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
    res = await jsonFetch<unknown>(signedUrl, {
      headers: {
        ...HEADERS.api,
        Referer: `https://www.tiktok.com/search/user?q=${encodeURIComponent(query)}`,
        Cookie: cookieStr,
      },
      proxy,
    });
  } catch (err) {
    const status = (err as { status?: number })?.status;
    throw new TikTokFetchError(
      `Search API failed: ${(err as Error).message}`,
      status,
    );
  }

  if (!res || typeof res !== 'object') {
    throw new TikTokFetchError(
      'TikTok API returned empty response for searchUsers. ' +
      'Try using a PlaywrightSession — install with: npm install playwright',
      0,
    );
  }
  const resObj = res as Record<string, unknown>;

  if (resObj.status_code && resObj.status_code !== 0) {
    throw new TikTokFetchError(
      `Search API returned error: ${resObj.status_msg ?? resObj.status_code}`,
      Number(resObj.status_code),
    );
  }

  const rawUsers = (resObj.user_list as Array<Record<string, unknown>>) ?? [];
  const users = rawUsers.map(parseSearchUser);

  return {
    users,
    cursor: Number(resObj.cursor ?? cursor),
    hasMore: Boolean(resObj.has_more ?? false),
    raw: resObj,
  };
}