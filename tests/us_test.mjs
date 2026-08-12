import { TikTokClient } from '../lib/client.js';

const PROXY = process.env.PROXY || '';
const client = new TikTokClient(PROXY ? { proxy: PROXY } : {});

const tests = [
  ['Video', 'https://www.tiktok.com/@thebritishtheatreacademy/video/7638379318552382742'],
  ['Photo', 'https://www.tiktok.com/@thoughtswithred/photo/7641996023971253517'],
];

for (const [type, url] of tests) {
  console.log(`\n=== ${type}: ${url} ===`);
  try {
    const v = await client.getVideo(url);
    console.log('stats:', JSON.stringify(v.stats));
    if (v.urls.play) {
      const pu = new URL(v.urls.play);
      console.log('play host:', pu.host);
    }
    if (v.urls.music) {
      const mu = new URL(v.urls.music);
      console.log('music host:', mu.host);
    }
    if (v.images?.length) {
      console.log('images:', v.images.length);
      v.images.forEach((img, i) => console.log(`  [${i}] ${img.slice(0, 80)}`));
    }
    if (v.images && !v.images.length) console.log('images: (photo without images)');
    console.log('duration:', v.duration, 'hashtags:', v.hashtags.slice(0, 3));
    console.log('✓');
  } catch (e) {
    console.log('✗', e.message);
  }
}

// Optional: test download
console.log('\n=== Download test (video) ===');
try {
  const buf = await client.downloadVideo(tests[0][1]);
  console.log(`Downloaded ${buf.byteLength} bytes ✓`);
} catch (e) {
  console.log('✗', e.message);
}
