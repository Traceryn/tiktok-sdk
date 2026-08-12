#!/usr/bin/env node
/**
 * Runs every TikTokClient endpoint against real TikTok URLs and reports
 * which ones work and which get blocked. Handy for figuring out if TikTok
 * changed something or if your current IP is on the naughty list.
 *
 * Usage: npm run script:health
 */

import { TikTokClient } from '../lib/index.js'

const TEST_VIDEO = 'https://www.tiktok.com/@tiktok/video/7109169345133268226'
const TEST_USER = 'tiktok'
const TEST_HASHTAG = 'fyp'
const TEST_SOUND = '7109169345133268226'

interface TestResult {
  endpoint: string
  status: 'ok' | 'error'
  ms: number
  error?: string
}

/**
 * Wraps a single endpoint call with timing and error capture.
 * Just runs it and tags it — doesn't stop the whole batch on failure.
 *
 * @param label - Human-readable endpoint name for the report
 * @param fn - The actual client call to execute
 */
async function runTest(label: string, fn: () => Promise<any>): Promise<TestResult> {
  const start = Date.now()
  try {
    await fn()
    return { endpoint: label, status: 'ok', ms: Date.now() - start }
  } catch (err) {
    return { endpoint: label, status: 'error', ms: Date.now() - start, error: (err as Error).message }
  }
}

async function main() {
  console.log('TikTok SDK — Endpoint Health Check\n')

  const client = new TikTokClient({ maxRetries: 0, timeout: 30000 })

  console.log('Waiting for proxies...')
  await new Promise((r) => setTimeout(r, 5000))

  const results: TestResult[] = []
  results.push(await runTest('getUser', () => client.getUser(TEST_USER, false)))
  results.push(await runTest('getTrendingVideos', () => client.getTrendingVideos(5)))
  results.push(await runTest('getComments', () => client.getComments(TEST_VIDEO, undefined, 3)))
  results.push(await runTest('getUserPlaylists', () => client.getUserPlaylists(TEST_USER, undefined, 3)))
  results.push(await runTest('getHashtag', () => client.getHashtag(TEST_HASHTAG)))
  results.push(await runTest('getSound', () => client.getSound(TEST_SOUND)))
  results.push(await runTest('searchUsers', () => client.searchUsers('tiktok', undefined, 3)))
  results.push(await runTest('getSoundVideos', () => client.getSoundVideos(TEST_SOUND, undefined, 3)))
  results.push(await runTest('getUserLikedVideos', () => client.getUserLikedVideos(TEST_USER, undefined, 3)))
  results.push(await runTest('getVideo', () => client.getVideo(TEST_VIDEO, false)))
  results.push(await runTest('getPlaylist', () => client.getPlaylist('7109169345133268226')))
  results.push(await runTest('getPlaylistVideos', () => client.getPlaylistVideos('7109169345133268226', undefined, 3)))

  const ok = results.filter((r) => r.status === 'ok')
  const failed = results.filter((r) => r.status === 'error')

  console.log()
  console.log('─'.repeat(60))
  console.log(`  ${ok.length}/${results.length} endpoints OK\n`)

  for (const r of ok) {
    console.log(`  + ${r.endpoint.padEnd(22)} ${r.ms}ms`)
  }

  if (failed.length) {
    console.log()
    for (const r of failed) {
      console.log(`  - ${r.endpoint.padEnd(22)} ${r.ms}ms  ${r.error?.slice(0, 120)}`)
    }
  }

  console.log()
  console.log('Proxy stats:', client.getProxyStats())
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
