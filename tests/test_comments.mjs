import { ofetch } from 'ofetch';
import { CookieJar } from '../lib/utils/CookieJar.js';
import { HEADERS } from '../lib/utils/constants.js';

const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const jar = new CookieJar();

// Get cookies from a video page
const videoUrl = 'https://www.tiktok.com/@thebritishtheatreacademy/video/7638379318552382742';
await ofetch(videoUrl, {
  headers: HEADERS.desktop,
  parseResponse: t => t, timeout: 15000,
  onResponse(ctx) { if (ctx.response?.headers) jar.setFromHeaders(ctx.response.headers); },
});
const cookieStr = Object.entries(jar.all).map(([k, v]) => `${k}=${v}`).join('; ');
console.log('Cookies:', Object.keys(jar.all));

// Test 1: Comment API
console.log('\n=== Test: Comment API ===');
try {
  const raw = await ofetch('https://www.tiktok.com/api/comment/list/?aid=1988&aweme_id=7638379318552382742&count=20&cursor=0', {
    headers: {
      'User-Agent': ua,
      'Accept': 'application/json, text/plain, */*',
      'Referer': videoUrl,
      'Cookie': cookieStr,
    },
    timeout: 15000,
    parseResponse: t => t,
    retry: 0,
  });
  console.log('Length:', raw.length);
  if (raw.length > 0) {
    const parsed = JSON.parse(raw);
    console.log('Keys:', Object.keys(parsed));
    if (parsed.comments) console.log('Comments:', parsed.comments.length);
    if (parsed.status_code !== undefined) console.log('Status:', parsed.status_code, parsed.status_msg);
    if (parsed.comments?.length > 0) {
      console.log('First comment:', JSON.stringify({
        text: parsed.comments[0].text?.slice(0, 100),
        user: parsed.comments[0].user?.unique_id,
        likes: parsed.comments[0].digg_count,
      }));
    }
  }
} catch (e) {
  console.log('API error:', e.message);
}

// Test 2: Check if video page SSR has comments in __UNIVERSAL_DATA_FOR_REHYDRATION__
console.log('\n=== Test: Video page HTML for comments ===');
try {
  const html = await ofetch(videoUrl, {
    headers: HEADERS.desktop,
    parseResponse: t => t, timeout: 15000,
    retry: 0,
  });
  
  const hasComments = html.includes('comment') || html.includes('reply');
  const hasCommentList = html.includes('comment_list') || html.includes('comments');
  console.log('Has comment mentions in HTML:', hasComments);
  console.log('Has comment data:', hasCommentList);
  
  // Check __UNIVERSAL_DATA_FOR_REHYDRATION__ for comment data
  const reData = html.match(/__UNIVERSAL_DATA_FOR_REHYDRATION__[^>]*>([\s\S]*?)<\/script>/);
  if (reData) {
    const data = JSON.parse(reData[1]);
    const scope = data.__DEFAULT_SCOPE__;
    for (const [key, val] of Object.entries(scope)) {
      const str = JSON.stringify(val).toLowerCase();
      if (str.includes('comment') || str.includes('reply')) {
        console.log(`  Found comment data in key: ${key}`);
      }
    }
  }
  
  // Also check SIGI_STATE
  if (html.includes('SIGI_STATE')) {
    const sigiMatch = html.match(/SIGI_STATE\s*=\s*({[\s\S]*?});/);
    if (sigiMatch) {
      try {
        const sigi = JSON.parse(sigiMatch[1]);
        if (sigi.CommentModule || sigi.comment) {
          console.log('SIGI_STATE has comment data!');
        }
      } catch {}
    }
  }
  
} catch (e) {
  console.log('HTML error:', e.message);
}

process.exit(0);
