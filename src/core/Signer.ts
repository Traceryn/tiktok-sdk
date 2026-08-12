import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const _filename = fileURLToPath(import.meta.url);
const _dirname = dirname(_filename);

let signFn: ((query: string, userAgent: string) => string) | null = null;

function loadSigner(): void {
  if (signFn) return;
  const xbogusPath = resolve(_dirname, '..', 'utils', 'xbogus.cjs');
  const require = createRequire(_filename);
  const mod = require(xbogusPath);
  signFn = mod.sign;
}

export function sign(query: string, userAgent: string): string {
  loadSigner();
  return signFn!(query, userAgent);
}

export function signUrl(url: string, userAgent: string): string {
  const qIndex = url.indexOf('?');
  const query = qIndex >= 0 ? url.slice(qIndex + 1) : '';
  const bogus = sign(query, userAgent);
  const sep = qIndex >= 0 ? '&' : '?';
  return `${url}${sep}X-Bogus=${bogus}`;
}
