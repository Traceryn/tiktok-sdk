import { ofetch } from 'ofetch';
import type { TikTokUser, AvatarInfo, Session } from '../types.js';
import { CookieJar, fetchTikTokCookies } from '../utils/CookieJar.js';
import { HEADERS } from '../utils/constants.js';
import { extractUserPageData } from './ParserEngine.js';
import { buildUserUrl } from './UrlExtractor.js';
import { TikTokFetchError, TikTokParseError } from '../utils/errors.js';
import { parseCookieString, formatISODate } from '../utils/helpers.js';

function buildAvatarInfo(url: string): AvatarInfo {
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

function buildUserFromDom(dom: Record<string, unknown>, url: string): TikTokUser {
  return {
    by: 'Traceryn',
    raw: dom.raw as Record<string, unknown> | undefined,
    id: String(dom.userId ?? ''),
    uniqueId: String(dom.uniqueId ?? ''),
    nickname: String(dom.nickname ?? ''),
    signature: String(dom.signature ?? ''),
    verified: Boolean(dom.verified),
    secUid: String(dom.secUid ?? ''),
    avatar: {
      thumb: buildAvatarInfo(String(dom.avatar ?? '')),
      medium: buildAvatarInfo(String(dom.avatar ?? '')),
      larger: buildAvatarInfo(String(dom.avatar ?? '')),
    },
    stats: {
      followerCount: Number(dom.followers ?? 0),
      followingCount: Number(dom.following ?? 0),
      heartCount: Number(dom.likes ?? 0),
      videoCount: 0,
      diggCount: 0,
      friendCount: 0,
    },
    createTime: '',
    createTimestamp: 0,
    language: '',
    region: '',
    privateAccount: false,
    secret: false,
    ftc: false,
    isOrganization: false,
    ttSeller: false,
    openFavorite: false,
    isADVirtual: false,
    commentSetting: 0,
    duetSetting: 0,
    stitchSetting: 0,
    downloadSetting: 0,
    followingVisibility: 0,
    profileEmbedPermission: 0,
    httpHeaders: { ...HEADERS.mobile, Referer: url },
    cookies: '',
  };
}

export async function scrapeUser(username: string, proxy: string, session?: Session): Promise<TikTokUser> {
  const name = username.replace('@', '');
  const url = buildUserUrl(name);

  if (session?.scrapeUserPage) {
    try {
      const dom = await session.scrapeUserPage(name);
      if (dom) return buildUserFromDom(dom, url);
    } catch {
      // fall through to static html
    }
  }

  const jar = new CookieJar();
  let html: string;
  try {
    html = await ofetch<string>(url, {
      headers: HEADERS.mobile,
      ...({ proxy } as any),
      parseResponse: (txt: string) => txt,
      onResponse({ response }) {
        if (response?.headers) {
          jar.setFromHeaders(response.headers as unknown as Headers);
        }
      },
    });
  } catch (err: unknown) {
    const ofetchErr = err as { status?: number };
    throw new TikTokFetchError(
      `Failed to fetch user page: ${(err as Error).message}`,
      ofetchErr.status,
    );
  }

  let pageData = extractUserPageData(html);
  if (!pageData) {
    const cookieStr = await fetchTikTokCookies();
    if (cookieStr) {
      try {
        html = await ofetch<string>(url, {
          headers: { ...HEADERS.desktop, Cookie: cookieStr },
          ...({ proxy } as any),
          parseResponse: (txt: string) => txt,
          onResponse({ response }) {
            if (response?.headers) jar.setFromHeaders(response.headers as unknown as Headers);
          },
        });
        pageData = extractUserPageData(html);
      } catch {}
    }
  }
  if (!pageData) {
    throw new TikTokParseError('Could not extract user data from profile page');
  }

  const u = pageData.user;
  const s = pageData.stats;
  const createTimestamp = Number(u.createTime ?? 0);

  const httpHeaders: Record<string, string> = {
    ...HEADERS.mobile,
    Referer: url,
  };

  const cu = u.commerceUserInfo as { commerceUser?: boolean; category?: string } | undefined;

  return {
    by: 'Traceryn',
    raw: pageData.userInfo as Record<string, unknown> | undefined,
    id: String(u.id ?? ''),
    uniqueId: String(u.uniqueId ?? ''),
    nickname: String(u.nickname ?? ''),
    signature: String(u.signature ?? ''),
    verified: Boolean(u.verified),
    secUid: String(u.secUid ?? ''),
    avatar: {
      thumb: buildAvatarInfo(String(u.avatarThumb ?? '')),
      medium: buildAvatarInfo(String(u.avatarMedium ?? '')),
      larger: buildAvatarInfo(String(u.avatarLarger ?? '')),
    },
    stats: {
      followerCount: Number(s.followerCount ?? 0),
      followingCount: Number(s.followingCount ?? 0),
      heartCount: Number(s.heartCount ?? 0),
      videoCount: Number(s.videoCount ?? 0),
      diggCount: Number(s.diggCount ?? 0),
      friendCount: Number(s.friendCount ?? 0),
    },
    createTime: formatISODate(createTimestamp),
    createTimestamp,
    language: String(u.language ?? ''),
    region: String(u.region ?? ''),
    bioLink: (u.bioLink as { link?: string } | undefined)?.link,
    privateAccount: Boolean(u.privateAccount),
    secret: Boolean(u.secret),
    ftc: Boolean(u.ftc),
    isOrganization: Boolean(u.isOrganization),
    ttSeller: Boolean(u.ttSeller),
    openFavorite: Boolean(u.openFavorite),
    isADVirtual: Boolean(u.isADVirtual),
    commentSetting: Number(u.commentSetting ?? 0),
    duetSetting: Number(u.duetSetting ?? 0),
    stitchSetting: Number(u.stitchSetting ?? 0),
    downloadSetting: Number(u.downloadSetting ?? 0),
    followingVisibility: Number(u.followingVisibility ?? 0),
    profileEmbedPermission: Number(u.profileEmbedPermission ?? 0),
    commerceUserInfo: cu?.commerceUser ? {
      commerceUser: true,
      category: cu.category,
    } : undefined,
    httpHeaders,
    cookies: parseCookieString(jar.all),
  };
}
