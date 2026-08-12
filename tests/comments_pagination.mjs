import { TikTokClient } from '../lib/client.js';

const client = new TikTokClient();
const url = 'https://www.tiktok.com/@thebritishtheatreacademy/video/7638379318552382742';

// Get first page
const page1 = await client.getComments(url, 0, 3);
console.log('Page 1:');
page1.comments.forEach(c => console.log(`  @${c.user.uniqueId}: "${c.text.slice(0, 60)}" (${c.likes} likes)`));
console.log(`cursor: ${page1.cursor}, hasMore: ${page1.hasMore}\n`);

// Get second page
const page2 = await client.getComments(url, page1.cursor, 3);
console.log('Page 2:');
page2.comments.forEach(c => console.log(`  @${c.user.uniqueId}: "${c.text.slice(0, 60)}" (${c.likes} likes)`));
console.log(`cursor: ${page2.cursor}, hasMore: ${page2.hasMore}\n`);

console.log(`Total comments: ${page1.total}`);

process.exit(0);
