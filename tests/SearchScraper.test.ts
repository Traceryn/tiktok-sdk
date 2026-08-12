import { describe, it, expect } from 'vitest';
import { buildAvatarInfo, parseSearchUser } from '../src/scrapers/SearchScraper.js';

describe('buildAvatarInfo', () => {
  it('should parse cropcenter dimensions from URL', () => {
    const url =
      'https://p16-common-sign.tiktokcdn.com/tos-maliva-avt-0068/abc~tplv-tiktokx-cropcenter:100:100.jpeg?dr=14579';
    const info = buildAvatarInfo(url);

    expect(info.width).toBe(100);
    expect(info.height).toBe(100);
    expect(info.ratio).toBe('1:1');
    expect(info.quality).toBe('100p');
    expect(info.format).toBe('jpeg');
    expect(info.size).toBe(0);
    expect(info.url).toBe(url);
  });

  it('should parse non-square cropcenter dimensions', () => {
    const url =
      'https://p16-common-sign.tiktokcdn.com/tos-maliva-avt-0068/abc~tplv-tiktokx-cropcenter:200:100.jpeg?dr=14579';
    const info = buildAvatarInfo(url);

    expect(info.width).toBe(200);
    expect(info.height).toBe(100);
    expect(info.ratio).toBe('2:1');
    expect(info.quality).toBe('200p');
  });

  it('should detect jpg format as jpeg', () => {
    const url =
      'https://p16-common-sign.tiktokcdn.com/tos-maliva-avt-0068/abc~tplv-tiktokx-cropcenter:100:100.jpg?dr=14579';
    const info = buildAvatarInfo(url);

    expect(info.format).toBe('jpeg');
  });

  it('should handle URL without cropcenter', () => {
    const url = 'https://example.com/avatar.png';
    const info = buildAvatarInfo(url);

    expect(info.width).toBe(0);
    expect(info.height).toBe(0);
    expect(info.ratio).toBe('');
    expect(info.quality).toBe('unknown');
    expect(info.format).toBe('png');
  });

  it('should detect webp format', () => {
    const url =
      'https://p16-common-sign.tiktokcdn.com/tos-maliva-avt-0068/abc~tplv-tiktokx-cropcenter:100:100.webp?dr=14579';
    const info = buildAvatarInfo(url);

    expect(info.format).toBe('webp');
  });

  it('should handle URL with no recognizable extension', () => {
    const url = 'https://example.com/avatar';
    const info = buildAvatarInfo(url);

    expect(info.format).toBe('jpeg');
    expect(info.width).toBe(0);
    expect(info.height).toBe(0);
  });
});

describe('parseSearchUser', () => {
  const sampleUserInfo = {
    uid: '123456789',
    uniqueId: 'testuser',
    nickname: 'Test User',
    signature: 'Hello world',
    verified: true,
    secUid: 'MS4wLjABAAAAtest',
    avatarThumb:
      'https://p16-common-sign.tiktokcdn.com/tos-maliva-avt-0068/abc~tplv-tiktokx-cropcenter:100:100.jpeg?dr=14579',
    avatarMedium:
      'https://p16-common-sign.tiktokcdn.com/tos-maliva-avt-0068/abc~tplv-tiktokx-cropcenter:720:720.jpeg?dr=14579',
    avatarLarger:
      'https://p16-common-sign.tiktokcdn.com/tos-maliva-avt-0068/abc~tplv-tiktokx-cropcenter:1080:1080.jpeg?dr=14579',
    followerCount: 1500,
    followingCount: 42,
    heart: 50000,
    videoCount: 100,
    privateAccount: false,
  };

  it('should parse user_info with all fields', () => {
    const raw = { user_info: sampleUserInfo };
    const result = parseSearchUser(raw);

    expect(result.by).toBe('Traceryn');
    expect(result.id).toBe('123456789');
    expect(result.uniqueId).toBe('testuser');
    expect(result.nickname).toBe('Test User');
    expect(result.signature).toBe('Hello world');
    expect(result.verified).toBe(true);
    expect(result.secUid).toBe('MS4wLjABAAAAtest');
    expect(result.followerCount).toBe(1500);
    expect(result.followingCount).toBe(42);
    expect(result.heartCount).toBe(50000);
    expect(result.videoCount).toBe(100);
    expect(result.privateAccount).toBe(false);
  });

  it('should parse avatar variants', () => {
    const raw = { user_info: sampleUserInfo };
    const result = parseSearchUser(raw);

    expect(result.avatar.thumb.width).toBe(100);
    expect(result.avatar.medium.width).toBe(720);
    expect(result.avatar.larger.width).toBe(1080);
  });

  it('should handle raw user data without user_info wrapper', () => {
    const result = parseSearchUser(sampleUserInfo);

    expect(result.uniqueId).toBe('testuser');
    expect(result.nickname).toBe('Test User');
  });

  it('should handle missing optional fields with defaults', () => {
    const minimal = { uid: '1', uniqueId: 'a' };
    const result = parseSearchUser(minimal);

    expect(result.id).toBe('1');
    expect(result.uniqueId).toBe('a');
    expect(result.nickname).toBe('');
    expect(result.signature).toBe('');
    expect(result.verified).toBe(false);
    expect(result.followerCount).toBe(0);
    expect(result.followingCount).toBe(0);
    expect(result.heartCount).toBe(0);
    expect(result.videoCount).toBe(0);
    expect(result.privateAccount).toBe(false);
    expect(result.avatar.thumb.width).toBe(0);
    expect(result.commerceUserInfo).toBeUndefined();
  });

  it('should parse commerceUserInfo when present', () => {
    const raw = {
      user_info: {
        ...sampleUserInfo,
        commerceUserInfo: { commerceUser: true, category: 'Education' },
      },
    };
    const result = parseSearchUser(raw);

    expect(result.commerceUserInfo).toBeDefined();
    expect(result.commerceUserInfo!.commerceUser).toBe(true);
    expect(result.commerceUserInfo!.category).toBe('Education');
  });

  it('should handle alternate field names (underscore style)', () => {
    const altData = {
      uid: '999',
      uniqueId: 'altuser',
      nickname: 'Alt',
      follower_count: 300,
      following_count: 10,
      heart: 9999,
      video_count: 5,
      private_account: true,
      avatar_thumb: { url_list: ['https://example.com/thumb.jpg'] },
      avatar_medium: { url_list: ['https://example.com/medium.jpg'] },
      avatar_larger: { url_list: ['https://example.com/larger.jpg'] },
    };
    const result = parseSearchUser(altData);

    expect(result.followerCount).toBe(300);
    expect(result.followingCount).toBe(10);
    expect(result.heartCount).toBe(9999);
    expect(result.videoCount).toBe(5);
    expect(result.privateAccount).toBe(true);
    expect(result.avatar.thumb.url).toContain('thumb.jpg');
    expect(result.avatar.medium.url).toContain('medium.jpg');
    expect(result.avatar.larger.url).toContain('larger.jpg');
  });
});
