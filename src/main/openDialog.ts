import { dialog, BrowserWindow } from 'electron'

/** The one Open dialog, shared by the File menu and the toolbar. Returns the chosen path. */
export async function showOpenDocumentDialog(
  win: BrowserWindow | null,
  defaultPath?: string
): Promise<string | null> {
  const options: Electron.OpenDialogOptions = {
    defaultPath,
    filters: [
      { name: 'All Files', extensions: ['*'] },
      { name: 'Markdown', extensions: ['md', 'markdown'] },
      { name: 'Data (JSON, XML, CSV)', extensions: ['json', 'xml', 'csv', 'tsv'] },
      { name: 'Text', extensions: ['txt', 'log'] }
    ],
    properties: ['openFile']
  }
  const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
  return result.canceled || !result.filePaths[0] ? null : result.filePaths[0]
}
