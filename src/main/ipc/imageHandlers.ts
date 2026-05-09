import { ipcMain, protocol } from 'electron'
import { copyFile, mkdir, access, readFile } from 'fs/promises'
import { basename, dirname, join, extname } from 'path'
import { pathToFileURL } from 'url'
import { IPC } from '../../renderer/src/types/ipc'
import type { CopyImageArgs } from '../../renderer/src/types/file'

// MIME types for image files served by the media:// protocol
const MIME_MAP: Record<string, string> = {
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon',
  '.bmp':  'image/bmp',
  '.avif': 'image/avif',
}

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
  // Use readFile instead of net.fetch(file://) — net.fetch on file:// URLs can
  // return ERR_UNEXPECTED in Electron's renderer webSecurity context.  Reading
  // the bytes directly in the main process is reliable and avoids the issue.
  protocol.handle('media', async (request) => {
    try {
      // media:///abs/path → strip "media://" to get the absolute OS path
      const filePath = decodeURIComponent(request.url.slice('media://'.length))
      const data = await readFile(filePath)
      const mime = MIME_MAP[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
      return new Response(data, { headers: { 'Content-Type': mime } })
    } catch (err) {
      console.error('[Lumina] media:// protocol error:', err)
      return new Response('not found', { status: 404 })
    }
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
