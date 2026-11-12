export type FileType = 'md' | 'txt' | 'json' | 'xml' | 'csv' | 'text'

/** Which editor shows the file: TipTap, CodeMirror, or the CSV grid. */
export type ViewKind = 'rich' | 'code' | 'table'

export type TextEncoding = 'utf8' | 'utf16le' | 'utf16be' | 'windows-1252'

/** What has to be remembered about a file on disk so saving puts it back the way it was. */
export interface FileMeta {
  encoding: TextEncoding
  hasBom: boolean
  eol: '\n' | '\r\n'
  /** Modification time when Lumina last read or wrote the file; null for an unsaved file. */
  mtimeMs: number | null
  readOnly: boolean
}

export const DEFAULT_META: FileMeta = {
  encoding: 'utf8',
  hasBom: false,
  eol: '\n',
  mtimeMs: null,
  readOnly: false
}

export interface RecentFile {
  path: string
  name: string
  lastOpened: string // ISO date string
  snippet?: string   // first ~300 chars of plain text, for search
  pinned?: boolean   // pinned files sort to top and never age off
}

export interface FileState {
  path: string | null
  content: string
  isDirty: boolean
  fileType: FileType
  meta: FileMeta
  kind: 'text' | 'binary'
  size: number
  /** CSV shown in the code editor instead of the table. */
  viewAsText: boolean
  /** Bumped every time new content is loaded, so the code and table views re-initialise. */
  loadId: number
}

export interface AppSettings {
  theme: 'system' | 'light' | 'dark'
  sidebarOpen: boolean
  welcomeShown?: boolean
  windowBounds?: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface OpenFileResult extends FileMeta {
  path: string
  content: string
  kind: 'text' | 'binary'
  size: number
}

export type SaveResult =
  | { ok: true; mtimeMs: number }
  | { ok: false; reason: 'conflict' | 'error' }

export interface SaveAsResult {
  path: string
  mtimeMs: number
}

export interface CopyImageArgs {
  sourcePath: string
  documentPath: string
}
