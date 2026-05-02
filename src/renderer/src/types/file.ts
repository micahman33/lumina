export interface RecentFile {
  path: string
  name: string
  lastOpened: string // ISO date string
  snippet?: string   // first ~300 chars of plain text, for search
}

export interface FileState {
  path: string | null
  content: string
  isDirty: boolean
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

export interface OpenFileResult {
  path: string
  content: string
}

export interface SaveAsResult {
  path: string
}

export interface CopyImageArgs {
  sourcePath: string
  documentPath: string
}
