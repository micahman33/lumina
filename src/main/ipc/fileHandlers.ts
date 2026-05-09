import { ipcMain, dialog, BrowserWindow, app, shell } from 'electron'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { basename, extname, join } from 'path'
import { IPC } from '../../renderer/src/types/ipc'
import store from '../store'
import { WELCOME_CONTENT } from '../welcome'
import type { OpenFileResult, RecentFile } from '../../renderer/src/types/file'

/** ~/Documents/Lumina — default home for all Lumina files */
export function luminaDir(): string {
  return join(app.getPath('documents'), 'Lumina')
}

async function ensureLuminaDir(): Promise<void> {
  await mkdir(luminaDir(), { recursive: true })
}

export function registerFileHandlers(): void {
  // Ensure ~/Documents/Lumina exists at startup
  ensureLuminaDir().catch(() => {/* non-fatal */})

  ipcMain.handle(IPC.FILE_OPEN, async (): Promise<OpenFileResult | null> => {
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showOpenDialog(win!, {
      defaultPath: luminaDir(),
      filters: [
        { name: 'All Supported', extensions: ['md', 'markdown', 'txt'] },
        { name: 'Markdown', extensions: ['md', 'markdown'] },
        { name: 'Plain Text', extensions: ['txt'] },
      ],
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

  ipcMain.handle(IPC.FILE_SAVE_AS, async (_, content: string, currentPath?: string) => {
    const win = BrowserWindow.getFocusedWindow()
    // Strip extension from the current filename (if any) so macOS auto-appends
    // the correct extension when the user picks a Format — no double-extension confusion.
    const baseName = currentPath
      ? basename(currentPath, extname(currentPath))
      : 'untitled'
    const result = await dialog.showSaveDialog(win!, {
      defaultPath: join(luminaDir(), baseName),
      filters: [
        { name: 'Markdown', extensions: ['md'] },
        { name: 'Plain Text', extensions: ['txt'] },
      ],
    })
    if (result.canceled || !result.filePath) return null
    await writeFile(result.filePath, content, 'utf8')
    return { path: result.filePath }
  })

  ipcMain.handle(IPC.FILE_READ_INITIAL, async (): Promise<OpenFileResult | null> => {
    // 1. CLI / Open With argument takes highest priority
    const fileArg = process.argv.find((a) =>
      /\.(md|markdown|txt)$/i.test(a) && !a.startsWith('-')
    )
    if (fileArg) {
      try {
        const raw = await readFile(fileArg, 'utf8')
        const content = raw.startsWith('﻿') ? raw.slice(1) : raw
        const existing = store.get('recentFiles').filter((f) => f.path !== fileArg)
        store.set('recentFiles', [
          { path: fileArg, name: basename(fileArg), lastOpened: new Date().toISOString() },
          ...existing
        ].slice(0, 20))
        return { path: fileArg, content }
      } catch {
        return null
      }
    }

    // 2. Reopen the most recent file that still exists on disk
    const recents = store.get('recentFiles')
    for (const recent of recents) {
      try {
        const raw = await readFile(recent.path, 'utf8')
        const content = raw.startsWith('﻿') ? raw.slice(1) : raw
        const rest = recents.filter((f) => f.path !== recent.path)
        store.set('recentFiles', [{ ...recent, lastOpened: new Date().toISOString() }, ...rest])
        return { path: recent.path, content }
      } catch { /* file missing, try next */ }
    }

    // 3. First-ever launch → create Lumina folder + welcome doc
    const settings = store.get('settings')
    if (!settings.welcomeShown) {
      await ensureLuminaDir()
      const welcomePath = join(luminaDir(), 'Welcome to Lumina.md')
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
    // Pinned files are preserved outside the 20-file cap
    const pinned = existing.filter((f) => f.pinned)
    const unpinned = existing.filter((f) => !f.pinned)
    const updated: RecentFile[] = [...pinned, entry, ...unpinned].slice(0, 20 + pinned.length)
    store.set('recentFiles', updated)
  })

  ipcMain.handle(IPC.RECENT_REMOVE, (_, path: string): void => {
    const updated = store.get('recentFiles').filter((f) => f.path !== path)
    store.set('recentFiles', updated)
  })

  ipcMain.handle(IPC.RECENT_PIN, (_, path: string): RecentFile[] => {
    const files = store.get('recentFiles')
    const updated = files.map((f) => f.path === path ? { ...f, pinned: !f.pinned } : f)
    store.set('recentFiles', updated)
    return updated
  })

  ipcMain.handle(IPC.RECENT_REVEAL, (_, path: string): void => {
    shell.showItemInFolder(path)
  })

  ipcMain.handle(IPC.SETTINGS_GET, () => {
    return store.get('settings')
  })

  ipcMain.handle(IPC.SETTINGS_SET, (_, partial) => {
    const current = store.get('settings')
    store.set('settings', { ...current, ...partial })
  })
}
