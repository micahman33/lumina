import { useAppStore } from '../../store/appStore'
import type { Editor } from '@tiptap/react'

interface StatusBarProps {
  editor: Editor | null
}

export function StatusBar({ editor }: StatusBarProps): JSX.Element {
  const filePath = useAppStore((s) => s.file.path)
  const isDirty = useAppStore((s) => s.file.isDirty)

  const wordCount = editor
    ? (editor.storage as { wordCount?: number }).wordCount ?? 0
    : 0

  return (
    <div className="flex items-center justify-between px-4 py-1 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs text-gray-400 dark:text-gray-500 shrink-0 select-none">
      <span className="truncate max-w-xs" title={filePath ?? undefined}>
        {filePath ?? 'Unsaved document'}
        {isDirty && ' — unsaved changes'}
      </span>
      <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
    </div>
  )
}
