import { statSync } from 'fs'

/**
 * A file the OS asked us to open (macOS `open-file`, or a path on the command line)
 * before the renderer was ready to receive it. The renderer collects it through
 * FILE_READ_INITIAL, so it can never lose a race against "reopen the last file".
 */
let pendingOpenPath: string | null = null

export function setPendingOpenPath(path: string | null): void {
  pendingOpenPath = path
}

export function takePendingOpenPath(): string | null {
  const path = pendingOpenPath
  pendingOpenPath = null
  return path
}

/** First argument that is an existing file (Chromium flags and the app folder are skipped). */
export function findFileArg(argv: string[]): string | null {
  for (const arg of argv) {
    if (arg.startsWith('-')) continue
    try {
      if (statSync(arg).isFile()) return arg
    } catch { /* not a path */ }
  }
  return null
}
