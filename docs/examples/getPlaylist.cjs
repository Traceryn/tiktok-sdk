const { TikTokClient, PlaywrightSession } = require('@traceryn/tiktok-sdk');

async function main() {
  const args = process.argv.slice(2).filter(a => a !== '--session');
  const mixId = args[0] || '7412589630142580000';                                                       // change playlist/mix ID or pass as argument

  const useSession = process.argv.includes('--session');
  let session;
  if (useSession) { session = new PlaywrightSession({ headless: true }); await session.init(); }

  const client = new TikTokClient({ session, maxRetries: 2, timeout: 15000 });
  const result = await client.getPlaylist(mixId);

  console.log(`Playlist: ${result.name}`);
  console.log(`Videos: ${result.videoCount}`);
  console.log(`Author: ${result.authorName}`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
