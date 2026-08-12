const { TikTokClient, PlaywrightSession } = require('@traceryn/tiktok-sdk');

async function main() {
  const args = process.argv.slice(2).filter(a => a !== '--session');
  const hashtag = args[0] || 'fyp';                                                       // change hashtag or pass as argument

  const useSession = process.argv.includes('--session');
  let session;
  if (useSession) { session = new PlaywrightSession({ headless: true }); await session.init(); }

  const client = new TikTokClient({ session, maxRetries: 2, timeout: 15000 });        // proxies auto-fetched, WAF = proxy rotation
  const result = await client.getHashtag(hashtag);

  console.log(`Hashtag: #${result.title}`);
  console.log(`Videos: ${result.stats.videoCount}`);
  console.log(`Views: ${result.stats.viewCount}`);

  if (session) await session.close();
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
