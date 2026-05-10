import { describe, it, expect } from 'vitest'
import { extractHeadings } from '../outlineUtils'
import type { Node } from '@tiptap/pm/model'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Minimal ProseMirror Node stub that supports the subset of the API used
 * by extractHeadings (doc.forEach iterating child nodes).
 */
function makeNode(typeName: string, attrs: Record<string, unknown> = {}, text = ''): Node {
  return {
    type: { name: typeName },
    attrs,
    textContent: text,
  } as unknown as Node
}

function makeDoc(children: Array<{ typeName: string; attrs?: Record<string, unknown>; text?: string }>): Node {
  const nodes = children.map(({ typeName, attrs = {}, text = '' }) =>
    makeNode(typeName, attrs, text)
  )
  return {
    forEach(cb: (node: Node, offset: number) => void) {
      nodes.forEach((n, i) => cb(n, i * 10))
    },
  } as unknown as Node
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('extractHeadings', () => {
  it('returns [] for an empty document', () => {
    const doc = makeDoc([])
    expect(extractHeadings(doc)).toEqual([])
  })

  it('extracts a single H1 correctly', () => {
    const doc = makeDoc([{ typeName: 'heading', attrs: { level: 1 }, text: 'Title' }])
    const result = extractHeadings(doc)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ level: 1, text: 'Title' })
  })

  it('returns multiple headings in document order', () => {
    const doc = makeDoc([
      { typeName: 'heading', attrs: { level: 1 }, text: 'First' },
      { typeName: 'heading', attrs: { level: 2 }, text: 'Second' },
      { typeName: 'heading', attrs: { level: 3 }, text: 'Third' },
    ])
    const result = extractHeadings(doc)
    expect(result).toHaveLength(3)
    expect(result.map((h) => h.text)).toEqual(['First', 'Second', 'Third'])
  })

  it('extracts correct level numbers for H1 through H6', () => {
    const doc = makeDoc([
      { typeName: 'heading', attrs: { level: 1 }, text: 'H1' },
      { typeName: 'heading', attrs: { level: 2 }, text: 'H2' },
      { typeName: 'heading', attrs: { level: 3 }, text: 'H3' },
      { typeName: 'heading', attrs: { level: 4 }, text: 'H4' },
      { typeName: 'heading', attrs: { level: 5 }, text: 'H5' },
      { typeName: 'heading', attrs: { level: 6 }, text: 'H6' },
    ])
    const result = extractHeadings(doc)
    expect(result.map((h) => h.level)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('extracts H2 after H1 preserving hierarchy order', () => {
    const doc = makeDoc([
      { typeName: 'heading', attrs: { level: 1 }, text: 'Chapter' },
      { typeName: 'heading', attrs: { level: 2 }, text: 'Section' },
    ])
    const result = extractHeadings(doc)
    expect(result[0].level).toBe(1)
    expect(result[1].level).toBe(2)
    expect(result[0].text).toBe('Chapter')
    expect(result[1].text).toBe('Section')
  })

  it('ignores paragraph nodes between headings', () => {
    const doc = makeDoc([
      { typeName: 'heading', attrs: { level: 1 }, text: 'Heading A' },
      { typeName: 'paragraph', attrs: {}, text: 'Some body text' },
      { typeName: 'paragraph', attrs: {}, text: 'More body text' },
      { typeName: 'heading', attrs: { level: 2 }, text: 'Heading B' },
    ])
    const result = extractHeadings(doc)
    expect(result).toHaveLength(2)
    expect(result[0].text).toBe('Heading A')
    expect(result[1].text).toBe('Heading B')
  })

  it('ignores blockquote and codeBlock nodes', () => {
    const doc = makeDoc([
      { typeName: 'heading', attrs: { level: 1 }, text: 'Only Heading' },
      { typeName: 'blockquote', attrs: {}, text: 'Quote text' },
      { typeName: 'codeBlock', attrs: {}, text: 'const x = 1' },
    ])
    const result = extractHeadings(doc)
    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('Only Heading')
  })

  it('returns plain text for headings with inline marks (bold/italic)', () => {
    // textContent on ProseMirror nodes already strips marks; our stub does too
    const doc = makeDoc([
      { typeName: 'heading', attrs: { level: 2 }, text: 'Bold and Italic heading' },
    ])
    const result = extractHeadings(doc)
    expect(result[0].text).toBe('Bold and Italic heading')
  })

  it('preserves all levels when all six are present', () => {
    const doc = makeDoc([1, 2, 3, 4, 5, 6].map((level) => ({
      typeName: 'heading',
      attrs: { level },
      text: `Level ${level}`,
    })))
    const result = extractHeadings(doc)
    expect(result).toHaveLength(6)
    expect(result.map((h) => h.level)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('pos values are strictly increasing across headings', () => {
    const doc = makeDoc([
      { typeName: 'heading', attrs: { level: 1 }, text: 'A' },
      { typeName: 'heading', attrs: { level: 2 }, text: 'B' },
      { typeName: 'heading', attrs: { level: 3 }, text: 'C' },
    ])
    const result = extractHeadings(doc)
    for (let i = 1; i < result.length; i++) {
      expect(result[i].pos).toBeGreaterThan(result[i - 1].pos)
    }
  })

  it('pos values are non-negative', () => {
    const doc = makeDoc([
      { typeName: 'heading', attrs: { level: 1 }, text: 'Root' },
      { typeName: 'heading', attrs: { level: 2 }, text: 'Sub' },
    ])
    const result = extractHeadings(doc)
    result.forEach((h) => expect(h.pos).toBeGreaterThanOrEqual(0))
  })

  it('handles a document with only paragraphs (no headings)', () => {
    const doc = makeDoc([
      { typeName: 'paragraph', text: 'Hello' },
      { typeName: 'paragraph', text: 'World' },
    ])
    expect(extractHeadings(doc)).toEqual([])
  })

  it('handles mixed content: lists and headings together', () => {
    const doc = makeDoc([
      { typeName: 'heading', attrs: { level: 1 }, text: 'Intro' },
      { typeName: 'bulletList', attrs: {}, text: 'item one item two' },
      { typeName: 'heading', attrs: { level: 2 }, text: 'Details' },
      { typeName: 'orderedList', attrs: {}, text: 'step one step two' },
      { typeName: 'heading', attrs: { level: 3 }, text: 'Summary' },
    ])
    const result = extractHeadings(doc)
    expect(result).toHaveLength(3)
    expect(result.map((h) => h.text)).toEqual(['Intro', 'Details', 'Summary'])
  })
})
