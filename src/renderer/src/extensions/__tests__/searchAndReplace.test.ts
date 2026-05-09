import { describe, it, expect } from 'vitest'
import { findAll } from '../searchAndReplace'
import type { Node as PmNode } from '@tiptap/pm/model'

// ── Mock ProseMirror doc ───────────────────────────────────────────────────
// descendants() visits each node with (node, pos). We pass minimal objects
// that satisfy the { isText, text } contract used by findAll.

function mockDoc(...textNodes: Array<{ text: string; pos: number }>): PmNode {
  return {
    descendants(cb: (node: { isText: boolean; text?: string }, pos: number) => void) {
      for (const { text, pos } of textNodes) {
        cb({ isText: true, text }, pos)
      }
    }
  } as unknown as PmNode
}

// ── findAll ────────────────────────────────────────────────────────────────

describe('findAll', () => {
  it('returns empty array for empty search term', () => {
    const doc = mockDoc({ text: 'Hello world', pos: 0 })
    expect(findAll(doc, '', false)).toEqual([])
  })

  it('returns empty array when no match found', () => {
    const doc = mockDoc({ text: 'Hello world', pos: 0 })
    expect(findAll(doc, 'xyz', false)).toEqual([])
  })

  it('finds a single match', () => {
    const doc = mockDoc({ text: 'Hello world', pos: 0 })
    expect(findAll(doc, 'world', false)).toEqual([{ from: 6, to: 11 }])
  })

  it('finds multiple matches in one node', () => {
    const doc = mockDoc({ text: 'foo bar foo baz foo', pos: 0 })
    expect(findAll(doc, 'foo', false)).toEqual([
      { from: 0, to: 3 },
      { from: 8, to: 11 },
      { from: 16, to: 19 },
    ])
  })

  it('finds matches across multiple text nodes', () => {
    const doc = mockDoc(
      { text: 'first foo here', pos: 1 },
      { text: 'second foo there', pos: 20 },
    )
    const results = findAll(doc, 'foo', false)
    expect(results).toHaveLength(2)
    expect(results[0]).toEqual({ from: 7, to: 10 })   // pos 1 + index 6
    expect(results[1]).toEqual({ from: 27, to: 30 })  // pos 20 + index 7
  })

  it('is case-insensitive by default', () => {
    const doc = mockDoc({ text: 'Hello HELLO hello', pos: 0 })
    expect(findAll(doc, 'hello', false)).toHaveLength(3)
  })

  it('respects case-sensitive flag', () => {
    const doc = mockDoc({ text: 'Hello HELLO hello', pos: 0 })
    expect(findAll(doc, 'hello', true)).toEqual([{ from: 12, to: 17 }])
  })

  it('escapes regex special characters in search term', () => {
    const doc = mockDoc({ text: 'price is $10.00 today', pos: 0 })
    // Without escaping, '$' and '.' would be regex metacharacters
    expect(findAll(doc, '$10.00', false)).toEqual([{ from: 9, to: 15 }])
  })

  it('escapes parentheses in search term', () => {
    const doc = mockDoc({ text: 'call foo() now', pos: 0 })
    expect(findAll(doc, 'foo()', false)).toEqual([{ from: 5, to: 10 }])
  })

  it('returns empty array for malformed regex-like input', () => {
    // Even with '(' or '[' that would normally throw, it should not crash
    const doc = mockDoc({ text: 'some [text] here', pos: 0 })
    expect(() => findAll(doc, '[text]', false)).not.toThrow()
    expect(findAll(doc, '[text]', false)).toEqual([{ from: 5, to: 11 }])
  })

  it('skips non-text nodes', () => {
    const doc = {
      descendants(cb: (node: { isText: boolean; text?: string }, pos: number) => void) {
        cb({ isText: false }, 0)          // paragraph node — no text
        cb({ isText: true, text: 'foo' }, 5)
      }
    } as unknown as PmNode
    expect(findAll(doc, 'foo', false)).toEqual([{ from: 5, to: 8 }])
  })

  it('skips text nodes with no text property', () => {
    const doc = {
      descendants(cb: (node: { isText: boolean; text?: string }, pos: number) => void) {
        cb({ isText: true, text: undefined }, 0)
        cb({ isText: true, text: 'foo' }, 2)
      }
    } as unknown as PmNode
    expect(findAll(doc, 'foo', false)).toEqual([{ from: 2, to: 5 }])
  })

  it('handles match at start of node', () => {
    const doc = mockDoc({ text: 'foo at start', pos: 10 })
    expect(findAll(doc, 'foo', false)).toEqual([{ from: 10, to: 13 }])
  })

  it('handles match at end of node', () => {
    const doc = mockDoc({ text: 'ends with foo', pos: 0 })
    expect(findAll(doc, 'foo', false)).toEqual([{ from: 10, to: 13 }])
  })

  it('handles single-character search term', () => {
    const doc = mockDoc({ text: 'abcabc', pos: 0 })
    expect(findAll(doc, 'a', false)).toEqual([
      { from: 0, to: 1 },
      { from: 3, to: 4 },
    ])
  })

  it('handles whole-word substring correctly', () => {
    const doc = mockDoc({ text: 'foobar foo fooze', pos: 0 })
    // findAll does substring match (not whole-word), all three should match
    expect(findAll(doc, 'foo', false)).toHaveLength(3)
  })
})
