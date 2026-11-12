import Store from 'electron-store'
import type { AppSettings, RecentFile } from '../renderer/src/types/file'

interface StoreSchema {
  recentFiles: RecentFile[]
  settings: AppSettings
  /** Words "Ignore"d in the spell checker this session; removed from the dictionary on quit. */
  ignoredWords: string[]
}

const store = new Store<StoreSchema>({
  defaults: {
    recentFiles: [],
    ignoredWords: [],
    settings: {
      theme: 'system',
      sidebarOpen: true
    }
  }
})

export default store
