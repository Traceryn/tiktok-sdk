import { TikTokClient } from '../lib/client.js';

const VIDEO_URL = 'https://www.tiktok.com/@thebritishtheatreacademy/video/7638379318552382742';
const PROXY = process.env.PROXY || ''; // set PROXY=http://user:pass@ip:port for manual proxy

async function testGetVideo() {
  console.log('=== Test: getVideo() ===');
  const client = new TikTokClient(PROXY ? { proxy: PROXY } : {});
  const video = await client.getVideo(VIDEO_URL);

  console.log('id:', video.id);
  console.log('desc:', video.desc.slice(0, 60));
  console.log('duration:', video.duration);
  console.log('stats:', JSON.stringify(video.stats));
  console.log('urls.play:', video.urls.play.slice(0, 80) + '...');
  console.log('author:', video.author.uniqueId);
  console.log('hashtags:', video.hashtags.slice(0, 3));
  console.log('proxy stats:', JSON.stringify(client.getProxyStats()));
  console.log('✓ getVideo() passed\n');
}

async function main() {
  try {
    await testGetVideo();
    console.log('All tests passed!');
  } catch (err) {
    console.error('Test failed:', err.message);
    process.exit(1);
  }
}

main();
