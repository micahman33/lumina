import { TitleBar } from './TitleBar'
import { Sidebar } from './Sidebar'
import { EditorPane } from '../editor/EditorPane'
import { SettingsModal } from '../settings/SettingsModal'
import { useAppStore } from '../../store/appStore'
import type { Editor } from '@tiptap/react'

interface AppShellProps {
  editor: Editor
  onOpenFile: () => void
  onSaveFile: () => void
  onOpenFilePath: (path: string) => void
  onNewFile: () => void
}

export function AppShell({ editor, onOpenFile, onSaveFile, onOpenFilePath, onNewFile }: AppShellProps): JSX.Element {
  const focusMode = useAppStore((s) => s.focusMode)

  return (
    <div className="flex flex-col h-screen lm-ink" style={{ background: 'var(--lm-bg)' }}>
      {/* TitleBar: in focus mode collapse to a minimal drag region */}
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
        <TitleBar />
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar: hidden in focus mode */}
        <div
          style={{
            transition: 'opacity 200ms ease, transform 200ms ease',
            opacity: focusMode ? 0 : 1,
            transform: focusMode ? 'translateX(-8px)' : 'translateX(0)',
            pointerEvents: focusMode ? 'none' : undefined,
            width: focusMode ? 0 : undefined,
            overflow: focusMode ? 'hidden' : undefined,
            flexShrink: 0,
          }}
        >
          <Sidebar onOpenFile={onOpenFilePath} onNewFile={onNewFile} />
        </div>
        <EditorPane editor={editor} onOpenFile={onOpenFile} onSaveFile={onSaveFile} />
      </div>
      <SettingsModal />
    </div>
  )
}
