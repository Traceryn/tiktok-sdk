const { TikTokClient, PlaywrightSession } = require('@traceryn/tiktok-sdk');

async function main() {
  const args = process.argv.slice(2).filter(a => a !== '--session');
  const videoUrl = args[0] || 'https://www.tiktok.com/@tiktok/video/7412589630142580000';                                                       // change URL or pass as argument

  const useSession = process.argv.includes('--session');
  let session;
  if (useSession) { session = new PlaywrightSession({ headless: true }); await session.init(); }

  const client = new TikTokClient({ session, maxRetries: 2, timeout: 15000 });                               // proxies auto-fetched, WAF = proxy rotation
  const result = await client.getComments(videoUrl, 20, 0);

  console.log(`Total: ${result.total} | Returned: ${result.comments.length} | Has more: ${result.hasMore}`);

  if (result.comments.length > 0) {
    const top = result.comments[0];
    console.log(`Top comment by @${top.user?.uniqueId ?? 'unknown'}: "${top.text}" (${top.likes} likes, ${top.replyTotal} replies)`);
  }

  if (session) await session.close();
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
