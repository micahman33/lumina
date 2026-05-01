import { ipcMain, protocol, net } from 'electron'
import { copyFile, mkdir, access } from 'fs/promises'
import { basename, dirname, join, extname } from 'path'
import { pathToFileURL } from 'url'
import { IPC } from '../../renderer/src/types/ipc'
import type { CopyImageArgs } from '../../renderer/src/types/file'

function normalizeFilename(name: string): string {
  const ext = extname(name)
  const base = basename(name, ext)
  return base.replace(/[^a-zA-Z0-9_\-]/g, '_').toLowerCase() + ext.toLowerCase()
}

async function findAvailablePath(dir: string, filename: string): Promise<string> {
  const ext = extname(filename)
  const base = basename(filename, ext)
  let candidate = join(dir, filename)
  let counter = 1
  while (true) {
    try {
      await access(candidate)
      candidate = join(dir, `${base}_${counter}${ext}`)
      counter++
    } catch {
      return candidate
    }
  }
}

export function registerMediaProtocol(): void {
  protocol.handle('media', (request) => {
    const url = request.url.replace('media://', '')
    const filePath = decodeURIComponent(url)
    return net.fetch(pathToFileURL(filePath).href)
  })
}

export function registerImageHandlers(): void {
  ipcMain.handle(IPC.IMAGE_COPY_TO_DOC, async (_, args: CopyImageArgs): Promise<string> => {
    const { sourcePath, documentPath } = args
    const docDir = dirname(documentPath)
    const imagesDir = join(docDir, 'images')

    await mkdir(imagesDir, { recursive: true })

    const normalized = normalizeFilename(basename(sourcePath))
    const destPath = await findAvailablePath(imagesDir, normalized)

    await copyFile(sourcePath, destPath)

    // Return a media:// URL so the renderer can display it immediately
    return pathToFileURL(destPath).href.replace('file://', 'media://')
  })
}
