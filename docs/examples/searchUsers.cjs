 const { TikTokClient, PlaywrightSession } = require('@traceryn/tiktok-sdk');

async function main() {
  const args = process.argv.slice(2).filter(a => a !== '--session');
  const query = args[0] || 'tiktok';                                                       // change search query or pass as argument

  const useSession = process.argv.includes('--session');
  let session;
  if (useSession) { session = new PlaywrightSession({ headless: true }); await session.init(); }

  const client = new TikTokClient({ session, maxRetries: 2, timeout: 15000 });
  const result = await client.searchUsers(query);

  console.log(`Found ${result.users.length} users for "${query}":`);
  for (const u of result.users.slice(0, 5)) {
    console.log(`  @${u.uniqueId} — ${u.nickname} (${u.followerCount} followers)`);
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
