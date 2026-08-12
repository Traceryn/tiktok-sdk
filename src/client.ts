import type { TikTokVideo, TikTokUser, TikTokUserSearchResults, TikTokCommentList, ClientOptions, Session, ImageInfo, HashtagInfo, SoundInfo, SoundItemList, TrendingVideos, LikedVideos, PlaylistInfo, PlaylistItemList } from './types.js';
import { DESKTOP_UA, HEADERS } from './utils/constants.js';
import { formatISODate, formatUploadDate, formatDuration, parseCookieString } from './utils/helpers.js';
import { scrapeVideo } from './scrapers/VideoScraper.js';
import { scrapeUser } from './scrapers/UserScraper.js';
import { searchUsers as searchUsersScraper } from './scrapers/SearchScraper.js';
import { fetchComments } from './scrapers/CommentScraper.js';
import {
  fetchHashtag,
  fetchSound, fetchSoundVideos,
  fetchTrending,
  fetchUserLikedVideos,
  fetchUserPlaylists, fetchPlaylist, fetchPlaylistVideos,
} from './scrapers/ExtraScraper.js';
import { extractFormats, extractSubtitles, findBestQuality } from './scrapers/FormatExtractor.js';
import { buildVideoUrl } from './scrapers/UrlExtractor.js';
import { Proxymanager } from './core/Proxymanager.js';
import { RateLimiter } from './core/RateLimiter.js';
import { RetryHandler } from './core/RetryHandler.js';
import { CircuitBreaker } from './core/CircuitBreaker.js';
import { CacheManager } from './core/CacheManager.js';
import { SessionManager } from './core/SessionManager.js';
import { RequestQueue } from './core/RequestQueue.js';
import { ProxiflyProvider } from './ProxiflyProvider.js';
import { TikTokError, TikTokRateLimitError } from './utils/errors.js';
import { DEFAULT_RATE_LIMIT, DEFAULT_MAX_RETRIES, DEFAULT_CACHE_TTL, DEFAULT_CONCURRENCY, DEFAULT_TIMEOUT } from './utils/constants.js';

interface ResolvedOptions {
  timeout: number;
  headers: Record<string, string> | undefined;
  session: Session | undefined;
  rateLimit: number;
  maxRetries: number;
  cacheTTL: number;
  concurrency: number;
}

export class TikTokClient {
  private options: ResolvedOptions;
  private proxyManager: Proxymanager;
  private proxiflyProvider: ProxiflyProvider;
  private rateLimiter: RateLimiter;
  private retryHandler: RetryHandler;
  private circuitBreaker: CircuitBreaker;
  private cache: CacheManager;
  private sessionManager: SessionManager;
  private queue: RequestQueue;

  constructor(options: ClientOptions = {}) {
    this.options = {
      timeout: options.timeout ?? DEFAULT_TIMEOUT,
      headers: options.headers,
      session: options.session,
      rateLimit: options.rateLimit ?? DEFAULT_RATE_LIMIT,
      maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
      cacheTTL: options.cacheTTL ?? DEFAULT_CACHE_TTL,
      concurrency: options.concurrency ?? DEFAULT_CONCURRENCY,
    };

    this.proxyManager = new Proxymanager(
      undefined,
      options.proxyRotation ?? 'round-robin',
    );

    this.proxiflyProvider = new ProxiflyProvider(
      this.proxyManager,
      options.proxifly,
      typeof options.proxy === 'string' ? [options.proxy] : options.proxy,
    );

    this.rateLimiter = new RateLimiter({
      tokensPerSecond: this.options.rateLimit,
      maxBurst: this.options.rateLimit * 2,
    });
    this.retryHandler = new RetryHandler({ maxRetries: this.options.maxRetries });
    this.circuitBreaker = new CircuitBreaker();
    this.cache = new CacheManager(this.options.cacheTTL);
    this.sessionManager = new SessionManager();
    this.queue = new RequestQueue(this.options.concurrency);
  }

  private async awaitProxy(): Promise<string> {
    if (!this.proxiflyProvider.isReady) {
      await this.proxiflyProvider.ready;
    }

    const entry = this.proxyManager.getProxy();
    if (!entry) throw new TikTokError('No proxy available. ProxiflyProvider failed to fetch proxies.');
    return entry.url;
  }

  addProxies(proxies: string[]): void {
    this.proxyManager.addProxies(proxies);
  }

  async getVideo(url: string, useCache = true): Promise<TikTokVideo> {
    const cacheKey = `video:${url}`;
    if (useCache) {
      const cached = this.cache.get<TikTokVideo>(cacheKey);
      if (cached) return cached;
    }

    return this.queue.enqueue(() => this.executeGetVideo(url), 1).then((result) => {
      this.cache.set(cacheKey, result);
      return result;
    });
  }

