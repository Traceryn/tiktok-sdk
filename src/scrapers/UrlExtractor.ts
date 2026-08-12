import { TIKTOK_DOMAINS } from '../utils/constants.js';

export function extractVideoId(urlOrId: string): string {
  const m = urlOrId.match(/\/(?:video|photo)\/(\d+)/);
  return m?.[1] ?? urlOrId;
}

export function normalizePhotoUrl(url: string): string {
  return url.replace('/photo/', '/video/');
}

export function buildVideoUrl(uniqueId: string, videoId: string): string {
  return `${TIKTOK_DOMAINS.www}/@${uniqueId}/video/${videoId}`;
}

export function buildUserUrl(username: string): string {
  const name = username.replace('@', '');
  return `${TIKTOK_DOMAINS.www}/@${name}`;
}

export function buildFeedUrl(secUid: string, cursor: number): string {
  const params = new URLSearchParams({
    secUid,
    count: '30',
    cursor: String(cursor),
  });
  return `${TIKTOK_DOMAINS.api}/post/item_list/?${params}`;
}

export function buildWebpageUrl(videoUrl: string): string {
  const id = extractVideoId(videoUrl);
  return `${TIKTOK_DOMAINS.www}/video/${id}`;
}

export function isValidTikTokUrl(url: string): boolean {
  return /https?:\/\/(?:www\.)?tiktok\.com\/(?:@[\w.-]+\/(?:video|photo)\/\d+|@[\w.-]+)/.test(url);
}

export function isPhotoUrl(url: string): boolean {
  return url.includes('/photo/');
}
