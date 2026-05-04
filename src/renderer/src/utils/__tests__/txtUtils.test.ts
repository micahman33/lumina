import { describe, it, expect } from 'vitest'
import { buildTxtDoc, serializeTxtDoc } from '../txtUtils'
import type { TxtDoc, TxtNode } from '../txtUtils'

// ──────────────────────────────────────────────────────────────────────────────
// Helpers to build minimal TxtDoc objects for serializeTxtDoc tests
// ──────────────────────────────────────────────────────────────────────────────

function paraNode(text: string): TxtNode {
  return {
    type: { name: 'paragraph' },
    attrs: {},
    textContent: text,
    forEach: () => {},
  }
}

function bulletListNode(items: string[]): TxtNode {
  const children: TxtNode[] = items.map((item) => ({
    type: { name: 'listItem' },
    attrs: {},
    textContent: item,
    forEach: () => {},
  }))
  return {
    type: { name: 'bulletList' },
    attrs: {},
    textContent: items.join(''),
    forEach: (fn) => children.forEach(fn),
  }
}

function orderedListNode(items: string[], start = 1): TxtNode {
  const children: TxtNode[] = items.map((item) => ({
    type: { name: 'listItem' },
    attrs: {},
    textContent: item,
    forEach: () => {},
  }))
  return {
    type: { name: 'orderedList' },
    attrs: { start },
    textContent: items.join(''),
    forEach: (fn) => children.forEach(fn),
  }
}

function makeDoc(nodes: TxtNode[]): TxtDoc {
  return { forEach: (fn) => nodes.forEach(fn) }
}

// ──────────────────────────────────────────────────────────────────────────────
// buildTxtDoc tests
// ──────────────────────────────────────────────────────────────────────────────

