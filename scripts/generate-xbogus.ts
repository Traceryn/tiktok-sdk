#!/usr/bin/env node
/**
 * Tests X-Bogus signature generation across a handful of real TikTok API URLs
 * and user-agent combos. Useful for verifying the signing algorithm still works
 * after updates, or for grabbing a fresh signature to use in curl tests.
 *
 * Usage: npm run script:xbogus
 */

import { sign, signUrl } from '../lib/core/Signer.js'

function main() {
  console.log('X-Bogus Signature Generator\n')

  const testUrls = [
    'https://www.tiktok.com/api/item/detail/?aid=1988&itemId=7109169345133268226',
    'https://www.tiktok.com/api/challenge/detail/?aid=1988&challengeName=fyp',
    'https://www.tiktok.com/api/search/user/full/?aid=1988&keyword=tiktok&cursor=0&count=20',
  ]

  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
  ]

  for (const url of testUrls) {
    console.log('─'.repeat(70))
    console.log(`URL: ${url}`)

    for (const ua of userAgents) {
      try {
        const signed = signUrl(url, ua)
        const bogusMatch = signed.match(/X-Bogus=([^&]+)/)
        const bogus = bogusMatch ? bogusMatch[1] : 'N/A'
        const uaShort = ua.includes('Windows') ? 'Windows Chrome' : 'Mac Chrome'
        console.log(`  ${uaShort.padEnd(16)} → X-Bogus: ${bogus}`)
      } catch (err) {
        console.error(`  ${ua.slice(0, 30)}... → ERROR: ${(err as Error).message}`)
      }
    }
  }

  console.log()
  console.log('─'.repeat(70))

  const query = 'aid=1988&app_language=en&app_name=tiktok_web&browser_language=en&browser_name=Mozilla&browser_online=true'
  const ua = userAgents[0]
  try {
    const bogus = sign(query, ua)
    console.log(`\nRaw sign("${query.slice(0, 40)}...", ua) → ${bogus}`)
  } catch (err) {
    console.error(`\nRaw sign failed: ${(err as Error).message}`)
  }

  console.log('\nDone.')
}

main()
