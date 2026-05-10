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
  // return ERR_UNEXPECTED in Electron's renderer webSecurity context.
  //
  // IMPORTANT: the scheme is registered as `standard: true`, so Chromium
  // normalises media:///abs/path to media://localhost/abs/path internally.
  // Using new URL(request.url).pathname correctly extracts "/abs/path"
  // regardless of whether a host is present — slice('media://'.length) would
  // incorrectly include "localhost" in the path and cause readFile to fail.
  protocol.handle('media', async (request) => {
    let filePath = ''
    try {
      // URL format: media://local/abs/path  (dummy host "local" prevents Chromium
      // from stealing the first path segment as the hostname when standard:true)
      filePath = decodeURIComponent(new URL(request.url).pathname)
      // On Windows, URL.pathname starts with an extra / before the drive letter
      // (e.g. /C:/Users/...) — strip it so Node.js opens the correct path.
      if (/^\/[A-Za-z]:[\\/]/.test(filePath)) filePath = filePath.slice(1)
      const data = await readFile(filePath)
      const mime = MIME_MAP[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
      return new Response(data, { headers: { 'Content-Type': mime } })
    } catch (err) {
      console.error('[Lumina] media:// error for:', filePath, err)
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
