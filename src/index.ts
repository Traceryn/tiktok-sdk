export { TikTokClient } from './client.js';
export { ProxiflyProvider } from './ProxiflyProvider.js';
export { PlaywrightSession } from './playwright.js';

export { TikTokError, TikTokParseError, TikTokFetchError, TikTokRateLimitError, TikTokProxyError, TikTokCircuitOpenError, TikTokCacheError, TikTokWafError } from './utils/errors.js';
export { DESKTOP_UA, HEADERS, UA_ROTATION } from './utils/constants.js';
export { CookieJar, fetchTikTokCookies } from './utils/CookieJar.js';
export { formatDuration, formatISODate, formatUploadDate, parseCookieString, parseUsername, randomUserAgent } from './utils/helpers.js';

export { Proxymanager } from './core/Proxymanager.js';
export { RateLimiter } from './core/RateLimiter.js';
export { RetryHandler } from './core/RetryHandler.js';
export { CircuitBreaker } from './core/CircuitBreaker.js';
export { CacheManager } from './core/CacheManager.js';
export { SessionManager } from './core/SessionManager.js';
export { RequestQueue } from './core/RequestQueue.js';

export { ParserEngine, extractUserPageData } from './scrapers/ParserEngine.js';
export { fetchComments } from './scrapers/CommentScraper.js';
export {
  fetchHashtag,
  fetchSound, fetchSoundVideos,
  fetchTrending,
  fetchUserLikedVideos,
  fetchUserPlaylists, fetchPlaylist, fetchPlaylistVideos,
} from './scrapers/ExtraScraper.js';
export { extractFormats, extractSubtitles, findBestQuality } from './scrapers/FormatExtractor.js';
export { extractVideoId, normalizePhotoUrl, buildVideoUrl, buildUserUrl, isValidTikTokUrl, isPhotoUrl } from './scrapers/UrlExtractor.js';

export { sign, signUrl } from './core/Signer.js';

export type {
  TikTokVideo, TikTokUser, TikTokUserVideo,
  TikTokCommentList, TikTokComment,
  CommentUser, CommentImage, CommentLabel,
  HashtagInfo, SoundInfo, SoundItemList,
  TrendingVideos, LikedVideos,
  PlaylistInfo, PlaylistItemList,
  ClientOptions, ProxiflyOptions, ScrapeResult, ItemStruct, Session,
  ImagePost, FormatEntry, VideoStats, AuthorData, MusicData,
  ChallengeData, VideoData, PlayAddrStruct, SubtitleInfo,
  BitrateEntry, ImageInfo, AvatarInfo,
  TikTokUserSearchResults, SearchUserResult,
} from './types.js';
