const { TikTokClient, PlaywrightSession } = require('@traceryn/tiktok-sdk');

async function main() {
  const flags = process.argv.slice(2);
  const proxyFlag = flags.find(f => f.startsWith('--proxy='));
  const proxy = proxyFlag ? proxyFlag.split('=')[1] : undefined;                                 // --proxy=http://user:pass@host:port to switch IP
  const args = flags.filter(a => !a.startsWith('--'));
  const query = args[0] || 'tiktok';                                                             // change search query or pass as argument

  const useSession = process.argv.includes('--session');
  let session;
  if (useSession) { session = new PlaywrightSession({ headless: true, proxy }); await session.init(); }  // proxy routes browser through another IP

  const client = new TikTokClient({ session, maxRetries: 2, timeout: 15000 });
  const result = await client.searchUsers(query);

  console.log(`Found ${result.users.length} users for "${query}":`);
  for (const u of result.users.slice(0, 5)) {
    console.log(`  @${u.uniqueId} — ${u.nickname} (${u.followerCount} followers)`);
  }

  if (session) await session.close();
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});