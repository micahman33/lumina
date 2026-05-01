import { useAppStore } from '../../store/appStore'

interface SidebarProps {
  onOpenFile: (path: string) => void
}

export function Sidebar({ onOpenFile }: SidebarProps): JSX.Element {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const recentFiles = useAppStore((s) => s.recentFiles)

  return (
    <div
      className={`flex flex-col border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 overflow-hidden transition-all duration-200 ease-in-out shrink-0 ${sidebarOpen ? 'w-60' : 'w-0'}`}
    >
      <div className="w-60 flex flex-col h-full">
        <div className="h-11 flex items-center px-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Recent Files
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {recentFiles.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 px-4 py-3">
              No recent files
            </p>
          ) : (
            recentFiles.map((file) => (
              <button
                key={file.path}
                onClick={() => onOpenFile(file.path)}
                className="titlebar-no-drag w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                title={file.path}
              >
                <p className="text-sm text-gray-700 dark:text-gray-300 truncate font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  {file.name}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                  {file.path.replace(file.name, '')}
                </p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
