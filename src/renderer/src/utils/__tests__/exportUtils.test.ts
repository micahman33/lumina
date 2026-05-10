import { describe, it, expect } from 'vitest'
import { buildHtmlExport, getExportTitle, EXPORT_STYLES } from '../exportUtils'

// ── buildHtmlExport ────────────────────────────────────────────────────────────

describe('buildHtmlExport', () => {
  it('contains DOCTYPE declaration', () => {
    const html = buildHtmlExport('Test', '<p>body</p>', 'body {}')
    expect(html).toContain('<!DOCTYPE html>')
  })

  it('contains the <html> element', () => {
    const html = buildHtmlExport('Test', '<p>body</p>', '')
    expect(html).toContain('<html')
  })

  it('contains <head> element', () => {
    const html = buildHtmlExport('Test', '<p>body</p>', '')
    expect(html).toContain('<head>')
  })

  it('contains <body> element', () => {
    const html = buildHtmlExport('Test', '<p>body</p>', '')
    expect(html).toContain('<body>')
  })

  it('embeds the title in a <title> tag', () => {
    const html = buildHtmlExport('My Document', '<p>content</p>', '')
    expect(html).toContain('<title>My Document</title>')
  })

  it('embeds the body HTML inside article.prose', () => {
    const body = '<h1>Hello</h1><p>World</p>'
    const html = buildHtmlExport('T', body, '')
    expect(html).toContain(body)
    expect(html).toContain('class="prose"')
  })

  it('embeds the styles inside a <style> tag', () => {
    const styles = 'body { color: red; }'
    const html = buildHtmlExport('T', '<p/>', styles)
    expect(html).toContain('<style>')
    expect(html).toContain(styles)
  })

  it('escapes < in the title to avoid XSS in attribute', () => {
    const html = buildHtmlExport('<script>', '<p/>', '')
    expect(html).not.toContain('<title><script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('produces well-formed HTML with closing tags', () => {
    const html = buildHtmlExport('T', '<p>x</p>', '')
    expect(html).toContain('</html>')
    expect(html).toContain('</head>')
    expect(html).toContain('</body>')
  })

  it('uses EXPORT_STYLES when passed as the styles argument', () => {
    const html = buildHtmlExport('Doc', '<p>hi</p>', EXPORT_STYLES)
    expect(html).toContain(EXPORT_STYLES)
  })
})

// ── getExportTitle ─────────────────────────────────────────────────────────────

describe('getExportTitle', () => {
  it('extracts filename without extension from a unix path', () => {
    expect(getExportTitle('/Users/alice/docs/README.md')).toBe('README')
  })

  it('extracts filename without extension from a Windows-style path', () => {
    expect(getExportTitle('C:/Users/bob/notes.txt')).toBe('notes')
  })

  it('returns "Untitled" for null', () => {
    expect(getExportTitle(null)).toBe('Untitled')
  })

  it('strips only the last dot for filenames with multiple dots', () => {
    expect(getExportTitle('/path/my.notes.md')).toBe('my.notes')
  })

  it('returns the filename as-is when there is no extension', () => {
    expect(getExportTitle('/usr/local/Makefile')).toBe('Makefile')
  })

  it('handles a Windows backslash path by normalising slashes', () => {
    expect(getExportTitle('C:\\Users\\bob\\notes.md')).toBe('notes')
  })

  it('returns just the filename without any directory prefix', () => {
    const title = getExportTitle('/very/deep/nested/dir/document.md')
    expect(title).toBe('document')
    expect(title).not.toContain('/')
  })
})

// ── EXPORT_STYLES ─────────────────────────────────────────────────────────────

describe('EXPORT_STYLES', () => {
  it('is a non-empty string', () => {
    expect(typeof EXPORT_STYLES).toBe('string')
    expect(EXPORT_STYLES.length).toBeGreaterThan(0)
  })

  it('contains a font-family declaration for system-ui', () => {
    expect(EXPORT_STYLES).toContain('system-ui')
  })

  it('limits content width with max-width around 760px', () => {
    expect(EXPORT_STYLES).toContain('760px')
  })
})
