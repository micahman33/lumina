import { describe, it, expect } from 'vitest'
import {
  docDir,
  pathToFileUrl,
  pathToMediaUrl,
  normalizeAlignAttributes,
  resolveRelativeImagePaths,
  unresolveRelativeImagePaths,
} from '../markdownUtils'

// ── docDir ────────────────────────────────────────────────────────────────────

describe('docDir', () => {
  it('returns parent directory of a unix path', () => {
    expect(docDir('/Users/alice/docs/README.md')).toBe('/Users/alice/docs')
  })

  it('returns parent directory of a Windows path (normalised)', () => {
    expect(docDir('C:\\Users\\alice\\docs\\README.md')).toBe('C:/Users/alice/docs')
  })

  it('handles file in root directory', () => {
    expect(docDir('/README.md')).toBe('')
  })

  it('handles nested directories', () => {
    expect(docDir('/a/b/c/d/file.md')).toBe('/a/b/c/d')
  })
})

// ── pathToFileUrl ─────────────────────────────────────────────────────────────

describe('pathToFileUrl', () => {
  it('adds file:// prefix to unix paths', () => {
    expect(pathToFileUrl('/Users/alice/docs')).toBe('file:///Users/alice/docs')
  })

  it('adds file:/// prefix for Windows paths', () => {
    expect(pathToFileUrl('C:/Users/alice')).toBe('file:///C:/Users/alice')
  })

  it('normalises backslashes', () => {
    expect(pathToFileUrl('C:\\Users\\alice')).toBe('file:///C:/Users/alice')
  })
})

// ── pathToMediaUrl ────────────────────────────────────────────────────────────

describe('pathToMediaUrl', () => {
  it('adds media://local/ prefix to unix paths', () => {
    expect(pathToMediaUrl('/Users/alice/docs')).toBe('media://local/Users/alice/docs')
  })

  it('adds media://local/ prefix for Windows paths', () => {
    expect(pathToMediaUrl('C:/Users/alice')).toBe('media://local/C:/Users/alice')
  })

  it('normalises backslashes', () => {
    expect(pathToMediaUrl('C:\\Users\\alice')).toBe('media://local/C:/Users/alice')
  })
})

// ── normalizeAlignAttributes ──────────────────────────────────────────────────

describe('normalizeAlignAttributes', () => {
  it('converts p align=center to inline style', () => {
    expect(normalizeAlignAttributes('<p align="center">text</p>'))
      .toBe('<p style="text-align:center">text</p>')
  })

  it('converts h1 align=center to inline style', () => {
    expect(normalizeAlignAttributes('<h1 align="center">Title</h1>'))
      .toBe('<h1 style="text-align:center">Title</h1>')
  })

  it('handles left and right alignments', () => {
    expect(normalizeAlignAttributes('<p align="right">text</p>'))
      .toBe('<p style="text-align:right">text</p>')
    expect(normalizeAlignAttributes('<p align="left">text</p>'))
      .toBe('<p style="text-align:left">text</p>')
  })

  it('preserves other attributes on the element', () => {
    const input = '<p class="foo" align="center" id="bar">text</p>'
    const result = normalizeAlignAttributes(input)
    expect(result).toContain('style="text-align:center"')
    expect(result).toContain('class="foo"')
    expect(result).toContain('id="bar"')
    expect(result).not.toContain('align=')
  })

  it('is a no-op when no align attribute present', () => {
    const input = '<p style="text-align:center">already styled</p>'
    expect(normalizeAlignAttributes(input)).toBe(input)
  })

  it('handles multiple aligned elements', () => {
    const input = '<p align="center">first</p>\n<p align="center">second</p>'
    const result = normalizeAlignAttributes(input)
    expect(result).toBe('<p style="text-align:center">first</p>\n<p style="text-align:center">second</p>')
  })

  it('is case-insensitive on the align value', () => {
    expect(normalizeAlignAttributes('<p align="CENTER">text</p>'))
      .toBe('<p style="text-align:CENTER">text</p>')
  })
})

// ── resolveRelativeImagePaths ─────────────────────────────────────────────────

