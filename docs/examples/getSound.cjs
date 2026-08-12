const { TikTokClient, PlaywrightSession } = require('@traceryn/tiktok-sdk');

async function main() {
  const args = process.argv.slice(2).filter(a => a !== '--session');
  const musicId = args[0] || '7412589630142580000';                                                       // change music ID or pass as argument

  const useSession = process.argv.includes('--session');
  let session;
  if (useSession) { session = new PlaywrightSession({ headless: true }); await session.init(); }

  const client = new TikTokClient({ session, maxRetries: 2, timeout: 15000 });
  const result = await client.getSound(musicId);

  console.log(`Sound: ${result.title}`);
  console.log(`Author: ${result.author}`);
  console.log(`Duration: ${result.duration}s`);
  console.log(`Original: ${result.original}`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
