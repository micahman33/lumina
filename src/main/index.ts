import { app, BrowserWindow, ipcMain, dialog, nativeTheme, protocol, shell } from 'electron'
import { join } from 'path'
import { registerAllHandlers } from './ipc'
import { registerMediaProtocol } from './ipc/imageHandlers'
import { buildMenu } from './menu'
import { applyWindowState, trackWindowState } from './windowState'
import { initUpdater } from './updater'
import { IPC } from '../renderer/src/types/ipc'

let mainWindow: BrowserWindow | null = null
let pendingOpenPath: string | null = null
let allowClose = false
// Words the user chose to "Ignore". Chromium has no per-session ignore list, so they are
// added to the spellchecker dictionary and removed again on quit.
const ignoredWords = new Set<string>()
// Tracks whether the window close was triggered by Cmd+Q / app.quit()
// so we can call app.quit() again after our async dialog finishes.
let isQuitting = false

// Must be registered before app.on('ready') on macOS
app.on('open-file', (event, path) => {
  event.preventDefault()
  pendingOpenPath = path
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(IPC.PUSH_OPEN_FILE, path)
  }
})

// Set the quitting flag as early as possible so the close handler can read it.
app.on('before-quit', () => {
  isQuitting = true
})

// Runs only once quitting is really under way (before-quit also fires if the user cancels
// the unsaved-changes dialog), so "Ignore"d words stay ignored for the whole session.
app.on('will-quit', () => {
  const ses = mainWindow && !mainWindow.isDestroyed() ? mainWindow.webContents.session : null
  if (ses) for (const word of ignoredWords) ses.removeWordFromSpellCheckerDictionary(word)
  ignoredWords.clear()
})

protocol.registerSchemesAsPrivileged([
  { scheme: 'media', privileges: { secure: true, standard: true, bypassCSP: true } }
])

function createWindow(): void {
  const isMac = process.platform === 'darwin'
  const isWin = process.platform === 'win32'

  // Reset per-window flags
  allowClose = false
  isQuitting = false

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
    if (pendingOpenPath) {
      mainWindow!.webContents.send(IPC.PUSH_OPEN_FILE, pendingOpenPath)
      pendingOpenPath = null
    }
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
      mainWindow.webContents.send(IPC.PUSH_MENU_SAVE)
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          allowClose = true
          mainWindow.close()
        }
        if (shouldQuit) app.quit()
      }, 500)
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

  // Renderer picked a suggestion — use Chromium's built-in replaceMisspelling
  ipcMain.on(IPC.SPELL_REPLACE, (_e, word: string) => {
    if (typeof word === 'string') mainWindow?.webContents.replaceMisspelling(word)
  })

  // "Add to Dictionary" persists (and uses the OS custom dictionary on macOS/Windows)
  ipcMain.on(IPC.SPELL_ADD_WORD, (_e, word: string) => {
    if (typeof word === 'string' && word.trim()) {
      mainWindow?.webContents.session.addWordToSpellCheckerDictionary(word)
    }
  })

  // "Ignore" suppresses the underline until the app quits
  ipcMain.on(IPC.SPELL_IGNORE_WORD, (_e, word: string) => {
    if (typeof word === 'string' && word.trim()) {
      mainWindow?.webContents.session.addWordToSpellCheckerDictionary(word)
      ignoredWords.add(word)
    }
  })

  // shell:open-external — used by the renderer for link clicks
  ipcMain.handle('shell:open-external', (_, url: string) => {
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:')) {
      shell.openExternal(url)
    }
  })

  // Sent by renderer after it finishes saving when close was triggered
  ipcMain.on('app:close-after-save', () => {
    allowClose = true
    mainWindow?.close()
    if (isQuitting) app.quit()
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
