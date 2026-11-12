import { describe, it, expect } from 'vitest'
import { detectFileType, viewKindFor } from '../txtUtils'

describe('detectFileType', () => {
  it('null → "md"', () => {
    expect(detectFileType(null)).toBe('md')
  })

  it('.md → "md"', () => {
    expect(detectFileType('document.md')).toBe('md')
  })

  it('.markdown → "md"', () => {
    expect(detectFileType('notes.markdown')).toBe('md')
  })

  it('.txt → "txt"', () => {
    expect(detectFileType('readme.txt')).toBe('txt')
  })

  it('.TXT uppercase → "txt"', () => {
    expect(detectFileType('readme.TXT')).toBe('txt')
  })

  it('.Txt mixed case → "txt"', () => {
    expect(detectFileType('readme.Txt')).toBe('txt')
  })

  it('maps data and other text files', () => {
    expect(detectFileType('/a/data.JSON')).toBe('json')
    expect(detectFileType('/a/feed.xml')).toBe('xml')
    expect(detectFileType('/a/icon.svg')).toBe('xml')
    expect(detectFileType('/a/export.csv')).toBe('csv')
    expect(detectFileType('/a/export.tsv')).toBe('csv')
    expect(detectFileType('/a/server.log')).toBe('text')
    expect(detectFileType('/a/config.yaml')).toBe('text')
    expect(detectFileType('/a.b/Makefile')).toBe('text')
    expect(detectFileType('/a/.gitignore')).toBe('text')
  })

  it('picks the right view', () => {
    expect(viewKindFor('md')).toBe('rich')
    expect(viewKindFor('txt')).toBe('rich')
    expect(viewKindFor('json')).toBe('code')
    expect(viewKindFor('text')).toBe('code')
    expect(viewKindFor('csv')).toBe('table')
    expect(viewKindFor('csv', true)).toBe('code')
  })

  it('no extension → "text"', () => {
    expect(detectFileType('README')).toBe('text')
  })

  it('/path/to/file.txt → "txt"', () => {
    expect(detectFileType('/Users/micah/Documents/notes.txt')).toBe('txt')
  })

  it('C:\\Users\\file.md (Windows path) → "md"', () => {
    expect(detectFileType('C:\\Users\\file.md')).toBe('md')
  })

  it('file with multiple dots: my.notes.txt → "txt"', () => {
    expect(detectFileType('my.notes.txt')).toBe('txt')
  })

  it('file with multiple dots: my.notes.md → "md"', () => {
    expect(detectFileType('my.notes.md')).toBe('md')
  })

  it('empty string → "md"', () => {
    // An empty string has no extension, so should fall through to default
    expect(detectFileType('')).toBe('md')
  })
})
