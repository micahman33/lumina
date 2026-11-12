import { app, Menu, BrowserWindow, shell } from 'electron'
import { IPC } from '../renderer/src/types/ipc'
import store from './store'
import { showOpenDocumentDialog } from './openDialog'

export function buildMenu(win: BrowserWindow): void {
  const isMac = process.platform === 'darwin'

  const recentFileItems = (): Electron.MenuItemConstructorOptions[] => {
    const recents = store.get('recentFiles')
    if (recents.length === 0) {
      return [{ label: 'No Recent Files', enabled: false }]
    }
    return recents.slice(0, 10).map((f) => ({
      label: f.name,
      click: () => win.webContents.send(IPC.PUSH_OPEN_FILE, f.path)
    }))
  }

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const }
            ]
          }
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: 'CmdOrCtrl+N',
          click: () => win.webContents.send(IPC.PUSH_OPEN_FILE, null)
        },
        {
          label: 'Open…',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const path = await showOpenDocumentDialog(win)
            if (path) win.webContents.send(IPC.PUSH_OPEN_FILE, path)
          }
        },
        {
          label: 'Open Recent',
          submenu: recentFileItems()
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => win.webContents.send(IPC.PUSH_MENU_SAVE)
        },
        {
          label: 'Save As…',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => win.webContents.send(IPC.PUSH_MENU_SAVE_AS)
        },
        { type: 'separator' },
        isMac ? { role: 'close' as const } : { role: 'quit' as const }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        { role: 'selectAll' as const }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' as const },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const }
      ]
    },
    {
      role: 'help' as const,
      submenu: [
        {
          label: 'About Lumina',
          click: () => {
            app.setAboutPanelOptions({
              applicationName: 'Lumina',
              applicationVersion: app.getVersion(),
              copyright: '© 2026 Lumina',
              credits: 'Built with Electron, TipTap, and React',
              website: 'https://github.com/micahman33/lumina',
            })
            app.showAboutPanel()
          }
        },
        { type: 'separator' as const },
        {
          label: 'View on GitHub',
          click: () => shell.openExternal('https://github.com/micahman33/lumina')
        },
        {
          label: 'Report an Issue',
          click: () => shell.openExternal('https://github.com/micahman33/lumina/issues')
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
