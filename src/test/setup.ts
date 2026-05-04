import { vi } from 'vitest'
import '@testing-library/jest-dom'

// Mock the Electron preload bridge
Object.defineProperty(window, 'api', {
  value: {
    openFile: vi.fn(),
    openFilePath: vi.fn(),
    saveFile: vi.fn().mockResolvedValue(true),
    saveFileAs: vi.fn(),
    readInitialFile: vi.fn().mockResolvedValue(null),
    copyImageToDoc: vi.fn(),
    getRecentFiles: vi.fn().mockResolvedValue([]),
    addRecentFile: vi.fn().mockResolvedValue(undefined),
    getSettings: vi.fn().mockResolvedValue({ theme: 'system', welcomeShown: true }),
    setSettings: vi.fn().mockResolvedValue(undefined),
    onOpenFile: vi.fn().mockReturnValue(() => {}),
    onMenuSave: vi.fn().mockReturnValue(() => {}),
    onThemeChange: vi.fn().mockReturnValue(() => {}),
    openExternal: vi.fn().mockResolvedValue(undefined),
  },
  writable: true,
})
