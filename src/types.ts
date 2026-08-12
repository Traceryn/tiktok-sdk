export interface TikTokImageData {
  imageURL: {
    urlList: string[];
  };
  imageWidth: number;
  imageHeight: number;
}

export interface ImagePost {
  images: TikTokImageData[];
  cover?: TikTokImageData;
  shareCover?: TikTokImageData;
  title?: string;
}

export interface VideoData {
  id: string;
  height: number;
  width: number;
  duration: number;
  ratio: string;
  cover: string;
  originCover: string;
  dynamicCover: string;
  playAddr: string;
  downloadAddr: string;
  bitrate: number;
  encodedType: string;
  format: string;
  videoQuality: string;
  codecType: string;
  definition: string;
  subtitleInfos: SubtitleInfo[];
  size: number;
  PlayAddrStruct: PlayAddrStruct;
  zoomCover: Record<string, string>;
  imagePost?: ImagePost;
}

export interface PlayAddrStruct {
  DataSize: string;
  Width: number;
  Height: number;
  Uri: string;
  UrlList: string[];
  UrlKey: string;
}

export interface SubtitleInfo {
  UrlExpire: string;
  Size: string;
  LanguageID: string;
  LanguageCodeName: string;
  Url: string;
  Format: string;
  Version: string;
  Source: string;
}

export interface VideoStats {
  playCount: number;
  diggCount: number;
  commentCount: number;
  shareCount: number;
  collectCount: number;
}

export interface FormatEntry {
  format_id: string;
  format: string;
  format_note: string;
  ext: string;
  vcodec: string;
  acodec: string;
  width: number;
  height: number;
  resolution: string;
  tbr: number;
  filesize: number;
  url: string;
  urls: string[];
  quality: number;
  dynamic_range: string;
  aspect_ratio: number;
  protocol: string;
}

export interface ImageInfo {
  url: string;
  urls: string[];
  id: string;
  width: number;
  height: number;
  ratio: string;
  aspect_ratio: number;
  quality: string;
  format: string;
  size: number;
}

export interface TikTokVideo {
  by: string;
  id: string;
  desc: string;
  title: string;
  fulltitle: string;
  createTime: string;
  timestamp: number;
  duration: number;
  duration_string: string;
  width: number;
  height: number;
  resolution: string;
  ratio: string;
  format: string;
  definition: string;
  codec: string;
  size: number;
  ext: string;
  vcodec: string;
  acodec: string;
  tbr: number;
  filesize: number;
  dynamic_range: string;
  aspect_ratio: number;
  webpageUrl: string;
  originalUrl: string;
  display_id: string;
  upload_date: string;
  epoch: number;
  thumbnail: string;
  urls: {
    play: string;
    wmplay: string;
    music: string;
    cover: string;
    originCover: string;
    dynamicCover: string;
    best?: string;
  };
  formats: FormatEntry[];
  subtitles: Record<string, Array<{
    url: string;
    ext: string;
  }>>;
  stats: VideoStats;
  author: {
    id: string;
    uniqueId: string;
    nickname: string;
    avatar: string;
    signature: string;
    verified: boolean;
    secUid: string;
    uploaderUrl: string;
    channelUrl: string;
    followerCount: number;
    followingCount: number;
    heartCount: number;
    videoCount: number;
  };
  music: {
    id: string;
    title: string;
    author: string;
    original: boolean;
    duration: number;
    album?: string;
    artists?: string[];
  };
  hashtags: string[];
  images?: ImageInfo[];
  httpHeaders: Record<string, string>;
  cookies: string;
  raw?: Record<string, unknown>;
}

export interface AuthorData {
  id: string;
  uniqueId: string;
  nickname: string;
  signature: string;
  verified: boolean;
  secUid: string;
  avatarLarger: string;
  avatarMedium: string;
  avatarThumb: string;
  followerCount: number;
  followingCount: number;
  heartCount: number;
  videoCount: number;
  bioLink?: { link: string; risk?: number };
}

export interface AvatarInfo {
  url: string;
  width: number;
  height: number;
  ratio: string;
  quality: string;
  format: string;
  size: number;
}

export interface TikTokUser {
  by: string;
  id: string;
  uniqueId: string;
  nickname: string;
  signature: string;
  verified: boolean;
  secUid: string;
  avatar: {
    thumb: AvatarInfo;
    medium: AvatarInfo;
    larger: AvatarInfo;
  };
  stats: {
    followerCount: number;
    followingCount: number;
    heartCount: number;
    videoCount: number;
    diggCount: number;
    friendCount: number;
  };
  createTime: string;
  createTimestamp: number;
  language: string;
  region: string;
  bioLink?: string;
  privateAccount: boolean;
  secret: boolean;
  ftc: boolean;
  isOrganization: boolean;
  ttSeller: boolean;
  openFavorite: boolean;
  isADVirtual: boolean;
  commentSetting: number;
  duetSetting: number;
  stitchSetting: number;
  downloadSetting: number;
  followingVisibility: number;
  profileEmbedPermission: number;
  commerceUserInfo?: {
    commerceUser: boolean;
    category?: string;
  };
  httpHeaders: Record<string, string>;
  cookies: string;
  raw?: Record<string, unknown>;
}

export interface TikTokUserVideo {
  id: string;
  desc: string;
  createTime: string;
  duration: number;
  playCount: number;
  diggCount: number;
  commentCount: number;
  cover: string;
  raw?: Record<string, unknown>;
}

