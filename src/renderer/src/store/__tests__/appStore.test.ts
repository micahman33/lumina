import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '../appStore'

// Initial state to reset to between tests
const initialState = {
  file: { path: null, content: '', isDirty: false, fileType: 'md' as const },
  theme: 'system' as const,
  sidebarOpen: true,
  recentFiles: [],
  settingsOpen: false,
  linkDialogOpen: false,
  sidebarSearch: '',
}

describe('useAppStore', () => {
  beforeEach(() => {
    useAppStore.setState(initialState)
  })

  describe('initial state', () => {
    it('has correct initial file state', () => {
      const state = useAppStore.getState()
      expect(state.file.path).toBeNull()
      expect(state.file.content).toBe('')
      expect(state.file.isDirty).toBe(false)
      expect(state.file.fileType).toBe('md')
    })

    it('has correct initial theme', () => {
      expect(useAppStore.getState().theme).toBe('system')
    })

    it('sidebar is open by default', () => {
      expect(useAppStore.getState().sidebarOpen).toBe(true)
    })

    it('recentFiles is empty by default', () => {
      expect(useAppStore.getState().recentFiles).toEqual([])
    })

    it('settingsOpen is false by default', () => {
      expect(useAppStore.getState().settingsOpen).toBe(false)
    })

    it('linkDialogOpen is false by default', () => {
      expect(useAppStore.getState().linkDialogOpen).toBe(false)
    })

    it('sidebarSearch is empty string by default', () => {
      expect(useAppStore.getState().sidebarSearch).toBe('')
    })
  })

  describe('setFile', () => {
    it('updates path', () => {
      useAppStore.getState().setFile({ path: '/path/to/file.md' })
      expect(useAppStore.getState().file.path).toBe('/path/to/file.md')
    })

    it('updates content', () => {
      useAppStore.getState().setFile({ content: '# Hello' })
      expect(useAppStore.getState().file.content).toBe('# Hello')
    })

    it('updates fileType', () => {
      useAppStore.getState().setFile({ fileType: 'txt' })
      expect(useAppStore.getState().file.fileType).toBe('txt')
    })

    it('updates all file fields at once', () => {
      useAppStore.getState().setFile({
        path: '/docs/notes.txt',
        content: 'Hello',
        isDirty: false,
        fileType: 'txt',
      })
      const file = useAppStore.getState().file
      expect(file.path).toBe('/docs/notes.txt')
      expect(file.content).toBe('Hello')
      expect(file.isDirty).toBe(false)
      expect(file.fileType).toBe('txt')
    })

    it('does a partial merge — preserves other fields', () => {
      useAppStore.getState().setFile({ path: '/new/path.md' })
      // content, isDirty, fileType should remain from initial state
      expect(useAppStore.getState().file.content).toBe('')
      expect(useAppStore.getState().file.isDirty).toBe(false)
      expect(useAppStore.getState().file.fileType).toBe('md')
    })
  })

  describe('markDirty', () => {
    it('markDirty(true) sets isDirty to true', () => {
      useAppStore.getState().markDirty(true)
      expect(useAppStore.getState().file.isDirty).toBe(true)
    })

    it('markDirty(false) sets isDirty to false', () => {
      useAppStore.getState().markDirty(true)
      useAppStore.getState().markDirty(false)
      expect(useAppStore.getState().file.isDirty).toBe(false)
    })

    it('markDirty does not affect other file fields', () => {
      useAppStore.getState().setFile({ path: '/test.md', content: 'test' })
      useAppStore.getState().markDirty(true)
      expect(useAppStore.getState().file.path).toBe('/test.md')
      expect(useAppStore.getState().file.content).toBe('test')
    })
  })

  describe('setTheme', () => {
    it('sets theme to light', () => {
      useAppStore.getState().setTheme('light')
      expect(useAppStore.getState().theme).toBe('light')
    })

    it('sets theme to dark', () => {
      useAppStore.getState().setTheme('dark')
      expect(useAppStore.getState().theme).toBe('dark')
    })

    it('sets theme to system', () => {
      useAppStore.getState().setTheme('dark')
      useAppStore.getState().setTheme('system')
      expect(useAppStore.getState().theme).toBe('system')
    })
  })

  describe('toggleSidebar', () => {
    it('flips sidebarOpen from true to false', () => {
      expect(useAppStore.getState().sidebarOpen).toBe(true)
      useAppStore.getState().toggleSidebar()
      expect(useAppStore.getState().sidebarOpen).toBe(false)
    })

    it('flips sidebarOpen from false to true', () => {
      useAppStore.getState().toggleSidebar() // true → false
      useAppStore.getState().toggleSidebar() // false → true
      expect(useAppStore.getState().sidebarOpen).toBe(true)
    })
  })

  describe('setSettingsOpen', () => {
    it('setSettingsOpen(true) opens settings', () => {
      useAppStore.getState().setSettingsOpen(true)
      expect(useAppStore.getState().settingsOpen).toBe(true)
    })

    it('setSettingsOpen(false) closes settings', () => {
      useAppStore.getState().setSettingsOpen(true)
      useAppStore.getState().setSettingsOpen(false)
      expect(useAppStore.getState().settingsOpen).toBe(false)
    })
  })

  describe('setLinkDialogOpen', () => {
    it('setLinkDialogOpen(true) opens link dialog', () => {
      useAppStore.getState().setLinkDialogOpen(true)
      expect(useAppStore.getState().linkDialogOpen).toBe(true)
    })

    it('setLinkDialogOpen(false) closes link dialog', () => {
      useAppStore.getState().setLinkDialogOpen(true)
      useAppStore.getState().setLinkDialogOpen(false)
      expect(useAppStore.getState().linkDialogOpen).toBe(false)
    })
  })

  describe('setRecentFiles', () => {
    it('replaces the recent files list', () => {
      const files = [
        { path: '/a.md', name: 'a.md', lastOpened: '2024-01-01T00:00:00.000Z' },
        { path: '/b.txt', name: 'b.txt', lastOpened: '2024-01-02T00:00:00.000Z' },
      ]
      useAppStore.getState().setRecentFiles(files)
      expect(useAppStore.getState().recentFiles).toEqual(files)
    })

    it('replaces existing list entirely (no merging)', () => {
      useAppStore.getState().setRecentFiles([
        { path: '/old.md', name: 'old.md', lastOpened: '2024-01-01T00:00:00.000Z' },
      ])
      useAppStore.getState().setRecentFiles([
        { path: '/new.md', name: 'new.md', lastOpened: '2024-01-02T00:00:00.000Z' },
      ])
      const recents = useAppStore.getState().recentFiles
      expect(recents).toHaveLength(1)
      expect(recents[0].path).toBe('/new.md')
    })

    it('accepts empty array to clear recents', () => {
      useAppStore.getState().setRecentFiles([
        { path: '/a.md', name: 'a.md', lastOpened: '2024-01-01T00:00:00.000Z' },
      ])
      useAppStore.getState().setRecentFiles([])
      expect(useAppStore.getState().recentFiles).toEqual([])
    })
  })

  describe('setSidebarSearch', () => {
    it('updates sidebarSearch query', () => {
      useAppStore.getState().setSidebarSearch('hello')
      expect(useAppStore.getState().sidebarSearch).toBe('hello')
    })

    it('clears sidebarSearch', () => {
      useAppStore.getState().setSidebarSearch('hello')
      useAppStore.getState().setSidebarSearch('')
      expect(useAppStore.getState().sidebarSearch).toBe('')
    })
  })
})
