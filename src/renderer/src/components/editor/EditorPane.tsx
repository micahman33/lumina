import { lazy, Suspense, useRef, useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import { Toolbar } from './Toolbar'
import { EditorCore } from './EditorCore'
import { StatusBar } from './StatusBar'
import { FindReplacePanel } from './FindReplacePanel'
import { CommandPalette } from './CommandPalette'
import { OutlinePanel } from './OutlinePanel'
import { useAppStore } from '../../store/appStore'
import { useExport } from '../../hooks/useExport'
import { viewKindFor } from '../../utils/txtUtils'
import { SimpleToolbar } from './SimpleToolbar'
import { BinaryNotice, ReadOnlyNotice } from './FileNotices'

// CodeMirror and the table are only needed for non-Markdown files, so they load on demand
// and never slow down opening a Markdown document.
const CodeView = lazy(() => import('../code/CodeView'))
const CsvTableView = lazy(() => import('../table/CsvTableView'))

interface EditorPaneProps {
  editor: Editor
  onOpenFile: () => void
  onSaveFile: () => void
  onSaveFileAs?: () => void
  onNewFile?: () => void
  onOpenFilePath?: (path: string) => void
}

export function EditorPane({
  editor,
  onOpenFile,
  onSaveFile,
  onSaveFileAs,
  onNewFile,
  onOpenFilePath,
}: EditorPaneProps): JSX.Element {
  // Shared image-insert handler — EditorCore exposes it via ref so Toolbar can call it too
  const insertImageRef = useRef<() => void>(() => {})

  const onInsertImage = useCallback(() => {
    insertImageRef.current()
  }, [])

  const handleSaveFileAs = onSaveFileAs ?? (() => {})
  const handleNewFile = onNewFile ?? (() => {})

  const { exportHtml, exportPdf, exportDocx } = useExport(editor)

  const outlineOpen = useAppStore((s) => s.outlineOpen)
  const focusModeOn = useAppStore((s) => s.focusMode)
  const fileType = useAppStore((s) => s.file.fileType)
  const viewAsText = useAppStore((s) => s.file.viewAsText)
  const isBinary = useAppStore((s) => s.file.kind === 'binary')
  const view = viewKindFor(fileType, viewAsText)
  const isRich = view === 'rich' && !isBinary
  // Focus Mode is a Markdown writing feature
  const focusMode = focusModeOn && isRich

  return (
    <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
      {/* Toolbar — hidden in focus mode */}
      <div
        style={{
          transition: 'opacity 200ms ease, transform 200ms ease',
          opacity: focusMode ? 0 : 1,
          transform: focusMode ? 'translateY(-4px)' : 'translateY(0)',
          pointerEvents: focusMode ? 'none' : undefined,
          height: focusMode ? 0 : undefined,
          overflow: focusMode ? 'hidden' : undefined,
          flexShrink: 0,
        }}
      >
        {isRich ? (
          <Toolbar editor={editor} onOpenFile={onOpenFile} onSaveFile={onSaveFile} onInsertImage={onInsertImage} onExportHtml={exportHtml} onExportPdf={exportPdf} onExportDocx={exportDocx} />
        ) : (
          <SimpleToolbar onOpenFile={onOpenFile} onSaveFile={onSaveFile} />
        )}
      </div>

      {/* relative wrapper so FindReplacePanel can position absolutely within the editor area */}
      <div className="flex-1 min-h-0 relative flex flex-row">
        <div className="flex-1 min-w-0 flex flex-col relative">
          <ReadOnlyNotice />
          {isRich && <FindReplacePanel editor={editor} />}
          {/* The TipTap editor stays mounted (hidden) so switching back to Markdown is instant */}
          <div className="flex-1 min-h-0 flex-col" style={{ display: isRich ? 'flex' : 'none' }}>
            <EditorCore editor={editor} insertImageRef={insertImageRef} focusMode={focusMode} />
          </div>
          {isBinary ? (
            <BinaryNotice />
          ) : (
            <Suspense fallback={<div className="flex-1 lm-bg" />}>
              {view === 'code' && <CodeView />}
              {view === 'table' && <CsvTableView />}
            </Suspense>
          )}
        </div>
        {outlineOpen && isRich && !focusMode && <OutlinePanel editor={editor} />}
      </div>

      {/* StatusBar — hidden in focus mode */}
      <div
        style={{
          transition: 'opacity 200ms ease, transform 200ms ease',
          opacity: focusMode ? 0 : 1,
          transform: focusMode ? 'translateY(4px)' : 'translateY(0)',
          pointerEvents: focusMode ? 'none' : undefined,
          height: focusMode ? 0 : undefined,
          overflow: focusMode ? 'hidden' : undefined,
          flexShrink: 0,
        }}
      >
        <StatusBar editor={editor} />
      </div>

      {/* Focus mode exit button */}
      {focusMode && <FocusExitButton />}

      <CommandPalette
        editor={editor}
        onOpenFile={onOpenFile}
        onSaveFile={onSaveFile}
        onSaveFileAs={handleSaveFileAs}
        onNewFile={handleNewFile}
        onOpenFilePath={onOpenFilePath ?? (() => {})}
        richView={isRich}
        onExportHtml={exportHtml}
        onExportPdf={exportPdf}
        onExportDocx={exportDocx}
      />
    </div>
  )
}

function FocusExitButton(): JSX.Element {
  const setFocusMode = useAppStore((s) => s.setFocusMode)
  return (
    <button
      onClick={() => setFocusMode(false)}
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: 12,
        color: 'var(--lm-ink-faint)',
        opacity: 0,
        transition: 'opacity 200ms ease',
        padding: '4px 8px',
        borderRadius: 4,
        zIndex: 100,
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0' }}
      aria-label="Exit focus mode"
    >
      Exit focus mode
    </button>
  )
}
