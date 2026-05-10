import type { Node } from '@tiptap/pm/model'

export interface HeadingEntry {
  level: number
  text: string
  pos: number
}

/**
 * Walk a ProseMirror document and return all heading nodes with their level,
 * plain-text content, and document position.
 */
export function extractHeadings(doc: Node): HeadingEntry[] {
  const headings: HeadingEntry[] = []

  doc.forEach((node, offset) => {
    if (node.type.name === 'heading') {
      headings.push({
        level: node.attrs.level as number,
        text: node.textContent,
        pos: offset,
      })
    }
  })

  return headings
}
