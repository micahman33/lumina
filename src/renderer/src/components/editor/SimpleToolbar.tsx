import { FolderOpen, Save, PanelLeftOpen, Settings, AlignLeft, Search, Rows3, Columns3, Table2, FileText } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { getSurface } from '../../surfaces'
import { viewKindFor } from '../../utils/txtUtils'
import { toggleCsvTextView } from '../../hooks/useFile'
import { TB, Sep } from './Toolbar'

interface SimpleToolbarProps {
  onOpenFile: () => void
  onSaveFile: () => void
}

function TextButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }): JSX.Element {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      className="titlebar-no-drag inline-flex items-center rounded"
      style={{
        height: 28, padding: '0 9px', gap: 6, borderRadius: 6, border: 'none', background: 'transparent',
        color: 'var(--lm-ink-soft)', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
    >
      {children}
      <span>{label}</span>
    </button>
  )
}

/** Toolbar for everything that isn't Markdown: code files, CSV tables, binary notices. */
export function SimpleToolbar({ onOpenFile, onSaveFile }: SimpleToolbarProps): JSX.Element {
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen)
  const fileType = useAppStore((s) => s.file.fileType)
  const viewAsText = useAppStore((s) => s.file.viewAsText)
  const kind = useAppStore((s) => s.file.kind)
  const readOnly = useAppStore((s) => s.file.meta.readOnly)
  const view = viewKindFor(fileType, viewAsText)
  const mod = navigator.platform.toLowerCase().includes('mac') ? '⌘' : 'Ctrl'
  const run = (name: 'format' | 'addRow' | 'addColumn' | 'find'): void => getSurface(view)?.commands?.[name]?.()
  const isBinary = kind === 'binary'

  return (
    <div
      className="titlebar-no-drag flex items-center h-11 shrink-0 overflow-x-auto"
      style={{ background: 'var(--lm-chrome)', borderBottom: '1px solid var(--lm-border)', padding: '0 12px', gap: 1 }}
    >
      <TB label="Toggle sidebar" onClick={toggleSidebar}><PanelLeftOpen size={15} strokeWidth={1.6} /></TB>
      <TB label={`Open file · ${mod}O`} onClick={onOpenFile}><FolderOpen size={15} strokeWidth={1.6} /></TB>
      <TB label={`Save · ${mod}S`} disabled={isBinary} onClick={onSaveFile}><Save size={15} strokeWidth={1.6} /></TB>

      {!isBinary && (
        <>
          <Sep />
          <TB label={`Find · ${mod}F`} onClick={() => run('find')}><Search size={15} strokeWidth={1.6} /></TB>

          {view === 'code' && (fileType === 'json' || fileType === 'xml') && !readOnly && (
            <TextButton label="Format" onClick={() => run('format')}><AlignLeft size={14} strokeWidth={1.6} /></TextButton>
          )}

          {view === 'table' && !readOnly && (
            <>
              <TextButton label="Add row" onClick={() => run('addRow')}><Rows3 size={14} strokeWidth={1.6} /></TextButton>
              <TextButton label="Add column" onClick={() => run('addColumn')}><Columns3 size={14} strokeWidth={1.6} /></TextButton>
            </>
          )}

          {fileType === 'csv' && (
            <>
              <Sep />
              <TextButton label={viewAsText ? 'View as table' : 'View as text'} onClick={toggleCsvTextView}>
                {viewAsText ? <Table2 size={14} strokeWidth={1.6} /> : <FileText size={14} strokeWidth={1.6} />}
              </TextButton>
            </>
          )}
        </>
      )}

      <div style={{ flex: 1 }} />
      <TB label="Settings" onClick={() => setSettingsOpen(true)}><Settings size={15} strokeWidth={1.6} /></TB>
    </div>
  )
}
