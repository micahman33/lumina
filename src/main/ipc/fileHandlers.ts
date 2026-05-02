import { ipcMain, dialog, BrowserWindow, app } from 'electron'
import { readFile, writeFile } from 'fs/promises'
import { basename, join } from 'path'
import { IPC } from '../../renderer/src/types/ipc'
import store from '../store'
import { WELCOME_CONTENT } from '../welcome'
import type { OpenFileResult, RecentFile } from '../../renderer/src/types/file'

export function registerFileHandlers(): void {
  ipcMain.handle(IPC.FILE_OPEN, async (): Promise<OpenFileResult | null> => {
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showOpenDialog(win!, {
      filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }],
      properties: ['openFile']
    })
    if (result.canceled || !result.filePaths[0]) return null
    const filePath = result.filePaths[0]
    const raw = await readFile(filePath, 'utf8')
    const content = raw.startsWith('﻿') ? raw.slice(1) : raw
    return { path: filePath, content }
  })

  ipcMain.handle(IPC.FILE_OPEN_PATH, async (_, path: string): Promise<OpenFileResult | null> => {
    try {
      const raw = await readFile(path, 'utf8')
      const content = raw.startsWith('﻿') ? raw.slice(1) : raw
      return { path, content }
    } catch {
      return null
    }
  })

  ipcMain.handle(IPC.FILE_SAVE, async (_, path: string, content: string): Promise<boolean> => {
    try {
      await writeFile(path, content, 'utf8')
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle(IPC.FILE_SAVE_AS, async (_, content: string) => {
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showSaveDialog(win!, {
      filters: [{ name: 'Markdown', extensions: ['md'] }],
      defaultPath: 'untitled.md'
    })
    if (result.canceled || !result.filePath) return null
    await writeFile(result.filePath, content, 'utf8')
    return { path: result.filePath }
  })

  ipcMain.handle(IPC.FILE_READ_INITIAL, async (): Promise<OpenFileResult | null> => {
    // 1. CLI / Open With argument takes highest priority
    const mdArg = process.argv.find((a) => a.endsWith('.md') || a.endsWith('.markdown'))
    if (mdArg) {
      try {
        const raw = await readFile(mdArg, 'utf8')
        const content = raw.startsWith('﻿') ? raw.slice(1) : raw
        // Bump to top of recents
        const existing = store.get('recentFiles').filter((f) => f.path !== mdArg)
        store.set('recentFiles', [
          { path: mdArg, name: basename(mdArg), lastOpened: new Date().toISOString() },
          ...existing
        ].slice(0, 20))
        return { path: mdArg, content }
      } catch {
        return null
      }
    }

    // 2. Reopen the most recent file (skipping any that no longer exist on disk)
    const recents = store.get('recentFiles')
    for (const recent of recents) {
      try {
        const raw = await readFile(recent.path, 'utf8')
        const content = raw.startsWith('﻿') ? raw.slice(1) : raw
        // Update lastOpened
        const rest = recents.filter((f) => f.path !== recent.path)
        store.set('recentFiles', [
          { ...recent, lastOpened: new Date().toISOString() },
          ...rest
        ])
        return { path: recent.path, content }
      } catch {
        // File missing — try next
      }
    }

    // 3. No recents → write and open the welcome document on first launch
    const settings = store.get('settings')
    const welcomePath = join(app.getPath('documents'), 'Welcome to Lumina.md')
    if (!settings.welcomeShown) {
      try {
        await writeFile(welcomePath, WELCOME_CONTENT, 'utf8')
        store.set('settings', { ...settings, welcomeShown: true })
        store.set('recentFiles', [
          { path: welcomePath, name: 'Welcome to Lumina.md', lastOpened: new Date().toISOString() }
        ])
        return { path: welcomePath, content: WELCOME_CONTENT }
      } catch {
        store.set('settings', { ...settings, welcomeShown: true })
      }
    }

    return null
  })

  ipcMain.handle(IPC.RECENT_GET, (): RecentFile[] => {
    return store.get('recentFiles')
  })

  ipcMain.handle(IPC.RECENT_ADD, (_, path: string, snippet?: string): void => {
    const name = basename(path)
    const existing = store.get('recentFiles').filter((f) => f.path !== path)
    const entry: RecentFile = { path, name, lastOpened: new Date().toISOString() }
    if (snippet) entry.snippet = snippet
    const updated: RecentFile[] = [entry, ...existing].slice(0, 20)
    store.set('recentFiles', updated)
  })

  ipcMain.handle(IPC.SETTINGS_GET, () => {
    return store.get('settings')
  })

  ipcMain.handle(IPC.SETTINGS_SET, (_, partial) => {
    const current = store.get('settings')
    store.set('settings', { ...current, ...partial })
  })
}
