import { UA_ROTATION } from './constants.js';

export function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${pad2(m)}:${pad2(s)}`;
  return `${m}:${pad2(s)}`;
}

export function formatISODate(epoch: number): string {
  if (!epoch) return '';
  return new Date(epoch * 1000).toISOString();
}

export function formatUploadDate(epoch: number): string {
  if (!epoch) return '';
  const d = new Date(epoch * 1000);
  return `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}`;
}

export function parseCookieString(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

export function parseUsername(urlOrName: string): string {
  const m = urlOrName.match(/@([\w.-]+)/);
  return m?.[1] ?? urlOrName.replace('@', '');
}

export function randomUserAgent(): string {
  return UA_ROTATION[Math.floor(Math.random() * UA_ROTATION.length)]!;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
