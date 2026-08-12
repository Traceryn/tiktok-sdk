import { ofetch } from 'ofetch';
import { CookieJar } from '../lib/utils/CookieJar.js';

const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const jar = new CookieJar();
const videoId = '7638379318552382742';

await ofetch('https://www.tiktok.com/@tiktok', {
  headers: { 'User-Agent': ua, 'Accept': 'text/html,*/*' },
  parseResponse: t => t, timeout: 15000,
  onResponse(ctx) { if (ctx.response?.headers) jar.setFromHeaders(ctx.response.headers); },
});

const cookieStr = Object.entries(jar.all).map(([k, v]) => `${k}=${v}`).join('; ');

const raw = await ofetch(`https://www.tiktok.com/api/comment/list/?aid=1988&aweme_id=${videoId}&count=2&cursor=0`, {
  headers: {
    'User-Agent': ua,
    'Accept': 'application/json, text/plain, */*',
    'Referer': `https://www.tiktok.com/@thebritishtheatreacademy/video/${videoId}`,
    'Cookie': cookieStr,
  },
  timeout: 15000,
  parseResponse: t => t,
  retry: 0,
});

const data = JSON.parse(raw);

// Show first comment structure
if (data.comments?.[0]) {
  console.log('=== Full first comment structure ===');
  console.log(JSON.stringify(data.comments[0], null, 2));
}

console.log('\n=== Top-level response keys ===');
console.log(Object.keys(data));

console.log('\n=== Extra keys ===');
console.log(JSON.stringify(data.extra, null, 2));

console.log('\n=== Has more ===', data.has_more);
console.log('=== Cursor ===', data.cursor);
console.log('=== Total ===', data.total);

process.exit(0);
