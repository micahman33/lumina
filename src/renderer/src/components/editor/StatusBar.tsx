import { useState, useEffect } from 'react'
import { useAppStore } from '../../store/appStore'
import type { Editor } from '@tiptap/react'
import { viewKindFor } from '../../utils/txtUtils'
import { getSurface } from '../../surfaces'

interface StatusBarProps {
  editor: Editor | null
}

export function StatusBar({ editor }: StatusBarProps): JSX.Element {
  const filePath = useAppStore((s) => s.file.path)
  const isDirty = useAppStore((s) => s.file.isDirty)
  const fileType = useAppStore((s) => s.file.fileType)
  const viewAsText = useAppStore((s) => s.file.viewAsText)
  const kind = useAppStore((s) => s.file.kind)
  const meta = useAppStore((s) => s.file.meta)
  const status = useAppStore((s) => s.viewStatus)
  const view = kind === 'binary' ? 'none' : viewKindFor(fileType, viewAsText)
  const ext = filePath?.split(/[/\\]/).pop()?.split('.').pop()?.toUpperCase()
  const formatLabel =
    kind === 'binary' ? 'Binary' :
    fileType === 'md' ? 'Markdown' :
    fileType === 'txt' ? 'Plain Text' :
    fileType === 'json' ? 'JSON' :
    fileType === 'xml' ? 'XML' :
    fileType === 'csv' ? (filePath?.toLowerCase().endsWith('.tsv') ? 'TSV' : 'CSV') :
    ext && ext.length <= 6 && filePath?.includes('.') ? ext : 'Text'
  const encodingLabel = { utf8: 'UTF-8', utf16le: 'UTF-16 LE', utf16be: 'UTF-16 BE', 'windows-1252': 'Windows-1252' }[meta.encoding]
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
      <span>{formatLabel}</span>
      {kind !== 'binary' && <span>{encodingLabel}{meta.eol === '\r\n' ? ' · CRLF' : ''}</span>}
      {view === 'rich' && <span>Ln {lineCol.line}, Col {lineCol.col}</span>}
      {view === 'code' && <span>Ln {status.line ?? 1}, Col {status.col ?? 1}</span>}
      {view === 'table' && status.rows !== undefined && (
        <span>{status.rows.toLocaleString()} {status.rows === 1 ? 'row' : 'rows'} × {status.cols} {status.cols === 1 ? 'column' : 'columns'}</span>
      )}
      {view === 'code' && status.errors !== undefined && (
        status.errors === 0 ? (
          <span style={{ color: '#10B981' }}>No errors</span>
        ) : (
          <button
            onClick={() => getSurface('code')?.commands?.gotoError?.()}
            title="Jump to the next error"
            style={{ color: '#E5484D', background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer' }}
          >
            {status.errors} {status.errors === 1 ? 'error' : 'errors'}
          </button>
        )
      )}
      {status.note && view !== 'rich' && <span>{status.note}</span>}

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
        <span>{meta.readOnly ? 'Read-only' : isDirty ? 'Unsaved changes' : 'Saved'}</span>
      </span>
    </div>
  )
}
