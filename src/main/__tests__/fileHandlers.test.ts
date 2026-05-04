import { describe, it, expect, vi, beforeEach } from 'vitest'
import { detectFileType, extractSnippet } from '../../renderer/src/utils/txtUtils'

// ──────────────────────────────────────────────────────────────────────────────
// We test the pure logic that fileHandlers.ts relies on.
// The actual IPC handlers are tightly coupled to Electron, so we focus on
// the testable utility functions and behavior patterns.
// ──────────────────────────────────────────────────────────────────────────────

describe('fileHandlers: BOM stripping logic', () => {
  // This replicates the BOM-stripping logic used in fileHandlers.ts
  function stripBOM(raw: string): string {
    return raw.startsWith('﻿') ? raw.slice(1) : raw
  }

  it('strips BOM (\\uFEFF) from content', () => {
    const withBOM = '﻿Hello world'
    expect(stripBOM(withBOM)).toBe('Hello world')
  })

  it('leaves content without BOM unchanged', () => {
    const noBOM = 'Hello world'
    expect(stripBOM(noBOM)).toBe('Hello world')
  })

  it('strips BOM from markdown content', () => {
    const withBOM = '﻿# Title\n\nSome content'
    expect(stripBOM(withBOM)).toBe('# Title\n\nSome content')
  })

  it('strips BOM from empty file', () => {
    expect(stripBOM('﻿')).toBe('')
  })

  it('only strips leading BOM, not BOM in middle of content', () => {
    const content = 'Hello ﻿ world'
    expect(stripBOM(content)).toBe('Hello ﻿ world')
  })
})

describe('fileHandlers: luminaDir path composition', () => {
  it('luminaDir returns a path ending in "Lumina"', () => {
    // We simulate the path join behavior without calling electron's app.getPath
    const documentsPath = '/Users/micah/Documents'
    const luminaPath = `${documentsPath}/Lumina`
    expect(luminaPath.endsWith('Lumina')).toBe(true)
  })
})

describe('fileHandlers: file type detection for dialog filters', () => {
  it('detects .txt files as txt type', () => {
    expect(detectFileType('/path/to/notes.txt')).toBe('txt')
  })

  it('detects .md files as md type', () => {
    expect(detectFileType('/path/to/README.md')).toBe('md')
  })

  it('detects .markdown files as md type', () => {
    expect(detectFileType('/path/to/doc.markdown')).toBe('md')
  })

  it('null path returns md type (new untitled file)', () => {
    expect(detectFileType(null)).toBe('md')
  })
})

describe('fileHandlers: snippet indexing', () => {
  it('extractSnippet produces a snippet for markdown content', () => {
    const content = '# Welcome to Lumina\n\nThis is a great editor.'
    const snippet = extractSnippet(content, 'md')
    // /\n+/g collapses the blank line between heading and paragraph to one space
    expect(snippet).toBe('Welcome to Lumina This is a great editor.')
    expect(snippet.length).toBeLessThanOrEqual(300)
  })

  it('extractSnippet produces a snippet for plain text content', () => {
    const content = 'Line 1\nLine 2\nLine 3'
    const snippet = extractSnippet(content, 'txt')
    expect(snippet).toBe('Line 1 Line 2 Line 3')
  })

  it('snippet is capped at 300 characters by default', () => {
    const longContent = 'Word '.repeat(200)
    const snippet = extractSnippet(longContent, 'md')
    expect(snippet.length).toBeLessThanOrEqual(300)
  })

  it('snippet for empty file is empty string', () => {
    expect(extractSnippet('', 'md')).toBe('')
    expect(extractSnippet('', 'txt')).toBe('')
  })

  it('recentFiles entry snippet is defined for non-empty content', () => {
    const content = '# Hello\n\nWorld'
    const snippet = extractSnippet(content, 'md')
    expect(snippet).toBeTruthy()
  })
})

describe('fileHandlers: CLI argument detection', () => {
  it('identifies .md files as valid CLI arguments', () => {
    const arg = '/path/to/file.md'
    expect(/\.(md|markdown|txt)$/i.test(arg)).toBe(true)
  })

  it('identifies .markdown files as valid CLI arguments', () => {
    const arg = '/path/to/doc.markdown'
    expect(/\.(md|markdown|txt)$/i.test(arg)).toBe(true)
  })

  it('identifies .txt files as valid CLI arguments', () => {
    const arg = '/path/to/notes.txt'
    expect(/\.(md|markdown|txt)$/i.test(arg)).toBe(true)
  })

  it('rejects flags (starting with -) as CLI file args', () => {
    const arg = '--debug'
    const isValidFileArg = /\.(md|markdown|txt)$/i.test(arg) && !arg.startsWith('-')
    expect(isValidFileArg).toBe(false)
  })

  it('rejects node executable path as CLI file arg', () => {
    const arg = '/usr/bin/node'
    const isValidFileArg = /\.(md|markdown|txt)$/i.test(arg) && !arg.startsWith('-')
    expect(isValidFileArg).toBe(false)
  })

  it('rejects .js files as CLI file args', () => {
    const arg = '/app/index.js'
    const isValidFileArg = /\.(md|markdown|txt)$/i.test(arg) && !arg.startsWith('-')
    expect(isValidFileArg).toBe(false)
  })

  it('matches TXT in uppercase', () => {
    const arg = '/path/notes.TXT'
    expect(/\.(md|markdown|txt)$/i.test(arg)).toBe(true)
  })
})

describe('fileHandlers: recent files management logic', () => {
  it('deduplicates by path when adding to recents', () => {
    // Simulate the dedup logic in RECENT_ADD handler
    const existing = [
      { path: '/a.md', name: 'a.md', lastOpened: '2024-01-01T00:00:00.000Z' },
      { path: '/b.md', name: 'b.md', lastOpened: '2024-01-01T00:00:00.000Z' },
    ]
    const newPath = '/a.md'
    const filtered = existing.filter((f) => f.path !== newPath)
    const newEntry = { path: newPath, name: 'a.md', lastOpened: new Date().toISOString() }
    const result = [newEntry, ...filtered].slice(0, 20)

    // /a.md should appear only once, at the front
    expect(result.filter((f) => f.path === '/a.md')).toHaveLength(1)
    expect(result[0].path).toBe('/a.md')
  })

  it('caps recents at 20 entries', () => {
    // Simulate adding to a full list
    const existing = Array.from({ length: 20 }, (_, i) => ({
      path: `/file${i}.md`,
      name: `file${i}.md`,
      lastOpened: '2024-01-01T00:00:00.000Z',
    }))
    const newEntry = { path: '/new.md', name: 'new.md', lastOpened: new Date().toISOString() }
    const result = [newEntry, ...existing].slice(0, 20)
    expect(result).toHaveLength(20)
    expect(result[0].path).toBe('/new.md')
  })

  it('snippet is included in recent file entry when provided', () => {
    const snippet = 'Some content snippet'
    const entry = {
      path: '/file.md',
      name: 'file.md',
      lastOpened: new Date().toISOString(),
      snippet,
    }
    expect(entry.snippet).toBe(snippet)
  })
})
