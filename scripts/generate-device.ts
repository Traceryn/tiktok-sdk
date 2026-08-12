#!/usr/bin/env node
/**
 * Generates fresh device params and a msToken that look like they came from
 * a real browser. TikTok uses these to fingerprint requests, so having a new set
 * handy is useful when you're rotating identities or debugging WAF blocks.
 *
 * Usage: npm run script:device
 * Output: scripts/.cache/device-params.json + prints a curl-ready cookie string
 */

import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomBytes } from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = resolve(__dirname, '..')

/**
 * Rolls a random 19-digit device ID — basically what TikTok's JS does on page load.
 */
function randomId(): string {
  return String(Math.floor(Math.random() * 9e18) + 1e18)
}

/**
 * Builds a plausible msToken. Real ones come from TikTok's akamai challenge,
 * but this mimics the format well enough to pass basic checks.
 */
function msToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'
  let token = ''
  for (let i = 0; i < 42; i++) {
    token += chars[Math.floor(Math.random() * chars.length)]
  }
  if (token.length < 50) {
    token += randomBytes(8).toString('base64url')
  }
  return token
}

/**
 * Puts together the standard query params TikTok expects on every API call.
 * Randomizes screen size and history length so requests don't look identical.
 *
 * @returns A flat key-value map of URL params
 */
function generateParams(): Record<string, string> {
  return {
    aid: '1988',
    app_language: 'en',
    app_name: 'tiktok_web',
    browser_language: 'en',
    browser_name: 'Mozilla',
    browser_online: 'true',
    browser_platform: 'Win32',
    browser_version:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
    channel: 'tiktok_web',
    cookie_enabled: 'true',
    device_id: randomId(),
    device_platform: 'web_pc',
    focus_state: 'true',
    from_page: 'user',
    history_len: String(Math.floor(Math.random() * 10) + 1),
    is_fullscreen: 'false',
    is_page_visible: 'true',
    language: 'en',
    os: 'windows',
    priority_region: '',
    referer: '',
    region: 'US',
    screen_height: String(Math.floor(Math.random() * 480) + 600),
    screen_width: String(Math.floor(Math.random() * 1120) + 800),
    tz_name: 'America/New_York',
    webcast_language: 'en',
  }
}

/**
 * Builds a realistic cookie jar with the generated msToken and some extra
 * TikTok-specific flags that the API likes to see.
 *
 * @param msTokenVal - The token to embed as the msToken cookie
 * @returns A flat key-value map of cookies
 */
function generateCurlCookie(msTokenVal: string): Record<string, string> {
  return {
    msToken: msTokenVal,
    tt_chain_token: randomBytes(32).toString('base64url'),
    tiktok_city: 'New+York',
    tiktok_country_code: 'US',
    tiktok_language: 'en',
    tiktok_region: 'US',
    tiktok_timezone: 'America/New_York',
  }
}

function main() {
  console.log('Generating fresh TikTok device parameters...\n')

  const deviceId = randomId()
  const token = msToken()
  const params = generateParams()
  const cookies = generateCurlCookie(token)

  const output = {
    generated: new Date().toISOString(),
    deviceId,
    msToken: token,
    params,
    cookies,
    curlHeader: {
      'User-Agent': params.browser_version,
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://www.tiktok.com/',
      'Cookie': Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; '),
    },
  }

  const outDir = resolve(ROOT, 'scripts', '.cache')
  writeFileSync(resolve(outDir, 'device-params.json'), JSON.stringify(output, null, 2))

  console.log('  device_id:   ' + deviceId)
  console.log('  msToken:     ' + token)
  console.log('  region:      ' + params.region)
  console.log('  screen:      ' + params.screen_width + 'x' + params.screen_height)
  console.log()
  console.log('Saved to: scripts/.cache/device-params.json')
  console.log()
  console.log('Cookie string for curl:')
  console.log(Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; '))
}

main()