describe('resolveRelativeImagePaths', () => {
  const docPath = '/Users/alice/project/README.md'
  const base = 'media://local/Users/alice/project'

  it('resolves relative src in HTML img tag', () => {
    const input = '<img src="build/icon.png" alt="icon" />'
    const result = resolveRelativeImagePaths(input, docPath)
    expect(result).toBe(`<img src="${base}/build/icon.png" alt="icon" />`)
  })

  it('does not modify absolute https:// URLs', () => {
    const input = '<img src="https://example.com/img.png" />'
    expect(resolveRelativeImagePaths(input, docPath)).toBe(input)
  })

  it('does not modify data: URLs', () => {
    const input = '<img src="data:image/png;base64,abc" />'
    expect(resolveRelativeImagePaths(input, docPath)).toBe(input)
  })

  it('does not modify existing file:// URLs', () => {
    const input = '<img src="file:///absolute/path.png" />'
    expect(resolveRelativeImagePaths(input, docPath)).toBe(input)
  })

  it('does not modify existing media:// URLs', () => {
    const input = '<img src="media://local/absolute/path.png" />'
    expect(resolveRelativeImagePaths(input, docPath)).toBe(input)
  })

  it('resolves relative path in markdown image syntax', () => {
    const input = '![logo](images/logo.png)'
    const result = resolveRelativeImagePaths(input, docPath)
    expect(result).toBe(`![logo](${base}/images/logo.png)`)
  })

  it('preserves title in markdown image syntax', () => {
    const input = '![logo](images/logo.png "App Logo")'
    const result = resolveRelativeImagePaths(input, docPath)
    expect(result).toBe(`![logo](${base}/images/logo.png "App Logo")`)
  })

  it('does not modify absolute URL in markdown syntax', () => {
    const input = '![badge](https://shields.io/badge/foo-bar)'
    expect(resolveRelativeImagePaths(input, docPath)).toBe(input)
  })

  it('handles multiple img tags in one paragraph', () => {
    const input = [
      '<p align="center">',
      '  <img src="build/icon.png" width="96" />',
      '  <img src="https://shields.io/badge/v1" />',
      '</p>',
    ].join('\n')
    const result = resolveRelativeImagePaths(input, docPath)
    expect(result).toContain(`${base}/build/icon.png`)
    // Absolute URL unchanged
    expect(result).toContain('https://shields.io/badge/v1')
  })

  it('handles single-quoted src attributes', () => {
    const input = "<img src='assets/photo.jpg' />"
    const result = resolveRelativeImagePaths(input, docPath)
    expect(result).toContain(`${base}/assets/photo.jpg`)
  })

  it('is a no-op for content with no images', () => {
    const input = '# Hello\n\nNo images here.'
    expect(resolveRelativeImagePaths(input, docPath)).toBe(input)
  })

  it('handles root-level relative path', () => {
    const input = '<img src="icon.png" />'
    const result = resolveRelativeImagePaths(input, docPath)
    expect(result).toBe(`<img src="${base}/icon.png" />`)
  })
})

// ── unresolveRelativeImagePaths ───────────────────────────────────────────────

describe('unresolveRelativeImagePaths', () => {
  const docPath = '/Users/alice/project/README.md'
  const base = 'media://local/Users/alice/project'

  it('strips file:// prefix from HTML img src', () => {
    const input = `<img src="${base}/build/icon.png" alt="icon" />`
    const result = unresolveRelativeImagePaths(input, docPath)
    expect(result).toBe('<img src="build/icon.png" alt="icon" />')
  })

  it('strips file:// prefix from markdown image syntax', () => {
    const input = `![logo](${base}/images/logo.png)`
    const result = unresolveRelativeImagePaths(input, docPath)
    expect(result).toBe('![logo](images/logo.png)')
  })

  it('does not modify https:// URLs', () => {
    const input = '<img src="https://shields.io/badge/v1" />'
    expect(unresolveRelativeImagePaths(input, docPath)).toBe(input)
  })

  it('does not modify src that belongs to a different directory', () => {
    const input = '<img src="file:///other/path/image.png" />'
    expect(unresolveRelativeImagePaths(input, docPath)).toBe(input)
  })

  it('is a no-op for content with no file:// images', () => {
    const input = '# Just text\n\n![remote](https://example.com/a.png)'
    expect(unresolveRelativeImagePaths(input, docPath)).toBe(input)
  })

  // Round-trip: resolve then unresolve should return original content
  it('round-trips correctly for HTML img tags', () => {
    const original = '<img src="build/icon.png" width="96" alt="Lumina icon" />'
    const resolved = resolveRelativeImagePaths(original, docPath)
    const restored = unresolveRelativeImagePaths(resolved, docPath)
    expect(restored).toBe(original)
  })

  it('round-trips correctly for markdown image syntax', () => {
    const original = '![logo](assets/logo.png)'
    const resolved = resolveRelativeImagePaths(original, docPath)
    const restored = unresolveRelativeImagePaths(resolved, docPath)
    expect(restored).toBe(original)
  })

  it('round-trips correctly for mixed content', () => {
    const original = [
      '<p>',
      '  <img src="build/icon.png" width="96" />',
      '  <img src="https://shields.io/badge" />',
      '</p>',
      '',
      '![local](images/photo.jpg)',
      '![remote](https://example.com/img.png)',
    ].join('\n')
    const resolved = resolveRelativeImagePaths(original, docPath)
    const restored = unresolveRelativeImagePaths(resolved, docPath)
    expect(restored).toBe(original)
  })
})
