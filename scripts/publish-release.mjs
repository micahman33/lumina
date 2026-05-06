/**
 * publish-release.mjs
 *
 * Uploads the built installers for the current version to the matching
 * GitHub release using the `gh` CLI (no personal access token needed).
 *
 * Usage:
 *   node scripts/publish-release.mjs          # uploads all platforms found
 *   node scripts/publish-release.mjs --mac    # macOS only
 *   node scripts/publish-release.mjs --win    # Windows only
 *
 * Requires:
 *   - `gh` CLI installed and authenticated (`gh auth status`)
 *   - Installers already built in dist/ (`npm run build:mac` / `build:win`)
 */

import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const v = pkg.version
const tag = `v${v}`

const args = process.argv.slice(2)
const macOnly = args.includes('--mac')
const winOnly = args.includes('--win')

const MAC_FILES = [
  `dist/Lumina-${v}-arm64.dmg`,
  `dist/Lumina-${v}-arm64-mac.zip`,
  `dist/latest-mac.yml`,
]

const WIN_FILES = [
  `dist/Lumina Setup ${v}.exe`,
  `dist/latest.yml`,
]

// Decide which files to upload
let candidates = []
if (macOnly)      candidates = MAC_FILES
else if (winOnly) candidates = WIN_FILES
else              candidates = [...MAC_FILES, ...WIN_FILES]

// Filter to only files that actually exist
const files = candidates.filter((f) => {
  const abs = join(root, f)
  if (!existsSync(abs)) {
    console.warn(`  ⚠  Not found, skipping: ${f}`)
    return false
  }
  return true
})

if (files.length === 0) {
  console.error(`✗ No installer files found for v${v}. Run npm run build:mac / build:win first.`)
  process.exit(1)
}

// Check whether the release already exists
let releaseExists = false
try {
  execSync(`gh release view ${tag} --repo micahman33/lumina`, { stdio: 'pipe' })
  releaseExists = true
} catch {
  releaseExists = false
}

const fileArgs = files.map((f) => `"${f}"`).join(' ')

if (releaseExists) {
  console.log(`Uploading ${files.length} file(s) to existing release ${tag}…`)
  execSync(
    `gh release upload ${tag} ${fileArgs} --clobber --repo micahman33/lumina`,
    { stdio: 'inherit', cwd: root }
  )
} else {
  console.log(`Creating release ${tag} and uploading ${files.length} file(s)…`)
  execSync(
    `gh release create ${tag} ${fileArgs} --title "Lumina ${tag}" --generate-notes --repo micahman33/lumina`,
    { stdio: 'inherit', cwd: root }
  )
}

console.log(`\n✓ Done — https://github.com/micahman33/lumina/releases/tag/${tag}`)
