<img src='https://raw.githubusercontent.com/Traceryn/tiktok-sdk/master/media/Traceryn.png' alt='Traceryn Logo' width='320'>

# ***Traceryn/Tiktok-sdk***
A lightweight TikTok SDK for Node.js that makes it easier to fetch videos, users, comments, playlists, hashtags, and other TikTok data in a clean, structured way.

## Disclaimer

> [!CAUTION]
> This project is not affiliated with, endorsed by, or officially connected to TikTok or ByteDance.
> TikTok and related names, marks, logos, and images are trademarks of their respective owners.
>
> This SDK is provided for legitimate development use only. Use it at your own discretion and in accordance with TikTok's terms and applicable laws.

## How it works

- Talks to TikTok through web endpoints and structured responses.
- Playwright is optional and only helps when a browser-backed session makes sense.
- Keeps the setup lighter for normal use and avoids needing a full browser just to start.
- Supports videos, users, comments, hashtags, playlists, sounds, and search data.

> [!IMPORTANT]
> This is an unofficial SDK that depends on public endpoints and scraping behavior which may change at any time. Some features may require proxies, Playwright, or additional setup depending on your environment. Use responsibly.

## Install

```sh
npm install @traceryn/tiktok-sdk
```

### Optional: Playwright

```sh
npm install playwright
```

Playwright is only needed for `--session` (browser-backed) usage. No separate Chromium install is required.

## Main methods

- `getVideo(url)` — get video data from a TikTok link
- `getUser(usernameOrUrl)` — get user profile data
- `getComments(videoUrl)` — get comments from a video or post
- `searchUsers(query)` — search for users
- `getHashtag(name)` — get hashtag stats
- `getSound(musicId)` — get sound info
- `getSoundVideos(musicId)` — get videos using a sound
- `getTrendingVideos()` — get trending videos
- `getUserLikedVideos(username)` — get videos a user liked
- `getUserPlaylists(username)` — get playlists for a user
- `getPlaylist(mixId)` — get one playlist
- `getPlaylistVideos(mixId)` — get videos inside a playlist
- `addProxies(proxies)` — add your own proxies
- `getProxyStats()` — check proxy usage
- `invalidateCache(url)` — clear one cached video
- `clearCache()` — clear all cached video data

## Quick start

```js
const { TikTokClient } = require('@traceryn/tiktok-sdk');

const client = new TikTokClient();

const video = await client.getVideo('https://www.tiktok.com/@user/video/1234567890');
console.log(video.title);
```

For browser-backed requests that bypass WAF:

```js
const { TikTokClient, PlaywrightSession } = require('@traceryn/tiktok-sdk');

const session = new PlaywrightSession({ headless: true });
await session.init();

const client = new TikTokClient({ session });
const trending = await client.getTrendingVideos();

if (session) await session.close();
```

## Running tests

```sh
npm test
```

```sh
npm run typecheck
```

```sh
npm run lint
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to contribute, and [SECURITY.md](SECURITY.md) for how to report security issues.

## LICENSE

Licensed under the MIT License. See the [LICENSE](../LICENSE) file for details.