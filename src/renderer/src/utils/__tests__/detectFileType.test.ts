import { describe, it, expect } from 'vitest'
import { detectFileType } from '../txtUtils'

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

  it('no extension → "md"', () => {
    expect(detectFileType('README')).toBe('md')
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
