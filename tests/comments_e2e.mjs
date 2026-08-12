import { TikTokClient } from '../lib/client.js';

const client = new TikTokClient();

try {
  const result = await client.getComments('https://www.tiktok.com/@thebritishtheatreacademy/video/7638379318552382742', 0, 5);
  
  console.log('Total comments:', result.total);
  console.log('Returned:', result.comments.length);
  console.log('Has more:', result.hasMore);
  console.log('Has filtered:', result.hasFilteredComments);
  console.log('');
  
  for (const c of result.comments.slice(0, 3)) {
    console.log(`@${c.user.uniqueId} (${c.user.nickname}): "${c.text.slice(0, 100)}"`);
    console.log(`  Likes: ${c.likes} | Replies: ${c.replyTotal} | Author digged: ${c.isAuthorDigged}`);
    if (c.labels.length > 0) console.log(`  Labels: ${c.labels.map(l => l.text).join(', ')}`);
    if (c.images.length > 0) console.log(`  Images: ${c.images.length}`);
    console.log('');
  }
} catch (e) {
  console.error('Failed:', e.message);
  if (e.status) console.error('Status:', e.status);
}

process.exit(0);
