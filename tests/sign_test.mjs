import { sign, signUrl } from '../lib/core/Signer.js';

const testQuery = 'keyword=tiktok&cursor=0&count=20&from_page=search';
const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36';

try {
  const bogus = sign(testQuery, ua);
  console.log('X-Bogus:', bogus);
  console.log('Length:', bogus.length);
  const url = signUrl(`https://www.tiktok.com/api/search/user/full/?${testQuery}`, ua);
  console.log('Signed URL (first 200):', url.slice(0, 200));
} catch (e) {
  console.error('Signer test failed:', e.message);
  console.error('Stack:', e.stack);
}
