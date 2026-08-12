import { TikTokClient } from '../lib/client.js';

const client = new TikTokClient();

console.log('=== getTrendingVideos ===');
try {
  const t = await client.getTrendingVideos(3);
  console.log(`  Videos: ${t.videos.length}, hasMore: ${t.hasMore}`);
  t.videos.forEach(v => console.log(`  ${v.id}: ${v.desc.slice(0, 60)} (${v.playCount} plays)`));
} catch (e) { console.log('  FAILED:', e.message?.slice(0, 100)); }

console.log('\n=== getHashtag ===');
try {
  const h = await client.getHashtag('funny');
  console.log(`  ${h.title}: ${h.stats.videoCount} videos, ${h.stats.viewCount} views`);
} catch (e) { console.log('  FAILED:', e.message?.slice(0, 100)); }

console.log('\n=== getHashtagVideos ===');
try {
  const hv = await client.getHashtagVideos('funny', 0, 3);
  console.log(`  Videos: ${hv.videos.length}, hasMore: ${hv.hasMore}`);
  hv.videos.forEach(v => console.log(`  ${v.id}: ${v.desc.slice(0, 60)}`));
} catch (e) { console.log('  FAILED:', e.message?.slice(0, 100)); }

console.log('\n=== getRelatedVideos ===');
try {
  const rv = await client.getRelatedVideos('https://www.tiktok.com/@thebritishtheatreacademy/video/7638379318552382742');
  console.log(`  Videos: ${rv.videos.length}`);
  rv.videos.forEach(v => console.log(`  ${v.id}: ${v.desc.slice(0, 60)}`));
} catch (e) { console.log('  FAILED:', e.message?.slice(0, 100)); }

console.log('\n=== getSound ===');
try {
  // Get sound from a known video first
  const info = await client.getSound('7016547803243022337');
  console.log(`  ${info.title} by ${info.author}, duration: ${info.duration}s`);
} catch (e) { console.log('  FAILED:', e.message?.slice(0, 100)); }

console.log('\n=== getSoundVideos ===');
try {
  const sv = await client.getSoundVideos('7016547803243022337', 0, 3);
  console.log(`  Videos: ${sv.videos.length}, hasMore: ${sv.hasMore}`);
  sv.videos.forEach(v => console.log(`  ${v.id}`));
} catch (e) { console.log('  FAILED:', e.message?.slice(0, 100)); }

console.log('\n=== getUserPlaylists ===');
try {
  const pl = await client.getUserPlaylists('thebritishtheatreacademy', 0, 5);
  console.log(`  Playlists: ${pl.playlists.length}`);
  pl.playlists.forEach(p => console.log(`  ${p.name} (${p.videoCount} videos)`));
} catch (e) { console.log('  FAILED:', e.message?.slice(0, 100)); }

console.log('\n=== searchVideos ===');
try {
  const sv = await client.searchVideos('tiktok', 0, 3);
  console.log(`  Videos: ${sv.videos.length}, hasMore: ${sv.hasMore}`);
  sv.videos.forEach(v => console.log(`  ${v.id}: ${v.desc.slice(0, 60)}`));
} catch (e) { console.log('  FAILED:', e.message?.slice(0, 100)); }

process.exit(0);