  private async executeGetVideo(url: string): Promise<TikTokVideo> {
    await this.rateLimiter.acquire();

    return this.circuitBreaker.call(async () => {
      let lastError: Error | null = null;
      let attempt = 0;

      while (attempt <= this.options.maxRetries) {
        try {
          const proxyUrl = await this.awaitProxy();
          const startTime = Date.now();

          const { itemStruct: item, cookies } = await scrapeVideo(url, this.options.session, proxyUrl);

          this.proxyManager.reportSuccess(proxyUrl, Date.now() - startTime);

          const imagePost = item.imagePost;
          const images = imagePost?.images?.map((img): ImageInfo => {
            const urls = img.imageURL?.urlList ?? [];
            const url = urls[0] ?? '';
            const w = img.imageWidth ?? 0;
            const h = img.imageHeight ?? 0;
            let a = w, bb = h;
            while (bb) { const t = bb; bb = a % bb; a = t; }
            const gcd = a || 1;
            const m2 = url.match(/\.(\w+)(?:\?|$)/);
            let fmt = 'jpeg';
            if (m2 && m2[1]) {
              const ext = m2[1].toLowerCase();
              fmt = ext === 'jpg' ? 'jpeg' : ext;
            }
            const idMatch = url.match(/\/([^/]+?)(?:~tplv|\?|$)/);
            const id = idMatch?.[1]?.replace(/[^a-zA-Z0-9_-]/g, '') ?? '';
            const maxDim = Math.max(w, h);
            const quality = maxDim > 0 ? `${maxDim}p` : 'unknown';
            return {
              url,
              urls,
              id,
              width: w,
              height: h,
              ratio: w && h ? `${w / gcd}:${h / gcd}` : '',
              aspect_ratio: w && h ? +(w / h).toFixed(4) : 0,
              quality,
              format: fmt,
              size: 0,
            };
          }).filter((img) => img.url) as ImageInfo[] | undefined;
          const isPhoto = !!images?.length;

          const best = findBestQuality(item);
          const res = best && best.width > 0
            ? { width: best.width, height: best.height }
            : { width: item.video?.width ?? 0, height: item.video?.height ?? 0 };

          const formats = extractFormats(item);
          const subtitles = extractSubtitles(item);
          const timestamp = Number(item.createTime ?? 0);

          const as = (item as any).authorStats as Record<string, number> | undefined;

          const primaryFormat = formats.find(
            (f) => f.width === res.width && f.height === res.height,
          ) ?? formats[0] ?? null;

          const videoUrls = {
            play: item.video?.playAddr ?? '',
            wmplay: item.video?.downloadAddr ?? item.video?.playAddr ?? '',
            music: item.music?.playUrl ?? '',
            cover: item.video?.cover ?? '',
            originCover: item.video?.originCover ?? '',
            dynamicCover: item.video?.dynamicCover ?? '',
            best: best?.url ?? undefined,
          };

          const httpHeaders: Record<string, string> = {
            ...HEADERS.desktop,
            Referer: url,
          };

          const result: TikTokVideo = {
            by: 'Traceryn',
            id: item.id,
            desc: item.desc,
            title: item.desc,
            fulltitle: item.desc,
            createTime: formatISODate(timestamp),
            timestamp,
            duration: item.video?.duration ?? 0,
            duration_string: formatDuration(item.video?.duration ?? 0),
            width: res.width,
            height: res.height,
            resolution: `${res.width}x${res.height}`,
            ratio: res.width && res.height ? `${Math.min(res.width, res.height)}p` : '',
            format: primaryFormat?.format ?? item.video?.format ?? '',
            definition: res.width && res.height ? `${Math.min(res.width, res.height)}p` : '',
            codec: primaryFormat?.vcodec ?? item.video?.codecType ?? '',
            size: Number(item.video?.size ?? 0),
            ext: primaryFormat?.ext ?? (isPhoto ? '' : 'mp4'),
            vcodec: primaryFormat?.vcodec ?? '',
            acodec: primaryFormat?.acodec ?? '',
            tbr: primaryFormat?.tbr ?? 0,
            filesize: primaryFormat?.filesize ?? 0,
            dynamic_range: 'SDR',
            aspect_ratio: res.width > 0 && res.height > 0
              ? +(res.width / res.height).toFixed(2)
              : 0,
            webpageUrl: isPhoto
              ? `https://www.tiktok.com/@${item.author?.uniqueId ?? ''}/photo/${item.id ?? ''}`
              : buildVideoUrl(item.author?.uniqueId ?? '', item.id ?? ''),
            originalUrl: isPhoto
              ? `https://www.tiktok.com/@${item.author?.uniqueId ?? ''}/photo/${item.id ?? ''}`
              : buildVideoUrl(item.author?.uniqueId ?? '', item.id ?? ''),
            display_id: item.id,
            upload_date: formatUploadDate(timestamp),
            epoch: Math.floor(Date.now() / 1000),
            thumbnail: item.video?.originCover ?? item.video?.cover ?? '',
            urls: videoUrls,
            formats,
            subtitles,
            stats: {
              playCount: item.stats?.playCount ?? item.playCount ?? 0,
              diggCount: item.stats?.diggCount ?? item.diggCount ?? 0,
              commentCount: item.stats?.commentCount ?? item.commentCount ?? 0,
              shareCount: item.stats?.shareCount ?? item.shareCount ?? 0,
              collectCount: Number(item.stats?.collectCount ?? item.collectCount ?? 0),
            },
            author: {
              id: item.author?.id ?? '',
              uniqueId: item.author?.uniqueId ?? '',
              nickname: item.author?.nickname ?? '',
              avatar: item.author?.avatarLarger ?? '',
              signature: item.author?.signature ?? '',
              verified: item.author?.verified ?? false,
              secUid: item.author?.secUid ?? '',
              uploaderUrl: `https://www.tiktok.com/@${item.author?.uniqueId ?? ''}`,
              channelUrl: `https://www.tiktok.com/@${item.author?.uniqueId ?? ''}`,
              followerCount: as?.followerCount ?? item.author?.followerCount ?? 0,
              followingCount: as?.followingCount ?? item.author?.followingCount ?? 0,
              heartCount: as?.heartCount ?? item.author?.heartCount ?? 0,
              videoCount: as?.videoCount ?? item.author?.videoCount ?? 0,
            },
            music: {
              id: item.music?.id ?? '',
              title: item.music?.title ?? '',
              author: item.music?.authorName ?? '',
              original: item.music?.original ?? false,
              duration: item.music?.duration ?? 0,
              album: item.music?.title ?? undefined,
              artists: item.music?.authorName ? [item.music.authorName] : undefined,
            },
            hashtags: (item.challenges ?? []).map((c) => c.title),
            images,
            raw: item as unknown as Record<string, unknown>,
            httpHeaders,
            cookies: parseCookieString(cookies),
          };

          return result;
        } catch (error: unknown) {
          lastError = error instanceof Error ? error : new Error(String(error));

          if (error instanceof TikTokRateLimitError) {
            await new Promise((r) => setTimeout(r, error.retryAfter));
            attempt++;
            continue;
          }

          this.proxyManager.reportFailure(
            this.proxyManager.getProxy()?.url ?? '',
          );

          if (!this.retryHandler.shouldRetry(error, attempt)) {
            throw error;
          }

          attempt++;
          if (attempt <= this.options.maxRetries) {
            await this.retryHandler.delay(attempt);
          }
        }
      }

      throw lastError ?? new TikTokError('Max retries exceeded');
    });
  }

