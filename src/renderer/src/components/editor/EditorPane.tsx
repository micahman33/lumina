import { useRef, useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import { Toolbar } from './Toolbar'
import { EditorCore } from './EditorCore'
import { StatusBar } from './StatusBar'
import { FindReplacePanel } from './FindReplacePanel'
import { CommandPalette } from './CommandPalette'
import { OutlinePanel } from './OutlinePanel'
import { useAppStore } from '../../store/appStore'

interface EditorPaneProps {
  editor: Editor
  onOpenFile: () => void
  onSaveFile: () => void
  onSaveFileAs?: () => void
  onNewFile?: () => void
}

export function EditorPane({
  editor,
  onOpenFile,
  onSaveFile,
  onSaveFileAs,
  onNewFile,
}: EditorPaneProps): JSX.Element {
  // Shared image-insert handler — EditorCore exposes it via ref so Toolbar can call it too
  const insertImageRef = useRef<() => void>(() => {})

  const onInsertImage = useCallback(() => {
    insertImageRef.current()
  }, [])

  const handleSaveFileAs = onSaveFileAs ?? (() => {})
  const handleNewFile = onNewFile ?? (() => {})

  const outlineOpen = useAppStore((s) => s.outlineOpen)
  const focusMode = useAppStore((s) => s.focusMode)

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
        <Toolbar editor={editor} onOpenFile={onOpenFile} onSaveFile={onSaveFile} onInsertImage={onInsertImage} />
      </div>

      {/* relative wrapper so FindReplacePanel can position absolutely within the editor area */}
      <div className="flex-1 min-h-0 relative flex flex-row">
        <div className="flex-1 min-w-0 flex flex-col relative">
          <FindReplacePanel editor={editor} />
          <EditorCore editor={editor} insertImageRef={insertImageRef} focusMode={focusMode} />
        </div>
        {outlineOpen && !focusMode && <OutlinePanel editor={editor} />}
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
