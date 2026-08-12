import { TikTokClient } from '../lib/client.js';
import { PlaywrightSession } from '../lib/playwright.js';

const client = new TikTokClient();

async function test(label, fn) {
  const start = Date.now();
  try {
    const result = await fn();
    const elapsed = Date.now() - start;
    const str = JSON.stringify(result).slice(0, 120);
    console.log(`  ✓ ${label} (${elapsed}ms): ${str}`);
  } catch (e) {
    console.log(`  ✗ ${label}: ${e.message?.slice(0, 100)}`);
  }
}

console.log('=== HTTP-only endpoints (no browser needed) ===\n');

await test('getUser(thebritishtheatreacademy)', () => client.getUser('thebritishtheatreacademy'));
await test('getVideo(url)', () => client.getVideo('https://www.tiktok.com/@thebritishtheatreacademy/video/7638379318552382742'));
await test('getComments(url)', () => client.getComments('https://www.tiktok.com/@thebritishtheatreacademy/video/7638379318552382742', 0, 3));
await test('getHashtag(funny)', () => client.getHashtag('funny'));
await test('getCommentReplies(cid)', () => client.getCommentReplies('7638415176790328072', '7638379318552382742', 0, 2));

console.log('\n=== Browser-gated endpoints (without session) ===\n');

await test('getTrendingVideos(3) [fallback]', () => client.getTrendingVideos(3));
await test('getHashtagVideos(funny) [fallback]', () => client.getHashtagVideos('funny', 0, 2));

console.log('\n=== With Playwright + Chromium ===\n');

let session;
try {
  session = new PlaywrightSession();
  await session.init('https://www.tiktok.com/');
  console.log(`  Session ready: ${session.isReady}`);
  console.log(`  Cookies: ttwid=${session.params?.ttwid?.slice(0,8) || 'N/A'}...`);
  console.log(`  msToken: ${session.msToken?.slice(0,8) || 'N/A'}...`);

  const client2 = new TikTokClient({ session });

  await test('getTrendingVideos(3) [browser]', () => client2.getTrendingVideos(3));
  await test('getHashtagVideos(funny, 0, 2) [browser]', () => client2.getHashtagVideos('funny', 0, 2));
  await test('getUser(funny) [browser]', () => client2.getHashtag('funny'));
} catch (e) {
  console.log(`  ✗ Session init failed: ${e.message?.slice(0, 100)}`);
} finally {
  if (session) await session.close();
}

process.exit(0);