export interface MusicData {
  id: string;
  title: string;
  authorName: string;
  original: boolean;
  duration: number;
  playUrl: string;
  coverLarge: string;
  coverMedium: string;
  coverThumb: string;
}

export interface ChallengeData {
  id: string;
  title: string;
  desc: string;
}

export interface ItemStruct {
  id: string;
  desc: string;
  createTime: number;
  video: VideoData;
  author: AuthorData;
  music: MusicData;
  stats?: VideoStats | null;
  diggCount?: number;
  shareCount?: number;
  commentCount?: number;
  playCount?: number;
  collectCount?: number;
  challenges?: ChallengeData[];
  imagePost?: ImagePost;
}

export interface Session {
  request<T>(path: string, params?: Record<string, string>): Promise<T>;
  readonly isReady: boolean;
  render?: (url: string) => Promise<string>;
}

export interface ProxiflyOptions {
  protocol?: 'http' | 'socks4' | 'socks5';
  country?: string;
  quantity?: number;
  refreshInterval?: number;
}

export interface ClientOptions {
  proxy?: string | string[];
  proxifly?: ProxiflyOptions;
  headers?: Record<string, string>;
  timeout?: number;
  session?: Session;
  rateLimit?: number;
  maxRetries?: number;
  cacheTTL?: number;
  concurrency?: number;
  proxyRotation?: 'round-robin' | 'random' | 'lowest-failures';
}

export interface ScrapeResult {
  html: string;
  itemStruct: ItemStruct;
  cookies: Record<string, string>;
}

export interface BitrateEntry {
  Bitrate: number;
  QualityType: number;
  GearName?: string;
  PlayAddr: {
    DataSize: string;
    Width: number;
    Height: number;
    Uri: string;
    UrlList: string[];
    UrlKey: string;
    FileHash: string;
    FileCs: string;
  };
  CodecType: string;
  Format: string;
  MVMAF?: string;
  BitrateFPS?: number;
}

export interface UserPageData {
  user: ItemStruct['author'];
  stats: {
    followerCount: number;
    followingCount: number;
    heartCount: number;
    videoCount: number;
  };
  userInfo?: Record<string, unknown>;
}

export interface VideoDetailResponse {
  itemInfo?: {
    itemStruct: ItemStruct;
  };
}

export interface SearchUserResult {
  by: string;
  id: string;
  uniqueId: string;
  nickname: string;
  signature: string;
  verified: boolean;
  secUid: string;
  avatar: {
    thumb: AvatarInfo;
    medium: AvatarInfo;
    larger: AvatarInfo;
  };
  followerCount: number;
  followingCount: number;
  heartCount: number;
  videoCount: number;
  commerceUserInfo?: {
    commerceUser: boolean;
    category?: string;
  };
  privateAccount: boolean;
  raw?: Record<string, unknown>;
}

export interface TikTokUserSearchResults {
  users: SearchUserResult[];
  cursor: number;
  hasMore: boolean;
  raw?: Record<string, unknown>;
}

export interface WebSearchCodeResponse {
  webSearchCode?: string;
  cookies: Record<string, string>;
}

export interface CommentUser {
  uid: string;
  uniqueId: string;
  nickname: string;
  secUid: string;
  avatarThumb: string;
}

export interface CommentImage {
  url: string;
  width: number;
  height: number;
}

export interface CommentLabel {
  text: string;
  type: number;
}

export interface TikTokComment {
  by: string;
  cid: string;
  text: string;
  createTime: string;
  timestamp: number;
  likes: number;
  replyTotal: number;
  status: number;
  user: CommentUser;
  isAuthorDigged: boolean;
  labels: CommentLabel[];
  images: CommentImage[];
  stickPosition: number;
  raw?: Record<string, unknown>;
}

export interface TikTokCommentList {
  comments: TikTokComment[];
  total: number;
  cursor: number;
  hasMore: boolean;
  hasFilteredComments: boolean;
  raw?: Record<string, unknown>;
}

export interface HashtagInfo {
  by: string;
  id: string;
  title: string;
  desc: string;
  stats: {
    videoCount: number;
    viewCount: number;
  };
  raw?: Record<string, unknown>;
}

export interface SoundInfo {
  by: string;
  id: string;
  title: string;
  author: string;
  original: boolean;
  duration: number;
  playUrl: string;
  coverLarge: string;
  coverMedium: string;
  coverThumb: string;
  stats: {
    videoCount: number;
  };
  raw?: Record<string, unknown>;
}

export interface SoundItemList {
  videos: TikTokUserVideo[];
  cursor: number;
  hasMore: boolean;
  raw?: Record<string, unknown>;
}

export interface TrendingVideos {
  videos: TikTokUserVideo[];
  cursor: number;
  hasMore: boolean;
  raw?: Record<string, unknown>;
}

export interface PlaylistInfo {
  by: string;
  id: string;
  name: string;
  videoCount: number;
  coverUrl: string;
  authorName: string;
  raw?: Record<string, unknown>;
}

export interface PlaylistItemList {
  videos: TikTokUserVideo[];
  cursor: number;
  hasMore: boolean;
  raw?: Record<string, unknown>;
}

export interface LikedVideos {
  videos: TikTokUserVideo[];
  cursor: number;
  hasMore: boolean;
  raw?: Record<string, unknown>;
}
