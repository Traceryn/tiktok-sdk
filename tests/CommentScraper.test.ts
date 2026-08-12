import { describe, it, expect } from 'vitest';
import { parseCommentUser, parseCommentImages, parseLabels } from '../src/scrapers/CommentScraper.js';

describe('parseCommentUser', () => {
  const sampleRaw = {
    uid: '12345',
    unique_id: 'testuser',
    nickname: 'Test User',
    sec_uid: 'MS4wLjABAAAAtest',
    avatar_thumb: {
      url_list: ['https://p16-common-sign.tiktokcdn.com/avatar.jpg'],
    },
  };

  it('should parse all fields', () => {
    const user = parseCommentUser(sampleRaw);
    expect(user.uid).toBe('12345');
    expect(user.uniqueId).toBe('testuser');
    expect(user.nickname).toBe('Test User');
    expect(user.secUid).toBe('MS4wLjABAAAAtest');
    expect(user.avatarThumb).toBe('https://p16-common-sign.tiktokcdn.com/avatar.jpg');
  });

  it('should handle missing fields with defaults', () => {
    const user = parseCommentUser({});
    expect(user.uid).toBe('');
    expect(user.uniqueId).toBe('');
    expect(user.nickname).toBe('');
    expect(user.secUid).toBe('');
    expect(user.avatarThumb).toBe('');
  });

  it('should handle missing avatar_thumb', () => {
    const user = parseCommentUser({ uid: '1', unique_id: 'a' });
    expect(user.avatarThumb).toBe('');
  });
});

describe('parseCommentImages', () => {
  it('should parse image list', () => {
    const images = parseCommentImages([
      {
        origin_url: {
          url_list: ['https://example.com/img.jpg'],
          width: 1080,
          height: 720,
        },
      },
    ]);
    expect(images).toHaveLength(1);
    expect(images[0].url).toBe('https://example.com/img.jpg');
    expect(images[0].width).toBe(1080);
    expect(images[0].height).toBe(720);
  });

  it('should fallback to crop_url when origin_url missing', () => {
    const images = parseCommentImages([
      {
        crop_url: {
          url_list: ['https://example.com/crop.jpg'],
          width: 100,
          height: 100,
        },
      },
    ]);
    expect(images[0].url).toBe('https://example.com/crop.jpg');
  });

  it('should handle empty/undefined input', () => {
    expect(parseCommentImages(undefined)).toEqual([]);
    expect(parseCommentImages([])).toEqual([]);
  });

  it('should filter out images without url', () => {
    const images = parseCommentImages([{ origin_url: { url_list: [] } }]);
    expect(images).toHaveLength(0);
  });

  it('should handle single image object (not array)', () => {
    const images = parseCommentImages({
      origin_url: {
        url_list: ['https://example.com/img.jpg'],
        width: 800,
        height: 600,
      },
    } as any);
    expect(images).toHaveLength(1);
    expect(images[0].url).toBe('https://example.com/img.jpg');
  });
});

describe('parseLabels', () => {
  it('should parse label list', () => {
    const labels = parseLabels([
      { text: 'Liked by creator', type: 20 },
      { text: 'Pinned', type: 1 },
    ]);
    expect(labels).toHaveLength(2);
    expect(labels[0].text).toBe('Liked by creator');
    expect(labels[0].type).toBe(20);
    expect(labels[1].text).toBe('Pinned');
    expect(labels[1].type).toBe(1);
  });

  it('should handle empty/undefined input', () => {
    expect(parseLabels(undefined)).toEqual([]);
    expect(parseLabels([])).toEqual([]);
  });

  it('should handle missing fields', () => {
    const labels = parseLabels([{ text: 'Test' }] as any);
    expect(labels[0].text).toBe('Test');
    expect(labels[0].type).toBe(0);
  });
});
