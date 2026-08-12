import { TikTokClient } from '../lib/client.js';

const client = new TikTokClient();

const result = await client.searchUsers('tiktok', 0, 5);
console.log('Users found:', result.users.length);
console.log('Has more:', result.hasMore);
for (const u of result.users) {
  console.log(`  @${u.uniqueId} (${u.nickname}) — ${u.followerCount} followers, verified: ${u.verified}`);
}
