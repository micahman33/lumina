import { create } from 'zustand'
import type { AppSettings, FileState, RecentFile } from '../types/file'

interface AppState {
  file: FileState
  theme: AppSettings['theme']
  sidebarOpen: boolean
  recentFiles: RecentFile[]
  settingsOpen: boolean
  linkDialogOpen: boolean

  setFile: (file: Partial<FileState>) => void
  markDirty: (dirty: boolean) => void
  setTheme: (theme: AppSettings['theme']) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setRecentFiles: (files: RecentFile[]) => void
  setSettingsOpen: (open: boolean) => void
  setLinkDialogOpen: (open: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  file: { path: null, content: '', isDirty: false },
  theme: 'system',
  sidebarOpen: true,
  recentFiles: [],
  settingsOpen: false,
  linkDialogOpen: false,

  setFile: (partial) =>
    set((state) => ({ file: { ...state.file, ...partial } })),

  markDirty: (dirty) =>
    set((state) => ({ file: { ...state.file, isDirty: dirty } })),

  setTheme: (theme) => set({ theme }),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  setRecentFiles: (files) => set({ recentFiles: files }),

  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setLinkDialogOpen: (open) => set({ linkDialogOpen: open })
}))
