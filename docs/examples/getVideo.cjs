const { TikTokClient, PlaywrightSession } = require('@traceryn/tiktok-sdk');

async function main() {
  const args = process.argv.slice(2).filter(a => a !== '--session');
  const videoUrl = args[0] || 'https://www.tiktok.com/@tiktok/video/7412589630142580000';                                                       // change URL or pass as argument

  const useSession = process.argv.includes('--session');
  let session;
  if (useSession) { session = new PlaywrightSession({ headless: true }); await session.init(); }

  const client = new TikTokClient({ session, maxRetries: 2, timeout: 15000 });
  const result = await client.getVideo(videoUrl, false);

  console.log(`Title: ${result.title}`);
  console.log(`Author: @${result.author?.uniqueId ?? 'unknown'}`);
  console.log(`Duration: ${result.duration_string}`);
  console.log(`Plays: ${result.playCount}`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
