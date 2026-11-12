import { app, BrowserWindow, ipcMain, dialog, nativeTheme, protocol, session, shell } from 'electron'
import { join } from 'path'
import { registerAllHandlers } from './ipc'
import { registerMediaProtocol } from './ipc/imageHandlers'
import { buildMenu } from './menu'
import { applyWindowState, trackWindowState } from './windowState'
import { initUpdater } from './updater'
import { IPC } from '../renderer/src/types/ipc'
import store from './store'
import { findFileArg, setPendingOpenPath } from './pendingOpen'

let mainWindow: BrowserWindow | null = null
let allowClose = false
// Set when the user picked "Save" on the close prompt during a quit, so the quit resumes
// once the renderer reports the save finished.
let quitAfterSave = false
// Words the user chose to "Ignore". Chromium has no per-session ignore list, so they are
// added to the spellchecker dictionary and removed again on quit. The list is also kept in
// the store so a crash (or a removal that didn't flush) is cleaned up on the next launch.
const ignoredWords = new Set<string>()

function forgetIgnoredWords(): void {
  const words = new Set([...ignoredWords, ...store.get('ignoredWords')])
  for (const word of words) session.defaultSession.removeWordFromSpellCheckerDictionary(word)
  ignoredWords.clear()
  store.set('ignoredWords', [])
}

/** Hand a file to the renderer, or hold it until the renderer asks for its initial file. */
function openPathInWindow(path: string): void {
  if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isLoading()) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
    mainWindow.webContents.send(IPC.PUSH_OPEN_FILE, path)
  } else {
    setPendingOpenPath(path)
  }
}

// One running copy per user: on Windows, double-clicking a document while Lumina is open
// starts a second process, which hands its file to the first and exits. Packaged builds
// only, so `npm run dev` still works while the installed app is open.
if (app.isPackaged) {
  if (!app.requestSingleInstanceLock()) {
    app.quit()
  } else {
    app.on('second-instance', (_e, argv) => {
      const path = findFileArg(argv.slice(1))
      if (path) openPathInWindow(path)
      else if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.focus()
      }
    })
  }
}
// Tracks whether the window close was triggered by Cmd+Q / app.quit()
// so we can call app.quit() again after our async dialog finishes.
let isQuitting = false

// Must be registered before app.on('ready') on macOS
app.on('open-file', (event, path) => {
  event.preventDefault()
  openPathInWindow(path)
})

// Set the quitting flag as early as possible so the close handler can read it.
app.on('before-quit', () => {
  isQuitting = true
})

// Runs only once quitting is really under way (before-quit also fires if the user cancels
// the unsaved-changes dialog), so "Ignore"d words stay ignored for the whole session.
// The window is already gone by now, so this must not go through mainWindow.
app.on('will-quit', forgetIgnoredWords)

protocol.registerSchemesAsPrivileged([
  { scheme: 'media', privileges: { secure: true, standard: true, bypassCSP: true } }
])

