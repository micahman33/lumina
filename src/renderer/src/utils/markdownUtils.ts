/**
 * markdownUtils.ts
 *
 * Utilities for preprocessing markdown content before loading into the editor
 * and postprocessing before saving back to disk.
 *
 * The core concern: relative image paths in markdown (e.g. `src="build/icon.png"`
 * or `![icon](images/photo.jpg)`) cannot be resolved by the browser without an
 * explicit base. We convert them to `media://` absolute URLs when loading so they
 * render correctly via Electron's custom protocol handler, then restore the
 * original relative paths when saving so the file on disk is never corrupted.
 */

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Return the directory portion of an absolute file path (cross-platform). */
export function docDir(filePath: string): string {
  return filePath.replace(/\\/g, '/').split('/').slice(0, -1).join('/')
}

/** Convert an absolute OS path to a file:// URL. */
export function pathToFileUrl(absPath: string): string {
  const normalized = absPath.replace(/\\/g, '/')
  // On Windows paths start with a drive letter (C:/...), on Unix with /
  return normalized.startsWith('/') ? `file://${normalized}` : `file:///${normalized}`
}

/**
 * Convert an absolute OS path to a `media://` URL served by Electron's custom
 * protocol handler.  We use `media://` (not `file://`) for local images because
 * Electron's webSecurity blocks `file://` URLs in the renderer process.
 */
export function pathToMediaUrl(absPath: string): string {
  const normalized = absPath.replace(/\\/g, '/')
  // On Windows paths start with a drive letter (C:/...), on Unix with /
  return normalized.startsWith('/') ? `media://${normalized}` : `media:///${normalized}`
}

/** True if a src value is already an absolute URL that doesn't need resolving. */
function isAbsoluteUrl(src: string): boolean {
  return /^(https?:|data:|file:|media:|blob:|\/\/|\/)/i.test(src.trim())
}

/** Escape special regex characters in a literal string. */
function escRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ── Resolve (load-time) ───────────────────────────────────────────────────────

/**
 * Replace relative image sources in markdown content with absolute `media://`
 * URLs so the editor can load local images via Electron's custom protocol.
 *
 * Handles:
 *   - HTML img tags:      src="relative/path"
 *   - Markdown images:    ![alt](relative/path)  and  ![alt](relative/path "title")
 */
export function resolveRelativeImagePaths(content: string, filePath: string): string {
  const dir = docDir(filePath)
  if (!dir) return content

  const resolve = (src: string): string => {
    if (isAbsoluteUrl(src)) return src
    return pathToMediaUrl(`${dir}/${src}`)
  }

  // 1. HTML img tags — src="..." or src='...'
  let out = content.replace(
    /(<img\b[^>]*?\bsrc=)(["'])([^"']*?)\2/gi,
    (_, pre, quote, src) => `${pre}${quote}${resolve(src)}${quote}`
  )

  // 2. Markdown image syntax — ![alt](path) or ![alt](path "title")
  out = out.replace(
    /!\[([^\]]*)\]\(([^)\s"]+)((?:\s+"[^"]*")?)\)/g,
    (_, alt, src, title) => `![${alt}](${resolve(src)}${title})`
  )

  return out
}

// ── Unresolve (save-time) ─────────────────────────────────────────────────────

/**
 * Reverse of resolveRelativeImagePaths.  Strips the `media://…/docDir/` prefix
 * from image sources so the markdown written to disk contains the original
 * relative paths and remains portable.
 */
export function unresolveRelativeImagePaths(content: string, filePath: string): string {
  const dir = docDir(filePath)
  if (!dir) return content

  // Strip the media:// prefix we added on load so saved files use relative paths.
  const fileUrlPrefix = pathToMediaUrl(dir) + '/'
  const escapedPrefix = escRe(fileUrlPrefix)

  // HTML img tags
  let out = content.replace(
    new RegExp(`(<img\\b[^>]*?\\bsrc=)(["'])${escapedPrefix}([^"']*?)\\2`, 'gi'),
    (_, pre, quote, rel) => `${pre}${quote}${rel}${quote}`
  )

  // Markdown image syntax
  out = out.replace(
    new RegExp(`!\\[([^\\]]*)\\]\\(${escapedPrefix}([^)\\s"]+)((?:\\s+"[^"]*")?)\\)`, 'g'),
    (_, alt, rel, title) => `![${alt}](${rel}${title})`
  )

  return out
}
