import { TikTokClient } from '../lib/client.js';

const client = new TikTokClient();

// Test what works through client with proxy pool
async function test(label, fn) {
  try {
    const result = await fn();
    console.log(`✓ ${label}: ${JSON.stringify(result).slice(0, 200)}`);
  } catch (e) {
    console.log(`✗ ${label}: ${e.message?.slice(0, 100)}`);
  }
}

// Only test endpoints that have a chance of working
await test('getHashtag(funny)', () => client.getHashtag('funny'));
await test('getUser(thebritishtheatreacademy)', () => client.getUser('thebritishtheatreacademy'));
await test('getVideo(video url)', () => client.getVideo('https://www.tiktok.com/@thebritishtheatreacademy/video/7638379318552382742'));
await test('getComments(video)', () => client.getComments('https://www.tiktok.com/@thebritishtheatreacademy/video/7638379318552382742', 0, 2));
await test('getUserVideos(thebritishtheatreacademy)', () => client.getUserVideos('thebritishtheatreacademy', 0));

process.exit(0);
