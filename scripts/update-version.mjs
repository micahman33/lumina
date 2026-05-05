/**
 * update-version.mjs
 *
 * Called automatically by `npm version` (via the "version" lifecycle hook).
 * Reads the new version from package.json and rewrites all version references
 * in README.md so download links and installer filenames stay in sync.
 *
 * Patterns updated:
 *   - /releases/download/vX.Y.Z/         (URL path)
 *   - Lumina-X.Y.Z-arm64.dmg            (macOS filename in link + URL)
 *   - Lumina.Setup.X.Y.Z.exe            (Windows filename in URL, dot-separated)
 *   - Lumina Setup X.Y.Z.exe            (Windows filename in display text, space-separated)
 */

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const v = pkg.version

let readme = readFileSync(join(root, 'README.md'), 'utf8')

const SEM = /\d+\.\d+\.\d+/g

// 1. Release download path: /releases/download/vX.Y.Z/
readme = readme.replace(/\/releases\/download\/v\d+\.\d+\.\d+\//g, `/releases/download/v${v}/`)

// 2. macOS DMG filename: Lumina-X.Y.Z-arm64.dmg
readme = readme.replace(/Lumina-\d+\.\d+\.\d+(-arm64\.dmg)/g, `Lumina-${v}$1`)

// 3. Windows installer URL form: Lumina.Setup.X.Y.Z.exe
readme = readme.replace(/Lumina\.Setup\.\d+\.\d+\.\d+\.exe/g, `Lumina.Setup.${v}.exe`)

// 4. Windows installer display form: Lumina Setup X.Y.Z.exe
readme = readme.replace(/Lumina Setup \d+\.\d+\.\d+\.exe/g, `Lumina Setup ${v}.exe`)

writeFileSync(join(root, 'README.md'), readme)

console.log(`✓ README.md updated to v${v}`)
