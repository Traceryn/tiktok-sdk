#!/usr/bin/env node
/**
 * Fetches fresh proxies from proxifly's CDN so you don't have to hunt for them.
 * Hits HTTP, SOCKS5, and anonymous endpoints, deduplicates by URL, then dumps
 * everything into scripts/.cache/ as both full metadata and plain URL lists.
 *
 * Usage: npm run script:proxies
 */

import { writeFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = resolve(__dirname, '..')

interface ProxyItem {
  url: string
  protocol: string
  anonymity: string
  country: string
  speed: number
  updated: string
}

/**
 * Grabs proxies from multiple proxifly endpoints and merges them.
 * Each source asks for a different protocol/anonymity combo so we get variety.
 *
 * @returns A deduplicated list of proxy objects (first occurrence wins)
 */
async function fetchProxiflyProxies(): Promise<ProxyItem[]> {
  const sources = [
    'https://proxifly.fun/api/proxy?protocol=http&anonymity=elite&limit=50',
    'https://proxifly.fun/api/proxy?protocol=socks5&anonymity=elite&limit=50',
    'https://proxifly.fun/api/proxy?protocol=http&anonymity=anonymous&limit=50',
  ]

  const all: ProxyItem[] = []
  for (const url of sources) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
      const data = await res.json()
      const items = Array.isArray(data) ? data : data?.proxies ?? []
      all.push(...items)
    } catch (err) {
      console.warn(`  Failed to fetch ${url}:`, (err as Error).message)
    }
  }

  const seen = new Set<string>()
  return all.filter((p) => {
    if (seen.has(p.url)) return false
    seen.add(p.url)
    return true
  })
}

async function main() {
  console.log('Fetching proxies from proxifly CDN...\n')
  const proxies = await fetchProxiflyProxies()
  console.log(`Fetched ${proxies.length} unique proxies\n`)

  const proxyUrls = proxies.map((p) => p.url)

  const outDir = resolve(ROOT, 'scripts', '.cache')
  existsSync(outDir) || (() => { writeFileSync(resolve(outDir, '.gitkeep'), ''); return true })()

  writeFileSync(resolve(ROOT, 'scripts', '.cache', 'proxies.json'), JSON.stringify(proxies, null, 2))
  writeFileSync(resolve(ROOT, 'scripts', '.cache', 'proxy-urls.json'), JSON.stringify(proxyUrls, null, 2))

  console.log('Saved:')
  console.log(`  scripts/.cache/proxies.json     — ${proxies.length} items with full metadata`)
  console.log(`  scripts/.cache/proxy-urls.json  — ${proxyUrls.length} URLs only\n`)

  const byCountry: Record<string, number> = {}
  const byProtocol: Record<string, number> = {}
  for (const p of proxies) {
    byCountry[p.country] = (byCountry[p.country] || 0) + 1
    byProtocol[p.protocol] = (byProtocol[p.protocol] || 0) + 1
  }

  console.log('By country:')
  for (const [c, n] of Object.entries(byCountry).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`  ${c}: ${n}`)
  }

  console.log('\nBy protocol:')
  for (const [p, n] of Object.entries(byProtocol).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${p}: ${n}`)
  }
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
