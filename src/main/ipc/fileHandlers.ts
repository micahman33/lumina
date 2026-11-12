import { ipcMain, dialog, BrowserWindow, app, shell } from 'electron'
import { readFile, writeFile, mkdir, rename, access, stat } from 'fs/promises'
import { basename, extname, join, dirname } from 'path'
import { IPC } from '../../renderer/src/types/ipc'
import store from '../store'
import { WELCOME_CONTENT } from '../welcome'
import { takePendingOpenPath } from '../pendingOpen'
import type { FileMeta, OpenFileResult, RecentFile, SaveAsResult, SaveResult } from '../../renderer/src/types/file'
import { decodeBuffer, encodeText } from '../textFile'
import { showOpenDocumentDialog } from '../openDialog'

/** ~/Documents/Lumina — default home for all Lumina files */
export function luminaDir(): string {
  return join(app.getPath('documents'), 'Lumina')
}

async function ensureLuminaDir(): Promise<void> {
  await mkdir(luminaDir(), { recursive: true })
}

const LARGE_FILE_BYTES = 50 * 1024 * 1024

/**
 * Read a document from disk for the renderer. Returns null if the file can't be read or the
 * user declines to open a very large one.
 */
export async function openPath(path: string): Promise<OpenFileResult | null> {
  try {
    const info = await stat(path)
    if (!info.isFile()) return null
    if (info.size > LARGE_FILE_BYTES) {
      const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
      const message = {
        type: 'warning' as const,
        buttons: ['Open Anyway', 'Cancel'],
        defaultId: 1,
        cancelId: 1,
        message: `${basename(path)} is ${Math.round(info.size / 1024 / 1024)} MB`,
        detail: 'Files this large can make Lumina slow or unresponsive.'
      }
      const { response } = win ? await dialog.showMessageBox(win, message) : await dialog.showMessageBox(message)
      if (response !== 0) return null
    }
    const decoded = decodeBuffer(await readFile(path))
    return { path, size: info.size, mtimeMs: info.mtimeMs, ...decoded }
  } catch {
    return null
  }
}

/** Save As offers the document's own type first, so a .json stays a .json. */
function saveFilters(currentPath?: string): Electron.FileFilter[] {
  const ext = currentPath ? extname(currentPath).slice(1).toLowerCase() : ''
  const markdown = [
    { name: 'Markdown', extensions: ['md'] },
    { name: 'Plain Text', extensions: ['txt'] }
  ]
  if (!ext || ext === 'md' || ext === 'markdown') return markdown
  if (ext === 'txt') return [markdown[1], markdown[0]]
  return [
    { name: `${ext.toUpperCase()} file`, extensions: [ext] },
    { name: 'All Files', extensions: ['*'] }
  ]
}

