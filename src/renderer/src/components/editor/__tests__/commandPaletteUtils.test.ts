import { describe, it, expect } from 'vitest'
import { fuzzyMatch, fuzzyScore } from '../CommandPalette'

// ── fuzzyMatch ────────────────────────────────────────────────────────────────

describe('fuzzyMatch', () => {
  it('matches everything when query is empty', () => {
    expect(fuzzyMatch('', 'Bold')).toBe(true)
    expect(fuzzyMatch('', 'Heading 1')).toBe(true)
    expect(fuzzyMatch('', '')).toBe(true)
  })

  it('matches exact substring (case-insensitive)', () => {
    expect(fuzzyMatch('bold', 'Bold')).toBe(true)
    expect(fuzzyMatch('BOLD', 'bold text')).toBe(true)
    expect(fuzzyMatch('heading', 'Heading 1')).toBe(true)
  })

  it('matches sequential characters', () => {
    expect(fuzzyMatch('hd1', 'Heading 1')).toBe(true)
    expect(fuzzyMatch('bld', 'bold')).toBe(true)
  })

  it('is case-insensitive for sequential matching', () => {
    expect(fuzzyMatch('HDG', 'Heading')).toBe(true)
    expect(fuzzyMatch('TBL', 'table')).toBe(true)
  })

  it('returns false when no sequential match', () => {
    expect(fuzzyMatch('xyz', 'bold')).toBe(false)
    expect(fuzzyMatch('zzz', 'heading')).toBe(false)
  })

  it('matches against keywords', () => {
    expect(fuzzyMatch('strong', 'Bold', ['strong', 'bold'])).toBe(true)
    expect(fuzzyMatch('emphasis', 'Italic', ['italic', 'emphasis', 'em'])).toBe(true)
  })

  it('returns false when neither text nor keywords match', () => {
    expect(fuzzyMatch('xyz', 'Bold', ['strong'])).toBe(false)
  })

  it('handles empty keyword array', () => {
    expect(fuzzyMatch('bold', 'Bold', [])).toBe(true)
    expect(fuzzyMatch('xyz', 'Bold', [])).toBe(false)
  })
})

// ── fuzzyScore ────────────────────────────────────────────────────────────────

describe('fuzzyScore', () => {
  it('returns 1 for empty query (everything matches with score 1)', () => {
    expect(fuzzyScore('', 'Bold')).toBe(1)
    expect(fuzzyScore('', '')).toBe(1)
    expect(fuzzyScore('', 'Heading 1')).toBe(1)
  })

  it('returns 3 for exact substring match', () => {
    expect(fuzzyScore('bold', 'Bold')).toBe(3)
    expect(fuzzyScore('heading', 'Heading 1')).toBe(3)
    expect(fuzzyScore('code', 'Inline Code')).toBe(3)
  })

  it('returns 1 for sequential character match (not substring)', () => {
    expect(fuzzyScore('bld', 'bold')).toBe(1)
    expect(fuzzyScore('hd1', 'heading 1')).toBe(1)
  })

  it('returns 0 for no match', () => {
    expect(fuzzyScore('xyz', 'bold')).toBe(0)
    expect(fuzzyScore('zzz', 'heading')).toBe(0)
  })

  it('substring score (3) is higher than sequential score (1)', () => {
    const substringScore = fuzzyScore('bold', 'Bold text')
    const sequentialScore = fuzzyScore('bld', 'Bold text')
    expect(substringScore).toBeGreaterThan(sequentialScore)
    expect(substringScore).toBe(3)
    expect(sequentialScore).toBe(1)
  })

  it('matches keywords and returns correct score', () => {
    // keyword exact substring → 3
    expect(fuzzyScore('strong', 'Bold', ['strong'])).toBe(3)
    // keyword sequential → 1
    expect(fuzzyScore('strng', 'Bold', ['strong'])).toBe(1)
  })

  it('returns the score from text when text matches, even if keywords also match', () => {
    // Text has a substring match (score 3), which is returned first
    expect(fuzzyScore('bold', 'bold text', ['bold'])).toBe(3)
  })

  it('is case-insensitive for scoring', () => {
    expect(fuzzyScore('BOLD', 'bold')).toBe(3)
    expect(fuzzyScore('Bold', 'BOLD')).toBe(3)
  })

  it('partial substring at start of text still scores 3', () => {
    expect(fuzzyScore('head', 'Heading 2')).toBe(3)
  })

  it('empty text with non-empty query returns 0', () => {
    expect(fuzzyScore('bold', '')).toBe(0)
  })
})
