import { describe, it, expect } from 'vitest'
import type { RecentFile } from '../../../types/file'

// ── Pure helpers extracted from Sidebar ──────────────────────────────────

function relativeTime(iso: string, now: number): string {
  const diff = now - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 2) return 'Edited just now'
  if (m < 60) return `${m} minutes ago`
  const h = Math.floor(m / 60)
  if (h < 24) return h === 1 ? '1 hour ago' : `${h} hours ago`
  const d = Math.floor(h / 24)
  if (d === 1) return 'Yesterday'
  if (d < 7) return `${d} days ago`
  return 'Last week'
}

function sortByPin(files: RecentFile[]): RecentFile[] {
  return [...files].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return 0
  })
}

function filterFiles(files: RecentFile[], q: string): RecentFile[] {
  const query = q.trim().toLowerCase()
  if (!query) return files
  return files.filter(
    (f) =>
      f.name.toLowerCase().includes(query) ||
      (f.snippet ?? '').toLowerCase().includes(query)
  )
}

function makeFile(overrides: Partial<RecentFile> & { path: string; name: string }): RecentFile {
  return {
    lastOpened: new Date().toISOString(),
    ...overrides,
  }
}

// ── relativeTime ──────────────────────────────────────────────────────────

describe('relativeTime', () => {
  const now = new Date('2024-01-15T12:00:00Z').getTime()

  it('shows "just now" within 2 minutes', () => {
    const iso = new Date(now - 30_000).toISOString()
    expect(relativeTime(iso, now)).toBe('Edited just now')
  })

  it('shows minutes ago for recent edits', () => {
    const iso = new Date(now - 5 * 60_000).toISOString()
    expect(relativeTime(iso, now)).toBe('5 minutes ago')
  })

  it('shows "1 hour ago" singular', () => {
    const iso = new Date(now - 60 * 60_000).toISOString()
    expect(relativeTime(iso, now)).toBe('1 hour ago')
  })

  it('shows plural hours', () => {
    const iso = new Date(now - 3 * 60 * 60_000).toISOString()
    expect(relativeTime(iso, now)).toBe('3 hours ago')
  })

  it('shows "Yesterday" for 1 day ago', () => {
    const iso = new Date(now - 24 * 60 * 60_000).toISOString()
    expect(relativeTime(iso, now)).toBe('Yesterday')
  })

  it('shows days ago for 2-6 days', () => {
    const iso = new Date(now - 4 * 24 * 60 * 60_000).toISOString()
    expect(relativeTime(iso, now)).toBe('4 days ago')
  })

  it('shows "Last week" for 7+ days ago', () => {
    const iso = new Date(now - 10 * 24 * 60 * 60_000).toISOString()
    expect(relativeTime(iso, now)).toBe('Last week')
  })
})

// ── sortByPin ─────────────────────────────────────────────────────────────

describe('sortByPin', () => {
  it('pinned files appear before unpinned', () => {
    const files = [
      makeFile({ path: '/a.md', name: 'a.md' }),
      makeFile({ path: '/b.md', name: 'b.md', pinned: true }),
      makeFile({ path: '/c.md', name: 'c.md' }),
    ]
    const sorted = sortByPin(files)
    expect(sorted[0].name).toBe('b.md')
    expect(sorted[1].name).toBe('a.md')
    expect(sorted[2].name).toBe('c.md')
  })

  it('multiple pinned files maintain relative order', () => {
    const files = [
      makeFile({ path: '/a.md', name: 'a.md', pinned: true }),
      makeFile({ path: '/b.md', name: 'b.md' }),
      makeFile({ path: '/c.md', name: 'c.md', pinned: true }),
    ]
    const sorted = sortByPin(files)
    expect(sorted[0].name).toBe('a.md')
    expect(sorted[1].name).toBe('c.md')
    expect(sorted[2].name).toBe('b.md')
  })

  it('all unpinned — order unchanged', () => {
    const files = [
      makeFile({ path: '/a.md', name: 'a.md' }),
      makeFile({ path: '/b.md', name: 'b.md' }),
    ]
    const sorted = sortByPin(files)
    expect(sorted[0].name).toBe('a.md')
    expect(sorted[1].name).toBe('b.md')
  })

  it('all pinned — order unchanged', () => {
    const files = [
      makeFile({ path: '/a.md', name: 'a.md', pinned: true }),
      makeFile({ path: '/b.md', name: 'b.md', pinned: true }),
    ]
    const sorted = sortByPin(files)
    expect(sorted[0].name).toBe('a.md')
    expect(sorted[1].name).toBe('b.md')
  })

  it('does not mutate the original array', () => {
    const files = [
      makeFile({ path: '/a.md', name: 'a.md' }),
      makeFile({ path: '/b.md', name: 'b.md', pinned: true }),
    ]
    sortByPin(files)
    expect(files[0].name).toBe('a.md') // original unchanged
  })

  it('empty array returns empty', () => {
    expect(sortByPin([])).toEqual([])
  })
})

// ── filterFiles ───────────────────────────────────────────────────────────

describe('filterFiles', () => {
  const files: RecentFile[] = [
    makeFile({ path: '/notes.md', name: 'notes.md', snippet: 'meeting notes for Q1' }),
    makeFile({ path: '/todo.md', name: 'todo.md', snippet: 'buy groceries and milk' }),
    makeFile({ path: '/readme.md', name: 'readme.md', snippet: 'project documentation' }),
  ]

  it('empty query returns all files', () => {
    expect(filterFiles(files, '')).toHaveLength(3)
  })

  it('whitespace-only query returns all files', () => {
    expect(filterFiles(files, '   ')).toHaveLength(3)
  })

  it('matches by filename (case-insensitive)', () => {
    const result = filterFiles(files, 'NOTE')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('notes.md')
  })

  it('matches by snippet content', () => {
    const result = filterFiles(files, 'groceries')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('todo.md')
  })

  it('returns multiple matches across different files', () => {
    // 'notes.md' name contains 'md', and all files end in .md
    // Use 'doc' — matches readme snippet AND notes filename has no 'doc'
    // Better: use 'o' — matches todo.md (name) and notes snippet ('for', 'Q1'... no)
    // Simplest: add a targeted fixture
    const multiFiles: RecentFile[] = [
      makeFile({ path: '/alpha.md', name: 'alpha.md', snippet: 'project docs' }),
      makeFile({ path: '/beta.md', name: 'beta.md', snippet: 'project docs too' }),
      makeFile({ path: '/gamma.md', name: 'gamma.md', snippet: 'unrelated' }),
    ]
    const result = filterFiles(multiFiles, 'project')
    expect(result).toHaveLength(2)
    expect(result.map((f) => f.name)).toEqual(['alpha.md', 'beta.md'])
  })

  it('returns empty array when no match', () => {
    expect(filterFiles(files, 'zzznomatch')).toHaveLength(0)
  })

  it('matches partial filename', () => {
    const result = filterFiles(files, 'read')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('readme.md')
  })

  it('files without snippet are matched only by name', () => {
    const noSnippet = [makeFile({ path: '/x.md', name: 'secretfile.md' })]
    expect(filterFiles(noSnippet, 'secret')).toHaveLength(1)
    expect(filterFiles(noSnippet, 'missing')).toHaveLength(0)
  })
})
