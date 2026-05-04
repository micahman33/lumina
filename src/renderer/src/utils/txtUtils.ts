import type { FileType } from '../types/file'

/** Minimal interface for a ProseMirror-like node — used for testing without a real editor */
export interface TxtNode {
  type: { name: string }
  attrs: { start?: number }
  textContent: string
  forEach: (fn: (child: TxtNode) => void) => void
}

export interface TxtDoc {
  forEach: (fn: (node: TxtNode) => void) => void
}

/** Derive file type from extension. */
export function detectFileType(path: string | null): FileType {
  if (!path) return 'md'
  const ext = path.split('.').pop()?.toLowerCase()
  if (ext === 'txt') return 'txt'
  return 'md'
}

/** Strip Markdown syntax to produce a plain-text snippet for search indexing. */
export function extractSnippet(content: string, fileType: FileType = 'md', maxLen = 300): string {
  if (fileType === 'txt') return content.replace(/\n+/g, ' ').trim().slice(0, maxLen)
  return content
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`{1,3}[^`\n]*`{1,3}/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s*[-*+>]\s+/gm, '')
    .replace(/\n+/g, ' ')
    .trim()
    .slice(0, maxLen)
}

/** Wrap list item text in a paragraph node, guarding against empty text (ProseMirror text nodes MUST be non-empty). */
function listItemNode(text: string): object {
  return {
    type: 'listItem',
    content: [
      text
        ? { type: 'paragraph', content: [{ type: 'text', text }] }
        : { type: 'paragraph' }
    ]
  }
}

/**
 * Build a ProseMirror JSON document from raw plain text.
 * Each blank line (\n\n) flushes the current block. Blocks where ALL lines
 * match a list pattern become list nodes; otherwise each line is a paragraph.
 */
export function buildTxtDoc(raw: string): object {
  const lines = raw.split(/\r?\n/)
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()

  const nodes: object[] = []
  let block: string[] = []

  const flushBlock = (): void => {
    if (block.length === 0) return
    if (block.every((l) => /^[-*+]\s/.test(l))) {
      nodes.push({
        type: 'bulletList',
        content: block.map((l) => listItemNode(l.replace(/^[-*+]\s+/, '')))
      })
    } else if (block.every((l) => /^\d+\.\s/.test(l))) {
      nodes.push({
        type: 'orderedList',
        content: block.map((l) => listItemNode(l.replace(/^\d+\.\s+/, '')))
      })
    } else {
      for (const line of block) {
        nodes.push({ type: 'paragraph', content: [{ type: 'text', text: line }] })
      }
    }
    block = []
  }

  for (const line of lines) {
    if (line === '') {
      flushBlock()
      nodes.push({ type: 'paragraph' })
    } else {
      block.push(line)
    }
  }
  flushBlock()

  if (nodes.length === 0) nodes.push({ type: 'paragraph' })
  return { type: 'doc', content: nodes }
}

/**
 * Serialize a ProseMirror-like doc back to plain text.
 * Lists get \n\n separators on each side so buildTxtDoc can re-detect them.
 */
export function serializeTxtDoc(doc: TxtDoc): string {
  type Chunk = { kind: 'list' | 'para'; text: string }
  const chunks: Chunk[] = []

  doc.forEach((node) => {
    if (node.type.name === 'bulletList') {
      const items: string[] = []
      node.forEach((item) => items.push(`- ${item.textContent}`))
      chunks.push({ kind: 'list', text: items.join('\n') })
    } else if (node.type.name === 'orderedList') {
      const items: string[] = []
      let idx = (node.attrs.start as number) ?? 1
      node.forEach((item) => { items.push(`${idx}. ${item.textContent}`); idx++ })
      chunks.push({ kind: 'list', text: items.join('\n') })
    } else {
      chunks.push({ kind: 'para', text: node.textContent })
    }
  })

  let out = ''
  for (let i = 0; i < chunks.length; i++) {
    const { kind, text } = chunks[i]
    if (i === 0) { out = text; continue }
    const prev = chunks[i - 1]
    if (kind === 'list') {
      out += prev.text === '' ? '\n' + text : '\n\n' + text
    } else if (prev.kind === 'list') {
      out += '\n\n' + text
    } else {
      out += '\n' + text
    }
  }

  return out.replace(/\n{3,}/g, '\n\n').trimStart() + '\n'
}