/** Returns a user-facing reason the name can't be used, or null if it is fine. */
export function validateFileName(name: string): string | null {
  if (typeof name !== 'string' || !name.trim()) return 'The file name can\'t be empty'
  if (name === '.' || name === '..') return 'That name isn\'t allowed'
  // Path separators would move the file to another folder; the rest are illegal on Windows
  if (/[\\/:*?"<>|\u0000-\u001f]/.test(name)) {
    return 'A file name can\'t contain any of: \\ / : * ? " < > |'
  }
  return null
}

export function registerFileHandlers(): void {
  // Ensure ~/Documents/Lumina exists at startup
  ensureLuminaDir().catch(() => {/* non-fatal */})

  ipcMain.handle(IPC.FILE_OPEN, async (): Promise<OpenFileResult | null> => {
    const filePath = await showOpenDocumentDialog(BrowserWindow.getFocusedWindow(), luminaDir())
    return filePath ? openPath(filePath) : null
  })

  ipcMain.handle(IPC.FILE_OPEN_PATH, (_, path: string): Promise<OpenFileResult | null> => openPath(path))

  ipcMain.handle(
    IPC.FILE_SAVE,
    async (_, path: string, content: string, meta: FileMeta, force?: boolean): Promise<SaveResult> => {
      try {
        if (meta.readOnly) return { ok: false, reason: 'error' }
        // Never overwrite a file another program changed since we read it (a log still being
        // written, a config edited elsewhere) unless the user explicitly chose to.
        if (!force && meta.mtimeMs !== null) {
          const onDisk = await stat(path).then((s) => s.mtimeMs, () => null)
          if (onDisk !== null && onDisk > meta.mtimeMs + 1) return { ok: false, reason: 'conflict' }
        }
        await writeFile(path, encodeText(content, meta))
        return { ok: true, mtimeMs: (await stat(path)).mtimeMs }
      } catch {
        return { ok: false, reason: 'error' }
      }
    }
  )

  ipcMain.handle(IPC.FILE_STAT, (_, path: string): Promise<number | null> =>
    stat(path).then((s) => s.mtimeMs, () => null)
  )

  ipcMain.handle(
    IPC.FILE_CONFIRM_CONFLICT,
    async (_, name: string): Promise<'overwrite' | 'reload' | 'cancel'> => {
      const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
      const options = {
        type: 'warning' as const,
        buttons: ['Overwrite', 'Reload from Disk', 'Cancel'],
        defaultId: 2,
        cancelId: 2,
        message: `${name} has changed on disk`,
        detail:
          'Another program changed this file after Lumina opened it. Overwrite replaces the ' +
          'file with your version. Reload discards your unsaved edits.'
      }
      const { response } = win ? await dialog.showMessageBox(win, options) : await dialog.showMessageBox(options)
      return response === 0 ? 'overwrite' : response === 1 ? 'reload' : 'cancel'
    }
  )

  ipcMain.handle(IPC.FILE_SAVE_AS, async (_, content: string, currentPath: string | undefined, meta: FileMeta): Promise<SaveAsResult | null> => {
    const win = BrowserWindow.getFocusedWindow()
    // Strip extension from the current filename (if any) so macOS auto-appends
    // the correct extension when the user picks a Format — no double-extension confusion.
    const baseName = currentPath
      ? basename(currentPath, extname(currentPath))
      : 'untitled'
    const result = await dialog.showSaveDialog(win!, {
      defaultPath: join(luminaDir(), baseName),
      filters: saveFilters(currentPath),
    })
    if (result.canceled || !result.filePath) return null
    await writeFile(result.filePath, encodeText(content, meta))
    return { path: result.filePath, mtimeMs: (await stat(result.filePath)).mtimeMs }
  })

  ipcMain.handle(IPC.FILE_READ_INITIAL, async (): Promise<OpenFileResult | null> => {
    // 1. CLI / Open With argument takes highest priority
    //    (macOS open-file events that arrived before the window was ready land here too)
    const fileArg = takePendingOpenPath()
    if (fileArg) {
      const opened = await openPath(fileArg)
      if (opened) {
        const existing = store.get('recentFiles').filter((f) => f.path !== fileArg)
        store.set('recentFiles', [
          { path: fileArg, name: basename(fileArg), lastOpened: new Date().toISOString() },
          ...existing
        ].slice(0, 20))
      }
      return opened
    }

    // 2. Reopen the most recent file that still exists on disk
    const recents = store.get('recentFiles')
    for (const recent of recents) {
      const exists = await access(recent.path).then(() => true, () => false)
      if (!exists) continue // file missing, try next
      const opened = await openPath(recent.path)
      if (!opened) continue
      const rest = recents.filter((f) => f.path !== recent.path)
      store.set('recentFiles', [{ ...recent, lastOpened: new Date().toISOString() }, ...rest])
      return opened
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
        return openPath(welcomePath)
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

  ipcMain.handle(IPC.RECENT_RENAME, async (_, oldPath: string, newName: string): Promise<{ newPath: string } | { error: string }> => {
    const invalid = validateFileName(newName)
    if (invalid) return { error: invalid }
    try {
      const newPath = join(dirname(oldPath), newName)
      // fs.rename silently replaces an existing file. A case-only change (notes.md →
      // Notes.md) resolves to the same file on case-insensitive disks, so let that through.
      if (newPath.toLowerCase() !== oldPath.toLowerCase()) {
        const taken = await access(newPath).then(() => true, () => false)
        if (taken) return { error: `A file named "${newName}" already exists in this folder` }
      }
      await rename(oldPath, newPath)
      // Update the entry in recents
      const files = store.get('recentFiles')
      const updated = files.map((f) =>
        f.path === oldPath ? { ...f, path: newPath, name: newName } : f
      )
      store.set('recentFiles', updated)
      return { newPath }
    } catch {
      return { error: `Couldn't rename the file to "${newName}"` }
    }
  })

  ipcMain.handle(IPC.SETTINGS_GET, () => {
    return store.get('settings')
  })

  ipcMain.handle(IPC.SETTINGS_SET, (_, partial) => {
    const current = store.get('settings')
    store.set('settings', { ...current, ...partial })
  })

  ipcMain.handle(IPC.EXPORT_HTML, async (_, args: { defaultPath: string; content: string }) => {
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showSaveDialog(win!, {
      defaultPath: args.defaultPath,
      filters: [{ name: 'HTML', extensions: ['html'] }],
    })
    if (result.canceled || !result.filePath) return null
    await writeFile(result.filePath, args.content, 'utf8')
    return { path: result.filePath }
  })

  ipcMain.handle(IPC.EXPORT_DOCX, async (_, args: { defaultPath: string; html: string; title: string }) => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null
    const result = await dialog.showSaveDialog(win, {
      defaultPath: args.defaultPath,
      filters: [{ name: 'Word Document', extensions: ['docx'] }],
    })
    if (result.canceled || !result.filePath) return null
    // Dynamically import to avoid bundling issues with ESM-only package
    const HTMLtoDOCX = (await import('html-to-docx')).default
    const docxBuffer = await HTMLtoDOCX(args.html, undefined, {
      title: args.title,
      font: 'Calibri',
      fontSize: 24,
      margins: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
    }) as Buffer
    await writeFile(result.filePath, docxBuffer)
    return { path: result.filePath }
  })

  ipcMain.handle(IPC.EXPORT_PDF, async (_, args: { defaultPath: string }) => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null
    const result = await dialog.showSaveDialog(win, {
      defaultPath: args.defaultPath,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    })
    if (result.canceled || !result.filePath) return null
    const data = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'Letter',
      margins: { marginType: 'custom', top: 72, bottom: 72, left: 72, right: 72 },
    })
    await writeFile(result.filePath, data)
    return { path: result.filePath }
  })
}
