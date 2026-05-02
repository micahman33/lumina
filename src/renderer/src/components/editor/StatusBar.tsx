import { useState, useEffect } from 'react'
import { useAppStore } from '../../store/appStore'
import type { Editor } from '@tiptap/react'

interface StatusBarProps {
  editor: Editor | null
}

export function StatusBar({ editor }: StatusBarProps): JSX.Element {
  const filePath = useAppStore((s) => s.file.path)
  const isDirty = useAppStore((s) => s.file.isDirty)
  const [lineCol, setLineCol] = useState({ line: 1, col: 1 })

  useEffect(() => {
    if (!editor) return
    const update = (): void => {
      const { anchor } = editor.state.selection
      const text = editor.state.doc.textBetween(0, anchor, '\n')
      const lines = text.split('\n')
      setLineCol({ line: lines.length, col: lines[lines.length - 1].length + 1 })
    }
    editor.on('selectionUpdate', update)
    editor.on('focus', update)
    return () => {
      editor.off('selectionUpdate', update)
      editor.off('focus', update)
    }
  }, [editor])

  return (
    <div
      className="flex items-center shrink-0 select-none"
      style={{
        height: 26,
        background: 'var(--lm-chrome)',
        borderTop: '1px solid var(--lm-border)',
        padding: '0 16px',
        gap: 16,
        fontSize: 11,
        fontFamily: 'ui-monospace, SFMono-Regular, monospace',
        color: 'var(--lm-ink-faint)',
      }}
    >
      <span>Markdown</span>
      <span>UTF-8</span>
      <span>Ln {lineCol.line}, Col {lineCol.col}</span>

      <div style={{ flex: 1 }} />

      {filePath && (
        <span
          style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300, direction: 'rtl', textAlign: 'left' }}
          title={filePath}
        >
          {filePath}
        </span>
      )}

      <span className="flex items-center" style={{ gap: 6 }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
          background: isDirty ? '#F59E0B' : '#10B981',
        }} />
        <span>{isDirty ? 'Unsaved changes' : 'Saved'}</span>
      </span>
    </div>
  )
}
