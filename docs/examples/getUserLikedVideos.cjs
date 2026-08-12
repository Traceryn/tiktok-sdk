const { TikTokClient, PlaywrightSession } = require('@traceryn/tiktok-sdk');

async function main() {
  const args = process.argv.slice(2).filter(a => a !== '--session');
  const username = args[0] || 'tiktok';                                                       // change username or pass as argument

  const useSession = process.argv.includes('--session');
  let session;
  if (useSession) { session = new PlaywrightSession({ headless: true }); await session.init(); }

  const client = new TikTokClient({ session, maxRetries: 2, timeout: 15000 });
  const result = await client.getUserLikedVideos(username, 0, 10);

  console.log(`Found ${result.videos.length} liked videos for @${username}`);
  for (const v of result.videos.slice(0, 5)) {
    console.log(`  ${v.id} — ${v.desc?.substring(0, 60)}`);
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
