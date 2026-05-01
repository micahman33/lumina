import { useAppStore } from '../../store/appStore'

export function TitleBar(): JSX.Element {
  const filePath = useAppStore((s) => s.file.path)
  const isDirty = useAppStore((s) => s.file.isDirty)
  const isMac = navigator.platform.toLowerCase().includes('mac')

  const fileName = filePath ? filePath.split(/[/\\]/).pop() ?? 'Untitled' : 'Untitled'

  return (
    <div
      className={`titlebar-drag flex items-center h-10 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 select-none shrink-0 ${isMac ? 'pl-20' : 'pl-4'}`}
    >
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
        {fileName}
        {isDirty && (
          <span className="ml-1 text-gray-400 dark:text-gray-500">•</span>
        )}
      </span>
    </div>
  )
}