  async getUser(usernameOrUrl: string, useCache = true): Promise<TikTokUser> {
    const username = usernameOrUrl.replace(/https?:\/\/[^/]+\/@?/, '@').replace('@', '');
    const cacheKey = `user:${username}`;
    if (useCache) {
      const cached = this.cache.get<TikTokUser>(cacheKey);
      if (cached) return cached;
    }

    return this.queue.enqueue(() => this.executeGetUser(username), 0).then((result) => {
      this.cache.set(cacheKey, result);
      return result;
    });
  }

  private async executeGetUser(username: string): Promise<TikTokUser> {
    await this.rateLimiter.acquire();

    return this.circuitBreaker.call(async () => {
      let lastError: Error | null = null;
      let attempt = 0;

      while (attempt <= this.options.maxRetries) {
        try {
          const proxyUrl = await this.awaitProxy();
          const startTime = Date.now();
          const result = await scrapeUser(username, proxyUrl);
          this.proxyManager.reportSuccess(proxyUrl, Date.now() - startTime);
          return result;
        } catch (error: unknown) {
          lastError = error instanceof Error ? error : new Error(String(error));

          if (error instanceof TikTokRateLimitError) {
            await new Promise((r) => setTimeout(r, error.retryAfter));
            attempt++;
            continue;
          }

          this.proxyManager.reportFailure(
            this.proxyManager.getProxy()?.url ?? '',
          );

          if (!this.retryHandler.shouldRetry(error, attempt)) {
            throw error;
          }

          attempt++;
          if (attempt <= this.options.maxRetries) {
            await this.retryHandler.delay(attempt);
          }
        }
      }

      throw lastError ?? new TikTokError('Max retries exceeded');
    });
  }

