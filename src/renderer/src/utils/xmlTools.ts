import { parser } from '@lezer/xml'
import type { SyntaxNode } from '@lezer/common'
import type { TextProblem } from './formatJson'

function childrenOf(node: SyntaxNode): SyntaxNode[] {
  const out: SyntaxNode[] = []
  for (let c = node.firstChild; c; c = c.nextSibling) out.push(c)
  return out
}

/** Well-formedness problems: syntax errors, unclosed and mismatched tags, root element count. */
export function lintXml(text: string): TextProblem[] {
  if (!text.trim()) return []
  const problems: TextProblem[] = []
  const slice = (n: { from: number; to: number }): string => text.slice(n.from, n.to)
  const tagName = (tag: SyntaxNode | null): string => {
    const name = tag?.getChild('TagName')
    return name ? slice(name) : ''
  }
  const add = (from: number, to: number, message: string): void => {
    const end = Math.min(Math.max(to, from + 1), text.length)
    problems.push({ from: Math.min(from, Math.max(0, end - 1)), to: end, message })
  }

  const tree = parser.parse(text)
  tree.iterate({
    enter: (ref) => {
      const node = ref.node
      const unclosed = (el: SyntaxNode | null): boolean =>
        !!el && el.name === 'Element' && !!el.getChild('OpenTag') && !el.getChild('CloseTag')
      if (ref.type.isError) {
        // The parser's own marker for an element that runs off the end is reported below
        // as "never closed", which is more useful than "unexpected syntax".
        if (!(ref.from === ref.to && unclosed(node.parent))) add(ref.from, ref.to, 'Unexpected syntax')
      } else if (ref.name === 'Element' && unclosed(node) && !node.getChild('MismatchedCloseTag')) {
        const open = node.getChild('OpenTag')!
        add(open.from, open.to, `<${tagName(open)}> is never closed`)
      } else if (ref.name === 'MismatchedCloseTag') {
        const open = node.parent?.getChild('OpenTag') ?? null
        const expected = tagName(open)
        add(
          ref.from,
          ref.to,
          expected
            ? `</${tagName(node)}> doesn't match the open tag <${expected}>`
            : `</${tagName(node)}> has no matching open tag`
        )
      }
    },
  })

  const top = childrenOf(tree.topNode)
  const roots = top.filter((n) => n.name === 'Element')
  if (roots.length === 0 && problems.length === 0) add(0, text.length, 'No root element')
  for (const extra of roots.slice(1)) {
    const open = extra.firstChild ?? extra
    add(open.from, open.to, 'Only one root element is allowed')
  }
  for (const n of top) {
    if ((n.name === 'Text' && /\S/.test(slice(n))) || n.name === 'Cdata') {
      add(n.from, n.to, 'Text is not allowed outside the root element')
    }
  }
  return problems.sort((a, b) => a.from - b.from)
}

/**
 * Re-indent XML with two spaces, or return null if it isn't well-formed.
 *
 * Only whitespace *between tags* is changed. An element is re-indented only when its content
 * is nothing but child elements, comments and processing instructions; any element holding
 * real text, an entity, CDATA, or marked xml:space="preserve" is copied verbatim, because
 * whitespace there may be data. Tags, comments, the declaration and doctype are never
 * rewritten.
 */
export function formatXml(text: string): string | null {
  if (!text.trim() || lintXml(text).length) return null
  const slice = (n: SyntaxNode): string => text.slice(n.from, n.to)
  const pad = (depth: number): string => '  '.repeat(depth)
  const lines: string[] = []

  const element = (el: SyntaxNode, depth: number): void => {
    const kids = childrenOf(el)
    const open = kids[0]
    const close = kids[kids.length - 1]
    const inner = kids.slice(1, -1)
    const structural = inner.some((k) => ['Element', 'Comment', 'ProcessingInst'].includes(k.name))
    const textual = inner.some(
      (k) => (k.name === 'Text' && /\S/.test(slice(k))) || !['Text', 'Element', 'Comment', 'ProcessingInst'].includes(k.name)
    )
    const preserve = /\bxml:space\s*=\s*["']preserve["']/.test(slice(open))
    if (open.name !== 'OpenTag' || close.name !== 'CloseTag' || !structural || textual || preserve) {
      lines.push(pad(depth) + slice(el))
      return
    }
    lines.push(pad(depth) + slice(open))
    for (const k of inner) {
      if (k.name === 'Text') continue
      if (k.name === 'Element') element(k, depth + 1)
      else lines.push(pad(depth + 1) + slice(k))
    }
    lines.push(pad(depth) + slice(close))
  }

  for (const n of childrenOf(parser.parse(text).topNode)) {
    if (n.name === 'Text') continue
    if (n.name === 'Element') element(n, 0)
    else lines.push(slice(n))
  }
  return lines.join('\n') + '\n'
}
