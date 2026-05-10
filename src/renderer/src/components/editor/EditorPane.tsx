import { useRef, useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import { Toolbar } from './Toolbar'
import { EditorCore } from './EditorCore'
import { StatusBar } from './StatusBar'
import { FindReplacePanel } from './FindReplacePanel'
import { CommandPalette } from './CommandPalette'

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

  return (
    <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
      <Toolbar editor={editor} onOpenFile={onOpenFile} onSaveFile={onSaveFile} onInsertImage={onInsertImage} />
      {/* relative wrapper so FindReplacePanel can position absolutely within the editor area */}
      <div className="flex-1 min-h-0 relative flex flex-col">
        <FindReplacePanel editor={editor} />
        <EditorCore editor={editor} insertImageRef={insertImageRef} />
      </div>
      <StatusBar editor={editor} />
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
