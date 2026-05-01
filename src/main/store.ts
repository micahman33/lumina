import Store from 'electron-store'
import type { AppSettings, RecentFile } from '../renderer/src/types/file'

interface StoreSchema {
  recentFiles: RecentFile[]
  settings: AppSettings
}

const store = new Store<StoreSchema>({
  defaults: {
    recentFiles: [],
    settings: {
      theme: 'system',
      sidebarOpen: true
    }
  }
})

export default store
