import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { TikTokClient } from '../src/client.js';
import { PlaywrightSession } from '../src/playwright.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, 'responses');
mkdirSync(OUT, { recursive: true });

const VIDEO_URL = 'https://www.tiktok.com/@thebritishtheatreacademy/video/7638379318552382742';
const USERNAME = 'thebritishtheatreacademy';
const VIDEO_ID = '7638379318552382742';

async function save(label: string, fn: () => Promise<any>) {
  try {
    const data = await fn();
    writeFileSync(join(OUT, `${label}.json`), JSON.stringify(data, null, 2));
    return { ok: true, size: JSON.stringify(data).length };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const useSession = args.includes('--session');
  const proxyFlag = args.find((a) => a.startsWith('--proxy='));
  const proxy = proxyFlag?.split('=')[1];
  let session: PlaywrightSession | undefined;

  if (useSession) {
    console.log('Launching Playwright browser (headless)...');
    session = new PlaywrightSession({ headless: true, proxy });
    await session.init();
    console.log('Browser ready.');
  }

  const client = new TikTokClient(
    { ...(session ? { session } : {}), maxRetries: 1, timeout: 15000, ...(proxy ? { proxy: [proxy] } : {}) },
  );

  const results: Record<string, any> = {};

  results.getVideo = await save('getVideo', () => client.getVideo(VIDEO_URL, false));
  results.getUser = await save('getUser', () => client.getUser(USERNAME, false));
  results.getComments = await save('getComments', () => client.getComments(VIDEO_URL));
  results.searchUsers = await save('searchUsers', () => client.searchUsers('tiktok'));
  results.getHashtag = await save('getHashtag', () => client.getHashtag('fyp'));
  results.getTrendingVideos = await save('getTrendingVideos', () => client.getTrendingVideos(5));

  results.getSound = await save('getSound', () => client.getSound(VIDEO_ID));
  results.getSoundVideos = await save('getSoundVideos', () => client.getSoundVideos(VIDEO_ID));
  results.getUserLikedVideos = await save('getUserLikedVideos', () => client.getUserLikedVideos(USERNAME));
  results.getUserPlaylists = await save('getUserPlaylists', () => client.getUserPlaylists(USERNAME));

  try {
    const playlists = await client.getUserPlaylists('tiktok');
    if (playlists.playlists.length > 0) {
      const mixId = playlists.playlists[0].id;
      results.getPlaylist = await save('getPlaylist', () => client.getPlaylist(mixId));
      results.getPlaylistVideos = await save('getPlaylistVideos', () => client.getPlaylistVideos(mixId));
    }
  } catch (e: any) {
    results.getPlaylist = { ok: false, error: e.message };
    results.getPlaylistVideos = { ok: false, error: e.message };
  }

  if (session) await session.close();

  writeFileSync(join(OUT, 'INDEX.json'), JSON.stringify(results, null, 2));
  console.log('\n=== Response Generation Results ===');
  for (const [k, v] of Object.entries(results)) {
    if (v.ok) {
      console.log(`  ok  ${k} — ${(v.size / 1024).toFixed(1)} KB`);
    } else {
      console.log(`  fail ${k}: ${v.error}`);
    }
  }
}

main().catch(console.error);
