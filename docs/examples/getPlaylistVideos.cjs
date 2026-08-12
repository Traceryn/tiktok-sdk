const { TikTokClient, PlaywrightSession } = require('@traceryn/tiktok-sdk');

async function main() {
  const args = process.argv.slice(2).filter(a => a !== '--session');
  const mixId = args[0] || '7412589630142580000';                                                       // change playlist/mix ID or pass as argument

  const useSession = process.argv.includes('--session');
  let session;
  if (useSession) { session = new PlaywrightSession({ headless: true }); await session.init(); }

  const client = new TikTokClient({ session, maxRetries: 2, timeout: 15000 });
  const result = await client.getPlaylistVideos(mixId, 0, 10);

  console.log(`Found ${result.videos.length} videos in playlist`);
  for (const v of result.videos.slice(0, 5)) {
    console.log(`  ${v.id} — ${v.desc?.substring(0, 60)}`);
  }
  console.log(`Has more: ${result.hasMore}`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
