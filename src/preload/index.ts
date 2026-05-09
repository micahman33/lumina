import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../renderer/src/types/ipc'
import type {
  AppSettings,
  CopyImageArgs,
  OpenFileResult,
  RecentFile,
  SaveAsResult
} from '../renderer/src/types/file'

const api = {
  openFile: (): Promise<OpenFileResult | null> => ipcRenderer.invoke(IPC.FILE_OPEN),

  openFilePath: (path: string): Promise<OpenFileResult | null> =>
    ipcRenderer.invoke(IPC.FILE_OPEN_PATH, path),

  saveFile: (path: string, content: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC.FILE_SAVE, path, content),

  saveFileAs: (content: string, currentPath?: string): Promise<SaveAsResult | null> =>
    ipcRenderer.invoke(IPC.FILE_SAVE_AS, content, currentPath),

  readInitialFile: (): Promise<OpenFileResult | null> =>
    ipcRenderer.invoke(IPC.FILE_READ_INITIAL),

  copyImageToDoc: (args: CopyImageArgs): Promise<string> =>
    ipcRenderer.invoke(IPC.IMAGE_COPY_TO_DOC, args),

  getRecentFiles: (): Promise<RecentFile[]> => ipcRenderer.invoke(IPC.RECENT_GET),

  addRecentFile: (path: string, snippet?: string): Promise<void> =>
    ipcRenderer.invoke(IPC.RECENT_ADD, path, snippet),

  removeRecentFile: (path: string): Promise<void> =>
    ipcRenderer.invoke(IPC.RECENT_REMOVE, path),

  pinRecentFile: (path: string): Promise<RecentFile[]> =>
    ipcRenderer.invoke(IPC.RECENT_PIN, path),

  revealFile: (path: string): Promise<void> =>
    ipcRenderer.invoke(IPC.RECENT_REVEAL, path),

  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke(IPC.SETTINGS_GET),

  setSettings: (partial: Partial<AppSettings>): Promise<void> =>
    ipcRenderer.invoke(IPC.SETTINGS_SET, partial),

  onOpenFile: (callback: (path: string) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, path: string): void => callback(path)
    ipcRenderer.on(IPC.PUSH_OPEN_FILE, handler)
    return () => ipcRenderer.removeListener(IPC.PUSH_OPEN_FILE, handler)
  },

  onMenuSave: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on(IPC.PUSH_MENU_SAVE, handler)
    return () => ipcRenderer.removeListener(IPC.PUSH_MENU_SAVE, handler)
  },

  onThemeChange: (callback: (theme: 'light' | 'dark') => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, theme: 'light' | 'dark'): void =>
      callback(theme)
    ipcRenderer.on(IPC.PUSH_THEME_CHANGE, handler)
    return () => ipcRenderer.removeListener(IPC.PUSH_THEME_CHANGE, handler)
  },

  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('shell:open-external', url),

  getSpellSuggestions: (): Promise<{ misspelledWord: string; suggestions: string[] }> =>
    ipcRenderer.invoke(IPC.SPELL_GET),

  replaceMisspelling: (word: string): void => ipcRenderer.send(IPC.SPELL_REPLACE, word)
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronApi = typeof api
