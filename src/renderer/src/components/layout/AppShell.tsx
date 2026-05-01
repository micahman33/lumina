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
}

export function AppShell({ editor, onOpenFile, onSaveFile, onOpenFilePath }: AppShellProps): JSX.Element {
  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <TitleBar />
      <div className="flex flex-1 min-h-0">
        <Sidebar onOpenFile={onOpenFilePath} />
        <EditorPane editor={editor} onOpenFile={onOpenFile} onSaveFile={onSaveFile} />
      </div>
      <SettingsModal />
    </div>
  )
}