function createWindow(): void {
  const isMac = process.platform === 'darwin'
  const isWin = process.platform === 'win32'

  // Reset per-window flags
  allowClose = false
  isQuitting = false
  quitAfterSave = false

  // Resolve icon relative to the app root (works both in dev and after packaging)
  const appRoot = app.isPackaged ? join(__dirname, '../../..') : join(__dirname, '../../..')
  const iconPath = isWin
    ? join(appRoot, 'build/icon.ico')
    : isMac
    ? join(appRoot, 'build/icon.icns')
    : join(appRoot, 'build/icon.png')

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 600,
    minHeight: 400,
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    frame: !isMac,
    backgroundColor: '#ffffff',
    icon: iconPath,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: true
    },
    show: false
  })

  applyWindowState(mainWindow)
  trackWindowState(mainWindow)

  // Chromium only emits this native event when the page does NOT cancel the DOM
  // `contextmenu` event. Forward the OS spell-check data to the renderer, which opens its
  // own custom menu from it (Electron shows no native menu unless we build one).
  mainWindow.webContents.on('context-menu', (_e, params) => {
    mainWindow?.webContents.send(IPC.PUSH_CONTEXT_MENU, {
      x: params.x,
      y: params.y,
      misspelledWord: params.misspelledWord ?? '',
      suggestions: params.dictionarySuggestions ?? []
    })
  })

  // Keep the window on our own content: block any navigation away from the app
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== mainWindow?.webContents.getURL()) event.preventDefault()
  })

  // Redirect all window.open / target=_blank calls to the system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow!.show()
    // Only check for updates in packaged builds — not during development
    if (app.isPackaged) initUpdater(mainWindow!)
  })

  // Null out the reference once the window is fully gone so isDestroyed()
  // checks elsewhere don't need to be the last line of defence.
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.on('close', async (event) => {
    // Already cleared to close — let it through.
    if (allowClose) return
    event.preventDefault()

    // Capture the quit intent before any async gap.
    const shouldQuit = isQuitting

    // Window may have been destroyed during the async gap — bail out safely.
    if (!mainWindow || mainWindow.isDestroyed()) return

    const isDirty = await mainWindow.webContents.executeJavaScript(
      'window.__lumina_isDirty__ || false'
    )

    if (!mainWindow || mainWindow.isDestroyed()) return

    if (!isDirty) {
      allowClose = true
      mainWindow.close()
      if (shouldQuit) app.quit()
      return
    }

    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: 'question',
      buttons: ['Save', "Don't Save", 'Cancel'],
      defaultId: 0,
      cancelId: 2,
      message: 'Do you want to save changes?',
      detail: 'Your changes will be lost if you close without saving.'
    })

    if (!mainWindow || mainWindow.isDestroyed()) return

    if (choice === 0) {
      // The renderer saves (showing Save As for an untitled document) and answers with
      // CLOSE_AFTER_SAVE only if the save really happened. If it fails or is cancelled the
      // window simply stays open.
      quitAfterSave = shouldQuit
      mainWindow.webContents.send(IPC.PUSH_SAVE_AND_CLOSE)
    } else if (choice === 1) {
      allowClose = true
      mainWindow.close()
      if (shouldQuit) app.quit()
    }
    // choice === 2: Cancel — stay open, clear the quit flag.
    isQuitting = false
  })

  buildMenu(mainWindow)

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  // Register all IPC handlers once — NOT inside createWindow()
  registerAllHandlers()
  registerMediaProtocol()

  // Words left over from a session that didn't shut down cleanly
  forgetIgnoredWords()
  setPendingOpenPath(findFileArg(process.argv.slice(1)))

  // Renderer picked a suggestion — use Chromium's built-in replaceMisspelling
  ipcMain.on(IPC.SPELL_REPLACE, (_e, word: string) => {
    if (typeof word === 'string') mainWindow?.webContents.replaceMisspelling(word)
  })

  // "Add to Dictionary" persists (and uses the OS custom dictionary on macOS/Windows)
  ipcMain.on(IPC.SPELL_ADD_WORD, (_e, word: string) => {
    if (typeof word === 'string' && word.trim()) {
      mainWindow?.webContents.session.addWordToSpellCheckerDictionary(word)
      // A word that was only ignored is now a keeper — don't remove it on quit
      if (ignoredWords.delete(word)) store.set('ignoredWords', [...ignoredWords])
    }
  })

  // "Ignore" suppresses the underline until the app quits
  ipcMain.on(IPC.SPELL_IGNORE_WORD, (_e, word: string) => {
    if (typeof word === 'string' && word.trim()) {
      mainWindow?.webContents.session.addWordToSpellCheckerDictionary(word)
      ignoredWords.add(word)
      store.set('ignoredWords', [...ignoredWords])
    }
  })

  // shell:open-external — used by the renderer for link clicks
  ipcMain.handle('shell:open-external', (_, url: string) => {
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:')) {
      shell.openExternal(url)
    }
  })

  // Sent by renderer after it finishes saving when close was triggered
  ipcMain.on(IPC.CLOSE_AFTER_SAVE, () => {
    const shouldQuit = quitAfterSave
    quitAfterSave = false
    allowClose = true
    mainWindow?.close()
    if (shouldQuit) app.quit()
  })

  // Push OS theme changes to the renderer
  nativeTheme.on('updated', () => {
    const theme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC.PUSH_THEME_CHANGE, theme)
    }
  })

  createWindow()

  // macOS: re-create window when clicking dock icon with no windows open
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
