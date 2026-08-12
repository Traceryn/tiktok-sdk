import { ofetch } from 'ofetch';

const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36';

try {
  const html = await ofetch('https://www.tiktok.com/node/search/user?keyword=corexanthony', {
    headers: { 'User-Agent': ua, Accept: '*/*' },
    timeout: 15000,
    parseResponse: t => t,
    retry: 0,
  });
  
  console.log('Length:', html.length);
  console.log('First 500:', html.slice(0, 500));
  
  // Check if it contains user data
  if (html.includes('user')) console.log('Contains "user"');
  if (html.includes('uniqueId')) console.log('Contains "uniqueId"');
  if (html.includes('nickname')) console.log('Contains "nickname"');
  if (html.includes('corexanthony')) console.log('Contains "corexanthony"');
  if (html.includes('user_list')) console.log('Contains "user_list"');
  
  // Check for any href with @
  const hrefs = html.match(/href="\/@[^"]+"/g);
  if (hrefs) console.log('hrefs:', hrefs.slice(0, 5));
  
} catch (e) {
  console.error('Failed:', e.message);
  if (e.status) console.error('Status:', e.status);
}

process.exit(0);
