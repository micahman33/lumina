import { useCallback, useEffect } from 'react'
import { useAppStore } from '../store/appStore'
import type { Editor } from '@tiptap/react'

/** Strip Markdown syntax to produce a plain-text snippet for search indexing. */
function extractSnippet(markdown: string, maxLen = 300): string {
  return markdown
    .replace(/^#{1,6}\s+/gm, '')               // headings
    .replace(/\*\*(.+?)\*\*/g, '$1')            // bold
    .replace(/\*(.+?)\*/g, '$1')                // italic
    .replace(/`{1,3}[^`\n]*`{1,3}/g, '')        // inline / fenced code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')    // links → label only
    .replace(/^\s*[-*+>]\s+/gm, '')             // list/blockquote markers
    .replace(/\n+/g, ' ')
    .trim()
    .slice(0, maxLen)
}

export function useFile(editor: Editor | null): {
  openFile: () => Promise<void>
  saveFile: () => Promise<void>
  saveFileAs: () => Promise<void>
  newFile: () => void
  openFilePath: (path: string) => Promise<void>
} {
  const setFile = useAppStore((s) => s.setFile)
  const markDirty = useAppStore((s) => s.markDirty)
  const setRecentFiles = useAppStore((s) => s.setRecentFiles)
  const filePath = useAppStore((s) => s.file.path)

  /**
   * Record a file in the main-process recents store and update the sidebar list
   * without reordering entries that are already visible — new files go to the top,
   * existing files stay at their current position (order only resets on next launch).
   */
  const stableAddRecent = useCallback(
    async (path: string, snippet?: string) => {
      await window.api.addRecentFile(path, snippet)
      const current = useAppStore.getState().recentFiles
      const exists = current.some((f) => f.path === path)
      if (!exists) {
        // Brand-new file — prepend it so it appears immediately
        const name = path.split(/[/\\]/).pop() ?? path
        setRecentFiles([
          { path, name, lastOpened: new Date().toISOString(), snippet },
          ...current,
        ].slice(0, 20))
      }
      // Already in list — leave order alone; main process has recorded the open
    },
    [setRecentFiles]
  )

  const loadContent = useCallback(
    (content: string) => {
      if (!editor) return
      editor.commands.setContent(content)
      markDirty(false)
    },
    [editor, markDirty]
  )

  const openFilePath = useCallback(
    async (path: string) => {
      const result = await window.api.openFilePath(path)
      if (!result) return
      setFile({ path: result.path, content: result.content, isDirty: false })
      loadContent(result.content)
      await stableAddRecent(result.path, extractSnippet(result.content))
      document.title = `${result.path.split(/[/\\]/).pop()} — Lumina`
    },
    [setFile, loadContent, stableAddRecent]
  )

  const newFile = useCallback(() => {
    setFile({ path: null, content: '', isDirty: false })
    editor?.commands.setContent('')
    document.title = 'Untitled — Lumina'
  }, [editor, setFile])

  const openFile = useCallback(async () => {
    const result = await window.api.openFile()
    if (!result) return
    setFile({ path: result.path, content: result.content, isDirty: false })
    loadContent(result.content)
    await stableAddRecent(result.path, extractSnippet(result.content))
    document.title = `${result.path.split(/[/\\]/).pop()} — Lumina`
  }, [setFile, loadContent, stableAddRecent])

  const getMarkdown = useCallback((): string => {
    if (!editor) return ''
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (editor.storage as any).markdown?.getMarkdown() ?? editor.getText()
  }, [editor])

  const saveFile = useCallback(async () => {
    const state = useAppStore.getState()
    if (!state.file.path) {
      await saveFileAs()
      return
    }
    const content = getMarkdown()
    const ok = await window.api.saveFile(state.file.path, content)
    if (ok) {
      markDirty(false)
      ;(window as Window & { __lumina_isDirty__?: boolean }).__lumina_isDirty__ = false
    }
  }, [getMarkdown, markDirty])

  const saveFileAs = useCallback(async () => {
    const content = getMarkdown()
    const result = await window.api.saveFileAs(content)
    if (!result) return
    setFile({ path: result.path, isDirty: false })
    markDirty(false)
    ;(window as Window & { __lumina_isDirty__?: boolean }).__lumina_isDirty__ = false
    await stableAddRecent(result.path, extractSnippet(content))
    document.title = `${result.path.split(/[/\\]/).pop()} — Lumina`
  }, [getMarkdown, setFile, markDirty, stableAddRecent])

  // Listen for menu-triggered open/save
  useEffect(() => {
    const unsubSave = window.api.onMenuSave(() => saveFile())
    const unsubOpen = window.api.onOpenFile((path) => {
      if (path === null) {
        newFile()
      } else {
        openFilePath(path)
      }
    })
    return () => {
      unsubSave()
      unsubOpen()
    }
  }, [saveFile, openFilePath, newFile])

  // Load initial file (CLI open-with or most recent)
  useEffect(() => {
    window.api.readInitialFile().then(async (result) => {
      if (!result) return
      setFile({ path: result.path, content: result.content, isDirty: false })
      loadContent(result.content)
      document.title = `${result.path.split(/[/\\]/).pop()} — Lumina`
      // Store snippet so this file is searchable from the sidebar
      await window.api.addRecentFile(result.path, extractSnippet(result.content))
      const recents = await window.api.getRecentFiles()
      setRecentFiles(recents)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync dirty state to window global for close guard
  useEffect(() => {
    const unsub = useAppStore.subscribe((state) => {
      ;(window as Window & { __lumina_isDirty__?: boolean }).__lumina_isDirty__ =
        state.file.isDirty
    })
    return unsub
  }, [])

  return { openFile, saveFile, saveFileAs, newFile, openFilePath }
}