  async downloadVideo(videoUrl: string): Promise<ArrayBuffer> {
    await this.rateLimiter.acquire(2);
    const proxyUrl = await this.awaitProxy();
    const { itemStruct, cookies } = await scrapeVideo(videoUrl, this.options.session, proxyUrl);

    const downloadUrl = itemStruct.video?.playAddr ?? itemStruct.video?.downloadAddr;
    if (!downloadUrl) throw new TikTokError('No video URL found');

    const { ofetch } = await import('ofetch');
    const cookieStr = parseCookieString(cookies);

    return ofetch(downloadUrl, {
      headers: {
        'User-Agent': DESKTOP_UA,
        Referer: 'https://www.tiktok.com/',
        Cookie: cookieStr,
        Accept: '*/*',
      },
      proxy: proxyUrl,
      responseType: 'arrayBuffer',
      retry: 0,
      timeout: 60000,
    } as any) as Promise<ArrayBuffer>;
  }

  getProxyStats() {
    return this.proxyManager.getStats();
  }

  async searchUsers(query: string, cursor?: number, count = 20): Promise<TikTokUserSearchResults> {
    await this.rateLimiter.acquire();
    const proxyUrl = await this.awaitProxy();
    return searchUsersScraper(query, proxyUrl, cursor ?? 0, count, this.options.session);
  }

  async getComments(videoUrl: string, cursor?: number, count = 20): Promise<TikTokCommentList> {
    await this.rateLimiter.acquire();
    const videoId = videoUrl.match(/\/(?:video|photo)\/(\d+)/)?.[1] ?? videoUrl;
    const authorUsername = videoUrl.match(/@([\w.-]+)/)?.[1] ?? '';
    const proxyUrl = await this.awaitProxy();
    return fetchComments(videoId, authorUsername, cursor ?? 0, count, proxyUrl);
  }

  async getHashtag(name: string): Promise<HashtagInfo> {
    await this.rateLimiter.acquire();
    const proxyUrl = await this.awaitProxy();
    return fetchHashtag(name, proxyUrl);
  }

  async getSound(musicId: string): Promise<SoundInfo> {
    await this.rateLimiter.acquire();
    const proxyUrl = await this.awaitProxy();
    return fetchSound(musicId, proxyUrl, this.options.session);
  }

  async getSoundVideos(musicId: string, cursor?: number, count = 30): Promise<SoundItemList> {
    await this.rateLimiter.acquire();
    const proxyUrl = await this.awaitProxy();
    return fetchSoundVideos(musicId, cursor ?? 0, count, proxyUrl, this.options.session);
  }

  async getTrendingVideos(count = 30): Promise<TrendingVideos> {
    await this.rateLimiter.acquire();
    const proxyUrl = await this.awaitProxy();
    return fetchTrending(count, proxyUrl, this.options.session);
  }

  async getUserLikedVideos(username: string, cursor?: number, count = 30): Promise<LikedVideos> {
    await this.rateLimiter.acquire();
    const proxyUrl = await this.awaitProxy();
    const user = await scrapeUser(username, proxyUrl);
    return fetchUserLikedVideos(user.secUid, cursor ?? 0, count, proxyUrl, this.options.session);
  }

  async getUserPlaylists(username: string, cursor?: number, count = 30): Promise<{ playlists: PlaylistInfo[]; cursor: number; hasMore: boolean }> {
    await this.rateLimiter.acquire();
    const proxyUrl = await this.awaitProxy();
    const user = await scrapeUser(username, proxyUrl);
    return fetchUserPlaylists(user.secUid, cursor ?? 0, count, proxyUrl, this.options.session);
  }

  async getPlaylist(mixId: string): Promise<PlaylistInfo> {
    await this.rateLimiter.acquire();
    const proxyUrl = await this.awaitProxy();
    return fetchPlaylist(mixId, proxyUrl, this.options.session);
  }

  async getPlaylistVideos(mixId: string, cursor?: number, count = 30): Promise<PlaylistItemList> {
    await this.rateLimiter.acquire();
    const proxyUrl = await this.awaitProxy();
    return fetchPlaylistVideos(mixId, cursor ?? 0, count, proxyUrl, this.options.session);
  }

  invalidateCache(url: string): void {
    this.cache.delete(`video:${url}`);
  }

  clearCache(): void {
    this.cache.clear();
  }
}
