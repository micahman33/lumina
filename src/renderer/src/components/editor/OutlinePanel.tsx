import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { extractHeadings } from './outlineUtils'
import type { HeadingEntry } from './outlineUtils'

export { extractHeadings } from './outlineUtils'

interface OutlinePanelProps {
  editor: Editor
}

const LEVEL_INDENT: Record<number, number> = {
  1: 0,
  2: 12,
  3: 24,
  4: 36,
  5: 36,
  6: 36,
}

export function OutlinePanel({ editor }: OutlinePanelProps): JSX.Element {
  const [headings, setHeadings] = useState<HeadingEntry[]>([])

  useEffect(() => {
    function refresh(): void {
      setHeadings(extractHeadings(editor.state.doc))
    }

    refresh()
    editor.on('update', refresh)
    editor.on('transaction', refresh)
    return () => {
      editor.off('update', refresh)
      editor.off('transaction', refresh)
    }
  }, [editor])

  function scrollToHeading(text: string): void {
    const editorEl = editor.view.dom
    const headingEls = editorEl.querySelectorAll('h1,h2,h3,h4,h5,h6')
    for (const el of Array.from(headingEls)) {
      if (el.textContent === text) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        break
      }
    }
  }

  return (
    <div
      style={{
        width: 220,
        flexShrink: 0,
        borderLeft: '1px solid var(--lm-border)',
        background: 'var(--lm-sidebar)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '10px 12px 8px',
          fontSize: 10,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: 1,
          color: 'var(--lm-ink-faint)',
          borderBottom: '1px solid var(--lm-border)',
          flexShrink: 0,
        }}
      >
        Outline
      </div>

      {/* Items */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
        {headings.length === 0 ? (
          <div
            style={{
              padding: '12px 14px',
              fontSize: 12,
              color: 'var(--lm-ink-faint)',
            }}
          >
            No headings
          </div>
        ) : (
          headings.map((h, i) => (
            <button
              key={i}
              onClick={() => scrollToHeading(h.text)}
              title={h.text}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                width: '100%',
                paddingLeft: 10 + LEVEL_INDENT[h.level],
                paddingRight: 10,
                paddingTop: 4,
                paddingBottom: 4,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'none'
              }}
            >
              {/* Level badge */}
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  fontFamily: 'ui-monospace, monospace',
                  color: 'var(--lm-ink-faint)',
                  background: 'rgba(0,0,0,0.06)',
                  borderRadius: 3,
                  padding: '1px 4px',
                  flexShrink: 0,
                  lineHeight: 1.5,
                }}
              >
                H{h.level}
              </span>
              {/* Heading text */}
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--lm-ink)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                }}
              >
                {h.text}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
