import { vi } from 'vitest'
import '@testing-library/jest-dom'

// Mock the Electron preload bridge
Object.defineProperty(window, 'api', {
  value: {
    openFile: vi.fn(),
    openFilePath: vi.fn(),
    saveFile: vi.fn().mockResolvedValue({ ok: true, mtimeMs: 1 }),
    statFile: vi.fn().mockResolvedValue(null),
    confirmConflict: vi.fn().mockResolvedValue('cancel'),
    saveFileAs: vi.fn(),
    readInitialFile: vi.fn().mockResolvedValue(null),
    copyImageToDoc: vi.fn(),
    getRecentFiles: vi.fn().mockResolvedValue([]),
    addRecentFile: vi.fn().mockResolvedValue(undefined),
    getSettings: vi.fn().mockResolvedValue({ theme: 'system', welcomeShown: true }),
    setSettings: vi.fn().mockResolvedValue(undefined),
    onOpenFile: vi.fn().mockReturnValue(() => {}),
    onMenuSave: vi.fn().mockReturnValue(() => {}),
    onMenuSaveAs: vi.fn().mockReturnValue(() => {}),
    onSaveAndClose: vi.fn().mockReturnValue(() => {}),
    closeAfterSave: vi.fn(),
    onThemeChange: vi.fn().mockReturnValue(() => {}),
    openExternal: vi.fn().mockResolvedValue(undefined),
    platform: 'darwin' as NodeJS.Platform,
    removeRecentFile: vi.fn().mockResolvedValue(undefined),
    pinRecentFile: vi.fn().mockResolvedValue([]),
    revealFile: vi.fn().mockResolvedValue(undefined),
    onContextMenu: vi.fn().mockReturnValue(() => {}),
    replaceMisspelling: vi.fn(),
    addWordToDictionary: vi.fn(),
    ignoreWord: vi.fn(),
    getPathForFile: vi.fn().mockReturnValue(''),
  },
  writable: true,
})
