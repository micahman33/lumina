import { TitleBar } from './TitleBar'
import { Sidebar } from './Sidebar'
import { EditorPane } from '../editor/EditorPane'
import { SettingsModal } from '../settings/SettingsModal'
import type { Editor } from '@tiptap/react'

interface AppShellProps {
  editor: Editor
  onOpenFile: () => void
  onSaveFile: () => void
  onOpenFilePath: (path: string) => void
  onNewFile: () => void
}

export function AppShell({ editor, onOpenFile, onSaveFile, onOpenFilePath, onNewFile }: AppShellProps): JSX.Element {
  return (
    <div className="flex flex-col h-screen lm-ink" style={{ background: 'var(--lm-bg)' }}>
      <TitleBar />
      <div className="flex flex-1 min-h-0">
        <Sidebar onOpenFile={onOpenFilePath} onNewFile={onNewFile} />
        <EditorPane editor={editor} onOpenFile={onOpenFile} onSaveFile={onSaveFile} />
      </div>
      <SettingsModal />
    </div>
  )
}
