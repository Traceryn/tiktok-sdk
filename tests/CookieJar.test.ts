import { describe, it, expect } from 'vitest';
import { CookieJar } from '../src/utils/CookieJar.js';

describe('CookieJar', () => {
  it('should set cookies from set-cookie header strings', () => {
    const jar = new CookieJar();
    const headers = {
      getSetCookie: () => [
        'ttwid=1%2C123; Path=/; Domain=.tiktok.com',
        'tt_csrf_token=abc123; Path=/; Domain=.tiktok.com',
      ],
    } as unknown as Headers;

    jar.setFromHeaders(headers);

    expect(jar.all).toEqual({
      ttwid: '1%2C123',
      tt_csrf_token: 'abc123',
    });
  });

  it('should handle empty cookies', () => {
    const jar = new CookieJar();
    const headers = {
      getSetCookie: () => [],
    } as unknown as Headers;

    jar.setFromHeaders(headers);
    expect(jar.all).toEqual({});
  });

  it('should handle getSetCookie being undefined', () => {
    const jar = new CookieJar();
    const headers = {} as unknown as Headers;

    jar.setFromHeaders(headers);
    expect(jar.all).toEqual({});
  });

  it('should overwrite existing cookie with same name', () => {
    const jar = new CookieJar();
    const headers1 = {
      getSetCookie: () => ['ttwid=old_value; Path=/'],
    } as unknown as Headers;
    const headers2 = {
      getSetCookie: () => ['ttwid=new_value; Path=/'],
    } as unknown as Headers;

    jar.setFromHeaders(headers1);
    jar.setFromHeaders(headers2);

    expect(jar.all.ttwid).toBe('new_value');
  });

  it('should parse cookies with equals signs in values', () => {
    const jar = new CookieJar();
    const headers = {
      getSetCookie: () => ['custom_cookie=base64==data==; Path=/'],
    } as unknown as Headers;

    jar.setFromHeaders(headers);
    expect(jar.all.custom_cookie).toBe('base64==data==');
  });

  it('returns a copy of all cookies (immutable)', () => {
    const jar = new CookieJar();
    const headers = {
      getSetCookie: () => ['ttwid=val; Path=/'],
    } as unknown as Headers;
    jar.setFromHeaders(headers);

    const copy = jar.all;
    copy.ttwid = 'modified';

    expect(jar.all.ttwid).toBe('val');
  });
});
