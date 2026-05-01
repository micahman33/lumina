import { useCallback, useEffect } from 'react'
import { useAppStore } from '../store/appStore'
import type { Editor } from '@tiptap/react'

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
      await window.api.addRecentFile(result.path)
      const recents = await window.api.getRecentFiles()
      setRecentFiles(recents)
      document.title = `${result.path.split('/').pop()} — Lumina`
    },
    [setFile, loadContent, setRecentFiles]
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
    await window.api.addRecentFile(result.path)
    const recents = await window.api.getRecentFiles()
    setRecentFiles(recents)
    document.title = `${result.path.split('/').pop()} — Lumina`
  }, [setFile, loadContent, setRecentFiles])

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
    await window.api.addRecentFile(result.path)
    const recents = await window.api.getRecentFiles()
    setRecentFiles(recents)
    document.title = `${result.path.split('/').pop()} — Lumina`
  }, [getMarkdown, setFile, markDirty, setRecentFiles])

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

  // Load initial file (CLI open-with)
  useEffect(() => {
    window.api.readInitialFile().then((result) => {
      if (!result) return
      setFile({ path: result.path, content: result.content, isDirty: false })
      loadContent(result.content)
      document.title = `${result.path.split('/').pop()} — Lumina`
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
