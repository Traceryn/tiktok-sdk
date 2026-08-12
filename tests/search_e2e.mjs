import { ofetch } from 'ofetch';
import { Proxymanager } from '../lib/core/Proxymanager.js';
import { ProxiflyProvider } from '../lib/ProxiflyProvider.js';
import { CookieJar } from '../lib/utils/CookieJar.js';
import { signUrl } from '../lib/core/Signer.js';

const pm = new Proxymanager();
const pp = new ProxiflyProvider(pm, { protocol: 'http', country: 'US' });
await pp.ready;

let proxy = null;
for (let i = 0; i < 5; i++) {
  const e = pm.getProxy();
  if (e) { proxy = e.url; break; }
}
if (!proxy) { console.error('No proxy'); process.exit(1); }
console.log('Proxy:', proxy);

// Step 1: Visit user page to get cookies
const jar = new CookieJar();
await ofetch('https://www.tiktok.com/@tiktok', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  proxy,
  parseResponse: (t) => t,
  onResponse(ctx) { if (ctx.response?.headers) jar.setFromHeaders(ctx.response.headers); },
});

// Filter out problematic cookies
const blocked = new Set(['tt_chain_token', 'msToken']);
const cookieStr = Object.entries(jar.all)
  .filter(([k]) => !blocked.has(k))
  .map(([k, v]) => `${k}=${v}`)
  .join('; ');
console.log('Cookies:', cookieStr.slice(0, 200));

// Step 2: Build and sign search URL
const WEB_SEARCH_CODE = JSON.stringify({
  tiktok: {
    client_params_x: { search_engine: { ies_mt_user_live_video_card_use_libra: 1, mt_search_general_user_live_card: 1 } },
    search_server: {},
  },
});

const searchQuery = 'tiktok';
const params = new URLSearchParams({
  keyword: searchQuery,
  cursor: '0',
  count: '20',
  from_page: 'search',
  web_search_code: WEB_SEARCH_CODE,
});

const baseUrl = `https://www.tiktok.com/api/search/user/full/?${params}`;
const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36';
const signedUrl = signUrl(baseUrl, ua);
console.log('Signed:', signedUrl.slice(0, 250));

// Step 3: Make the API call
try {
  const data = await ofetch(signedUrl, {
    headers: {
      'User-Agent': ua,
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      Referer: `https://www.tiktok.com/search/user?q=${encodeURIComponent(searchQuery)}`,
      Cookie: cookieStr,
    },
    proxy,
    timeout: 30000,
  });
  
  console.log('\nResponse keys:', Object.keys(data));
  console.log('status_code:', data.status_code, 'status_msg:', data.status_msg);
  console.log('has_more:', data.has_more, 'cursor:', data.cursor);
  
  if (data.user_list) {
    console.log('user_list count:', data.user_list.length);
    for (const raw of data.user_list.slice(0, 5)) {
      const u = raw.user_info ?? raw;
      console.log(`  @${u.uniqueId} (${u.nickname}) — ${u.followerCount} followers`);
    }
  }
} catch (e) {
  console.error('API call failed:', e.message);
  if (e.status) console.error('Status:', e.status);
  if (e.data) console.error('Data:', JSON.stringify(e.data).slice(0, 500));
}

process.exit(0);
