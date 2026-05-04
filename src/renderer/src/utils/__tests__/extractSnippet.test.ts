import { describe, it, expect } from 'vitest'
import { extractSnippet } from '../txtUtils'

describe('extractSnippet', () => {
  describe('plain text mode (fileType = "txt")', () => {
    it('newlines → spaces, trimmed', () => {
      expect(extractSnippet('Hello\nWorld\nFoo', 'txt')).toBe('Hello World Foo')
    })

    it('multiple newlines → collapsed to single space each', () => {
      // /\n+/g replaces ANY run of newlines with a single space
      expect(extractSnippet('Line 1\n\nLine 2', 'txt')).toBe('Line 1 Line 2')
    })

    it('trims leading/trailing whitespace', () => {
      expect(extractSnippet('  Hello World  ', 'txt')).toBe('Hello World')
    })

    it('respects maxLen', () => {
      const long = 'a'.repeat(500)
      expect(extractSnippet(long, 'txt', 100)).toHaveLength(100)
    })

    it('empty string → empty string', () => {
      expect(extractSnippet('', 'txt')).toBe('')
    })
  })

  describe('markdown mode (fileType = "md", default)', () => {
    it('strips # headings', () => {
      expect(extractSnippet('# Hello\n## World', 'md')).toBe('Hello World')
    })

    it('strips **bold**', () => {
      expect(extractSnippet('This is **bold** text', 'md')).toBe('This is bold text')
    })

    it('strips *italic*', () => {
      expect(extractSnippet('This is *italic* text', 'md')).toBe('This is italic text')
    })

    it('strips backtick code', () => {
      expect(extractSnippet('Use `console.log` here', 'md')).toBe('Use  here')
    })

    it('strips [link](url)', () => {
      expect(extractSnippet('See [click here](https://example.com) for more', 'md')).toBe(
        'See click here for more'
      )
    })

    it('strips "- " bullets', () => {
      expect(extractSnippet('- Item 1\n- Item 2', 'md')).toBe('Item 1 Item 2')
    })

    it('strips "* " bullets', () => {
      expect(extractSnippet('* Item', 'md')).toBe('Item')
    })

    it('strips "+ " bullets', () => {
      expect(extractSnippet('+ Item', 'md')).toBe('Item')
    })

    it('strips "> " blockquotes', () => {
      expect(extractSnippet('> A quote', 'md')).toBe('A quote')
    })

    it('respects maxLen', () => {
      const content = 'Word '.repeat(100)
      expect(extractSnippet(content, 'md', 50)).toHaveLength(50)
    })

    it('empty string → empty string', () => {
      expect(extractSnippet('', 'md')).toBe('')
    })

    it('default fileType is md', () => {
      // Calling without fileType argument should behave like md
      expect(extractSnippet('# Title')).toBe('Title')
    })

    it('collapses multiple newlines to a single space', () => {
      // /\n+/g collapses any run of newlines into one space
      expect(extractSnippet('Para 1\n\nPara 2', 'md')).toBe('Para 1 Para 2')
    })
  })
})
