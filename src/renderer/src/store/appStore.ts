import { create } from 'zustand'
import { DEFAULT_META } from '../types/file'
import type { AppSettings, FileState, RecentFile } from '../types/file'

/** What the code and table views report to the status bar. */
export interface ViewStatus {
  line?: number
  col?: number
  errors?: number
  rows?: number
  cols?: number
  note?: string
}

export const EMPTY_FILE: FileState = {
  path: null,
  content: '',
  isDirty: false,
  fileType: 'md',
  meta: DEFAULT_META,
  kind: 'text',
  size: 0,
  viewAsText: false,
  loadId: 0,
}

/** In-memory scratchpad: content of the current unsaved new file */
export interface DraftState {
  content: string       // raw markdown / text
  createdAt: string     // ISO timestamp — used as stable key
}

interface AppState {
  file: FileState
  draft: DraftState | null
  theme: AppSettings['theme']
  sidebarOpen: boolean
  recentFiles: RecentFile[]
  settingsOpen: boolean
  linkDialogOpen: boolean
  findReplaceOpen: boolean
  sidebarSearch: string
  commandPaletteOpen: boolean
  outlineOpen: boolean
  focusMode: boolean
  toast: { message: string; type: 'success' | 'error' } | null
  viewStatus: ViewStatus
  /** A save conflict was cancelled: auto-save stays off until the user saves by hand. */
  saveBlocked: boolean

  setViewStatus: (status: ViewStatus) => void
  setSaveBlocked: (blocked: boolean) => void
  setFile: (file: Partial<FileState>) => void
  markDirty: (dirty: boolean) => void
  saveDraft: (content: string) => void
  clearDraft: () => void
  setTheme: (theme: AppSettings['theme']) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setRecentFiles: (files: RecentFile[]) => void
  setSettingsOpen: (open: boolean) => void
  setLinkDialogOpen: (open: boolean) => void
  setFindReplaceOpen: (open: boolean) => void
  setSidebarSearch: (q: string) => void
  setCommandPaletteOpen: (open: boolean) => void
  setOutlineOpen: (open: boolean) => void
  setFocusMode: (on: boolean) => void
  showToast: (message: string, type: 'success' | 'error') => void
  dismissToast: () => void
}

export const useAppStore = create<AppState>((set) => ({
  file: EMPTY_FILE,
  viewStatus: {},
  saveBlocked: false,
  draft: null,
  theme: 'system',
  sidebarOpen: true,
  recentFiles: [],
  settingsOpen: false,
  linkDialogOpen: false,
  findReplaceOpen: false,
  sidebarSearch: '',
  commandPaletteOpen: false,
  outlineOpen: false,
  focusMode: false,
  toast: null,

  setFile: (partial) =>
    set((state) => ({ file: { ...state.file, ...partial } })),

  // Always produces a new state, even when the flag is unchanged: the auto-save timer
  // restarts on every store update, which is what makes it wait for a pause in typing.
  markDirty: (dirty) =>
    set((state) => ({ file: { ...state.file, isDirty: dirty } })),

  saveDraft: (content) =>
    set((state) => ({
      draft: { content, createdAt: state.draft?.createdAt ?? new Date().toISOString() }
    })),

  clearDraft: () => set({ draft: null }),

  setViewStatus: (viewStatus) => set({ viewStatus }),
  setSaveBlocked: (saveBlocked) => set({ saveBlocked }),

  setTheme: (theme) => set({ theme }),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  setRecentFiles: (files) => set({ recentFiles: files }),

  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setLinkDialogOpen: (open) => set({ linkDialogOpen: open }),
  setFindReplaceOpen: (open) => set({ findReplaceOpen: open }),
  setSidebarSearch: (q) => set({ sidebarSearch: q }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setOutlineOpen: (open) => set({ outlineOpen: open }),
  setFocusMode: (on) => set({ focusMode: on }),
  showToast: (message, type) => set({ toast: { message, type } }),
  dismissToast: () => set({ toast: null }),
}))
