#!/usr/bin/env node
/**
 * Bumps the package version in package.json by one major, minor, or patch step.
 * Doesn't touch git tags or commits — just updates the file and prints the diff.
 *
 * Usage: npm run script:bump [major|minor|patch]
 * Example: npm run script:bump minor   →  1.0.0 → 1.1.0
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = resolve(__dirname, '..')

/**
 * Reads and parses a JSON file from disk.
 *
 * @param path - Absolute path to the JSON file
 * @returns The parsed object
 */
function readJson(path: string): Record<string, any> {
  return JSON.parse(readFileSync(path, 'utf-8'))
}

/**
 * Stringifies and writes an object back to a JSON file.
 *
 * @param path - Absolute path to write to
 * @param data - The data to serialize
 */
function writeJson(path: string, data: Record<string, any>): void {
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n')
}

/**
 * Splits "1.2.3" into [1, 2, 3] and validates it.
 *
 * @param v - A semver string
 * @returns A 3-number tuple
 */
function parseVersion(v: string): [number, number, number] {
  const parts = v.split('.').map(Number)
  if (parts.length !== 3 || parts.some(isNaN)) throw new Error(`Invalid version: ${v}`)
  return parts as [number, number, number]
}

/**
 * Joins a tuple back into a "1.2.3" string.
 *
 * @param v - Version tuple
 * @returns Semver string
 */
function formatVersion(v: [number, number, number]): string {
  return v.join('.')
}

/**
 * Increments the version based on the bump type.
 * Major → bump + reset minors/patches. Minor → bump + reset patches. Patch → bump.
 *
 * @param v - Current version tuple
 * @param type - What to bump
 * @returns The new version tuple
 */
function bumpVersion(v: [number, number, number], type: 'major' | 'minor' | 'patch'): [number, number, number] {
  switch (type) {
    case 'major': return [v[0] + 1, 0, 0]
    case 'minor': return [v[0], v[1] + 1, 0]
    case 'patch': return [v[0], v[1], v[2] + 1]
  }
}

function main() {
  const args = process.argv.slice(2)
  const type = (args[0] as 'major' | 'minor' | 'patch') || 'patch'
  if (!['major', 'minor', 'patch'].includes(type)) {
    console.error('Usage: tsx scripts/bump-version.ts [major|minor|patch]')
    process.exit(1)
  }

  const pkgPath = resolve(ROOT, 'package.json')
  const pkg = readJson(pkgPath)
  const current = parseVersion(pkg.version)
  const next = bumpVersion(current, type)

  pkg.version = formatVersion(next)
  writeJson(pkgPath, pkg)

  console.log(`  ${formatVersion(current)} → ${formatVersion(next)}  (${type})`)
  console.log(`  Updated package.json`)
}

main()
