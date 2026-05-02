import { app, Menu, BrowserWindow, shell } from 'electron'
import { IPC } from '../renderer/src/types/ipc'
import store from './store'

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
            const { dialog } = await import('electron')
            const result = await dialog.showOpenDialog(win, {
              filters: [
                { name: 'All Supported', extensions: ['md', 'markdown', 'txt'] },
                { name: 'Markdown', extensions: ['md', 'markdown'] },
                { name: 'Plain Text', extensions: ['txt'] },
              ],
              properties: ['openFile']
            })
            if (!result.canceled && result.filePaths[0]) {
              win.webContents.send(IPC.PUSH_OPEN_FILE, result.filePaths[0])
            }
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
          click: () => win.webContents.send(IPC.PUSH_MENU_SAVE)
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
          label: 'Learn More',
          click: () => shell.openExternal('https://github.com')
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
