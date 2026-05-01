import { useAppStore } from '../../store/appStore'
import type { AppSettings } from '../../types/file'

export function SettingsModal(): JSX.Element | null {
  const settingsOpen = useAppStore((s) => s.settingsOpen)
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen)
  const theme = useAppStore((s) => s.theme)
  const setTheme = useAppStore((s) => s.setTheme)

  if (!settingsOpen) return null

  const handleTheme = async (value: AppSettings['theme']): Promise<void> => {
    setTheme(value)
    await window.api.setSettings({ theme: value })
  }

  const options: { value: AppSettings['theme']; label: string; desc: string }[] = [
    { value: 'system', label: 'System', desc: 'Match OS preference' },
    { value: 'light', label: 'Light', desc: 'Always light' },
    { value: 'dark', label: 'Dark', desc: 'Always dark' }
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) setSettingsOpen(false)
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">Settings</h2>
          <button
            onClick={() => setSettingsOpen(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Appearance</p>
          <div className="flex gap-2">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleTheme(opt.value)}
                className={`flex-1 flex flex-col items-center py-3 rounded-lg border-2 transition-colors ${
                  theme === opt.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{opt.label}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