describe('buildTxtDoc', () => {
  it('empty string → doc with single empty paragraph', () => {
    const doc = buildTxtDoc('') as { type: string; content: Array<{ type: string }> }
    expect(doc.type).toBe('doc')
    expect(doc.content).toHaveLength(1)
    expect(doc.content[0].type).toBe('paragraph')
  })

  it('single line of text → doc with one paragraph containing the text', () => {
    const doc = buildTxtDoc('Hello world') as { type: string; content: Array<{ type: string; content?: Array<{ type: string; text: string }> }> }
    expect(doc.content).toHaveLength(1)
    expect(doc.content[0].type).toBe('paragraph')
    expect(doc.content[0].content?.[0].text).toBe('Hello world')
  })

  it('multiple lines (no blank lines) → one paragraph per line, not a list', () => {
    const doc = buildTxtDoc('Line 1\nLine 2\nLine 3') as { type: string; content: Array<{ type: string }> }
    expect(doc.content).toHaveLength(3)
    doc.content.forEach((node) => expect(node.type).toBe('paragraph'))
  })

  it('blank line creates empty paragraph node separator', () => {
    const doc = buildTxtDoc('Line 1\n\nLine 2') as { type: string; content: Array<{ type: string; content?: Array<{ type: string; text: string }> }> }
    // Line 1, empty paragraph (blank line), Line 2
    expect(doc.content).toHaveLength(3)
    expect(doc.content[0].type).toBe('paragraph')
    expect(doc.content[0].content?.[0].text).toBe('Line 1')
    expect(doc.content[1].type).toBe('paragraph')
    expect(doc.content[1].content).toBeUndefined() // empty paragraph
    expect(doc.content[2].type).toBe('paragraph')
    expect(doc.content[2].content?.[0].text).toBe('Line 2')
  })

  it('file ending with \\n → trailing empty string dropped, no phantom paragraph', () => {
    const doc = buildTxtDoc('Hello\n') as { type: string; content: Array<{ type: string }> }
    expect(doc.content).toHaveLength(1)
    expect(doc.content[0].type).toBe('paragraph')
  })

  it('Windows CRLF \\r\\n treated same as \\n', () => {
    const doc = buildTxtDoc('Line 1\r\nLine 2\r\n') as { type: string; content: Array<{ type: string }> }
    expect(doc.content).toHaveLength(2)
    doc.content.forEach((node) => expect(node.type).toBe('paragraph'))
  })

  it('blank-line-delimited block where ALL lines match "- item" → bulletList node', () => {
    const doc = buildTxtDoc('- Apple\n- Banana\n- Cherry') as { type: string; content: Array<{ type: string }> }
    expect(doc.content).toHaveLength(1)
    expect(doc.content[0].type).toBe('bulletList')
  })

  it('blank-line-delimited block where ALL lines match "1. item" → orderedList node', () => {
    const doc = buildTxtDoc('1. First\n2. Second\n3. Third') as { type: string; content: Array<{ type: string }> }
    expect(doc.content).toHaveLength(1)
    expect(doc.content[0].type).toBe('orderedList')
  })

  it('block mixed with non-list line → individual paragraphs, not a list', () => {
    const doc = buildTxtDoc('Some text\n- Item') as { type: string; content: Array<{ type: string }> }
    expect(doc.content).toHaveLength(2)
    doc.content.forEach((node) => expect(node.type).toBe('paragraph'))
  })

  it('* and + as bullet markers also detected', () => {
    const starDoc = buildTxtDoc('* Apple\n* Banana') as { type: string; content: Array<{ type: string }> }
    expect(starDoc.content[0].type).toBe('bulletList')

    const plusDoc = buildTxtDoc('+ Apple\n+ Banana') as { type: string; content: Array<{ type: string }> }
    expect(plusDoc.content[0].type).toBe('bulletList')
  })

  it('empty bullet marker "- " (trailing space only) → listItem with empty paragraph', () => {
    const doc = buildTxtDoc('- ') as { type: string; content: Array<{ type: string; content?: Array<{ type: string; content?: Array<{ type: string }> }> }> }
    expect(doc.content[0].type).toBe('bulletList')
    const listItem = (doc.content[0].content as Array<{ type: string; content?: Array<{ type: string; content?: Array<{ type: string }> }> }>)[0]
    expect(listItem.type).toBe('listItem')
    // The inner content should be a paragraph with no text node (empty)
    const innerPara = listItem.content![0]
    expect(innerPara.type).toBe('paragraph')
    expect(innerPara.content).toBeUndefined()
  })

  it('empty ordered marker "1. " → listItem with empty paragraph', () => {
    const doc = buildTxtDoc('1. ') as { type: string; content: Array<{ type: string; content?: Array<{ type: string; content?: Array<{ type: string }> }> }> }
    expect(doc.content[0].type).toBe('orderedList')
    const listItem = (doc.content[0].content as Array<{ type: string; content?: Array<{ type: string }> }>)[0]
    expect(listItem.type).toBe('listItem')
    const innerPara = listItem.content![0]
    expect(innerPara.type).toBe('paragraph')
    expect((innerPara as { type: string; content?: unknown[] }).content).toBeUndefined()
  })

  it('numbers with different indices all detected as ordered list', () => {
    const doc = buildTxtDoc('5. Fifth\n6. Sixth\n7. Seventh') as { type: string; content: Array<{ type: string }> }
    expect(doc.content[0].type).toBe('orderedList')
  })

  it('ordered list with multi-digit numbers', () => {
    const doc = buildTxtDoc('10. Ten\n11. Eleven\n12. Twelve') as { type: string; content: Array<{ type: string }> }
    expect(doc.content[0].type).toBe('orderedList')
  })

  it('bullet list content preserved correctly', () => {
    type ListItem = { type: string; content: Array<{ type: string; content?: Array<{ type: string; text: string }> }> }
    type BulletList = { type: string; content: ListItem[] }
    const doc = buildTxtDoc('- Apple\n- Banana') as { type: string; content: BulletList[] }
    const list = doc.content[0]
    expect(list.type).toBe('bulletList')
    expect(list.content).toHaveLength(2)
    expect(list.content[0].content[0].content![0].text).toBe('Apple')
    expect(list.content[1].content[0].content![0].text).toBe('Banana')
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// serializeTxtDoc tests
// ──────────────────────────────────────────────────────────────────────────────

describe('serializeTxtDoc', () => {
  it('empty doc (one empty paragraph) → just "\\n"', () => {
    const doc = makeDoc([paraNode('')])
    expect(serializeTxtDoc(doc)).toBe('\n')
  })

  it('single paragraph → "text\\n"', () => {
    const doc = makeDoc([paraNode('Hello world')])
    expect(serializeTxtDoc(doc)).toBe('Hello world\n')
  })

  it('multiple paragraphs (no lists) → lines joined by \\n', () => {
    const doc = makeDoc([paraNode('Line 1'), paraNode('Line 2'), paraNode('Line 3')])
    expect(serializeTxtDoc(doc)).toBe('Line 1\nLine 2\nLine 3\n')
  })

  it('empty paragraph → blank line in output', () => {
    const doc = makeDoc([paraNode('Line 1'), paraNode(''), paraNode('Line 2')])
    expect(serializeTxtDoc(doc)).toBe('Line 1\n\nLine 2\n')
  })

  it('bulletList node → "- item1\\n- item2" prefixed lines', () => {
    const doc = makeDoc([bulletListNode(['Apple', 'Banana'])])
    expect(serializeTxtDoc(doc)).toBe('- Apple\n- Banana\n')
  })

  it('orderedList node → "1. item1\\n2. item2" numbered lines', () => {
    const doc = makeDoc([orderedListNode(['First', 'Second'])])
    expect(serializeTxtDoc(doc)).toBe('1. First\n2. Second\n')
  })

  it('list directly preceded by non-empty paragraph → \\n\\n separator before list', () => {
    const doc = makeDoc([paraNode('Intro'), bulletListNode(['Item'])])
    const result = serializeTxtDoc(doc)
    expect(result).toBe('Intro\n\n- Item\n')
  })

  it('list preceded by empty paragraph → list appears at start (trimStart removes leading whitespace)', () => {
    const doc = makeDoc([paraNode(''), bulletListNode(['Item'])])
    const result = serializeTxtDoc(doc)
    // empty para contributes '' then '\n' is added → '\n- Item'
    // but trimStart() on the final output removes the leading newline
    expect(result).toBe('- Item\n')
  })

  it('list followed by non-empty paragraph → \\n\\n separator after list', () => {
    const doc = makeDoc([bulletListNode(['Item']), paraNode('After')])
    const result = serializeTxtDoc(doc)
    expect(result).toBe('- Item\n\nAfter\n')
  })

  it('triple newlines collapsed to double', () => {
    // Two empty paragraphs adjacent to list — would be 3 newlines without collapsing
    const doc = makeDoc([paraNode(''), paraNode(''), bulletListNode(['Item'])])
    const result = serializeTxtDoc(doc)
    // Should not have 3+ consecutive newlines
    expect(result).not.toMatch(/\n{3,}/)
  })

  it('ordered list uses start attribute for first index', () => {
    const doc = makeDoc([orderedListNode(['Alpha', 'Beta'], 3)])
    expect(serializeTxtDoc(doc)).toBe('3. Alpha\n4. Beta\n')
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// Round-trip tests
// ──────────────────────────────────────────────────────────────────────────────

describe('round-trip (buildTxtDoc → serializeTxtDoc)', () => {
  /**
   * We need to produce a TxtDoc from buildTxtDoc's output by actually
   * walking the JSON doc structure. This mirrors what ProseMirror does.
   */
  function docFromJson(jsonDoc: object): TxtDoc {
    type JsonNode = {
      type: string
      content?: JsonNode[]
      textContent?: string
      attrs?: { start?: number }
    }

    const root = jsonDoc as { type: string; content: JsonNode[] }

    function makeNode(json: JsonNode): TxtNode {
      const children: TxtNode[] = (json.content ?? []).map(makeNode)

      // Compute textContent by flattening text nodes
      function extractText(n: JsonNode): string {
        if (n.type === 'text') return (n as unknown as { text: string }).text ?? ''
        return (n.content ?? []).map(extractText).join('')
      }
      const textContent = extractText(json)

      return {
        type: { name: json.type },
        attrs: { start: json.attrs?.start },
        textContent,
        forEach: (fn) => children.forEach(fn),
      }
    }

    const topNodes = root.content.map(makeNode)
    return { forEach: (fn) => topNodes.forEach(fn) }
  }

  function roundTrip(input: string): string {
    const jsonDoc = buildTxtDoc(input)
    const doc = docFromJson(jsonDoc)
    return serializeTxtDoc(doc)
  }

  it('plain text, no lists → round-trips exactly', () => {
    const input = 'Hello world\nThis is a second line\n'
    expect(roundTrip(input)).toBe(input)
  })

  it('text with blank-line-separated bullet list → round-trips', () => {
    const input = 'Some text\n\n- Item 1\n- Item 2\n\nMore text\n'
    expect(roundTrip(input)).toBe(input)
  })

  it('text with blank-line-separated ordered list → round-trips', () => {
    const input = 'Header\n\n1. First\n2. Second\n3. Third\n\nFooter\n'
    expect(roundTrip(input)).toBe(input)
  })

  it('plain text with no trailing newline gains trailing newline', () => {
    const input = 'Hello'
    expect(roundTrip(input)).toBe('Hello\n')
  })

  it('multiple list blocks with text between them → round-trips', () => {
    const input = '- A\n- B\n\nMiddle text\n\n1. One\n2. Two\n'
    expect(roundTrip(input)).toBe(input)
  })
})
