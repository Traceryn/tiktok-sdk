import { ofetch } from 'ofetch';
import { Proxymanager } from '../lib/core/Proxymanager.js';
import { ProxiflyProvider } from '../lib/ProxiflyProvider.js';

const pm = new Proxymanager();
const pp = new ProxiflyProvider(pm, { protocol: 'http', country: 'US' });
await pp.ready;

const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36';

let tried = 0;
while (tried < 5) {
  const entry = pm.getProxy();
  if (!entry) break;
  const proxy = entry.url;
  tried++;
  
  console.log(`\n--- ${proxy} ---`);
  
  // Test 1: Basic HTTP connectivity
  try {
    const resp = await ofetch('https://httpbin.org/ip', { proxy, timeout: 10000, parseResponse: t => t });
    console.log('  httpbin:', resp?.slice(0, 80));
  } catch (e) {
    console.log('  httpbin FAILED:', e.message.slice(0, 80));
    pm.reportFailure(proxy);
    continue;
  }
  
  // Test 2: TikTok homepage
  try {
    const resp = await ofetch('https://www.tiktok.com/', {
      proxy, timeout: 15000, parseResponse: t => t,
      headers: { 'User-Agent': ua, Accept: 'text/html,*/*' },
      retry: 0,
    });
    console.log('  TikTok homepage length:', resp.length);
  } catch (e) {
    console.log('  TikTok FAILED:', e.message.slice(0, 100));
    pm.reportFailure(proxy);
    continue;
  }
  
  pm.reportSuccess(proxy, 0);
}

process.exit(0);
