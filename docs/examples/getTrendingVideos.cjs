const { TikTokClient, PlaywrightSession } = require('@traceryn/tiktok-sdk');

async function main() {
  const args = process.argv.slice(2).filter(a => a !== '--session');
  const count = parseInt(args[0], 10) || 10;                                                        // change count or pass as argument

  const useSession = process.argv.includes('--session');
  let session;
  if (useSession) { session = new PlaywrightSession({ headless: true }); await session.init(); }

  const client = new TikTokClient({ session, maxRetries: 2, timeout: 15000 });
  const result = await client.getTrendingVideos(count);

  console.log(`Found ${result.videos.length} trending videos`);
  for (const v of result.videos.slice(0, 5)) {
    console.log(`  ${v.id} — ${v.desc?.substring(0, 60)}`);
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
