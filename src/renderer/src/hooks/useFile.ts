import { useCallback, useEffect } from 'react'
import { useAppStore } from '../store/appStore'
import type { Editor } from '@tiptap/react'
import type { FileType } from '../types/file'
import { buildTxtDoc, serializeTxtDoc, detectFileType, extractSnippet } from '../utils/txtUtils'

// Re-export detectFileType for backward compatibility (other files import it from here)
export { detectFileType } from '../utils/txtUtils'

// ── Hook ─────────────────────────────────────────────────────────────────

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

  /** Add to recents without reordering existing entries mid-session. */
  const stableAddRecent = useCallback(
    async (path: string, snippet?: string) => {
      await window.api.addRecentFile(path, snippet)
      const current = useAppStore.getState().recentFiles
      if (!current.some((f) => f.path === path)) {
        const name = path.split(/[/\\]/).pop() ?? path
        setRecentFiles([{ path, name, lastOpened: new Date().toISOString(), snippet }, ...current].slice(0, 20))
      }
    },
    [setRecentFiles]
  )

  /** Load content into TipTap, routing by file type. */
  const loadContent = useCallback(
    (raw: string, fileType: FileType) => {
      if (!editor) return
      try {
        if (fileType === 'txt') {
          editor.commands.setContent(buildTxtDoc(raw))
        } else {
          editor.commands.setContent(raw)
        }
      } catch (err) {
        // Fallback: if the parsed doc is rejected by the ProseMirror schema,
        // load as plain text paragraphs so the user isn't left with a blank editor.
        console.error('[Lumina] setContent failed, falling back to plain text:', err)
        const fallback = { type: 'doc', content: raw.split(/\r?\n/).map((line) =>
          line ? { type: 'paragraph', content: [{ type: 'text', text: line }] } : { type: 'paragraph' }
        )}
        editor.commands.setContent(fallback)
      }
      markDirty(false)
    },
    [editor, markDirty]
  )

  /** Serialize editor content to the correct format for saving. */
  const getContent = useCallback((): string => {
    if (!editor) return ''
    const fileType = useAppStore.getState().file.fileType
    if (fileType === 'txt') return serializeTxtDoc(editor.state.doc)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (editor.storage as any).markdown?.getMarkdown() ?? editor.getText()
  }, [editor])

  const openFilePath = useCallback(
    async (path: string) => {
      const result = await window.api.openFilePath(path)
      if (!result) return
      const fileType = detectFileType(result.path)
      setFile({ path: result.path, content: result.content, isDirty: false, fileType })
      loadContent(result.content, fileType)
      await stableAddRecent(result.path, extractSnippet(result.content, fileType))
      document.title = `${result.path.split(/[/\\]/).pop()} — Lumina`
    },
    [setFile, loadContent, stableAddRecent]
  )

  const newFile = useCallback(() => {
    setFile({ path: null, content: '', isDirty: false, fileType: 'md' })
    editor?.commands.setContent('')
    document.title = 'Untitled — Lumina'
  }, [editor, setFile])

  const openFile = useCallback(async () => {
    const result = await window.api.openFile()
    if (!result) return
    const fileType = detectFileType(result.path)
    setFile({ path: result.path, content: result.content, isDirty: false, fileType })
    loadContent(result.content, fileType)
    await stableAddRecent(result.path, extractSnippet(result.content, fileType))
    document.title = `${result.path.split(/[/\\]/).pop()} — Lumina`
  }, [setFile, loadContent, stableAddRecent])

  const saveFile = useCallback(async () => {
    const state = useAppStore.getState()
    if (!state.file.path) { await saveFileAs(); return }
    const content = getContent()
    const ok = await window.api.saveFile(state.file.path, content)
    if (ok) {
      markDirty(false)
      ;(window as Window & { __lumina_isDirty__?: boolean }).__lumina_isDirty__ = false
    }
  }, [getContent, markDirty])

  const saveFileAs = useCallback(async () => {
    const content = getContent()
    const result = await window.api.saveFileAs(content, useAppStore.getState().file.path ?? undefined)
    if (!result) return
    const fileType = detectFileType(result.path)
    setFile({ path: result.path, isDirty: false, fileType })
    markDirty(false)
    ;(window as Window & { __lumina_isDirty__?: boolean }).__lumina_isDirty__ = false
    await stableAddRecent(result.path, extractSnippet(content, fileType))
    document.title = `${result.path.split(/[/\\]/).pop()} — Lumina`
  }, [getContent, setFile, markDirty, stableAddRecent])

  // Menu-triggered open / save
  useEffect(() => {
    const unsubSave = window.api.onMenuSave(() => saveFile())
    const unsubOpen = window.api.onOpenFile((path) => {
      if (path === null) newFile()
      else openFilePath(path)
    })
    return () => { unsubSave(); unsubOpen() }
  }, [saveFile, openFilePath, newFile])

  // Load initial file (CLI / most recent / welcome)
  useEffect(() => {
    window.api.readInitialFile().then(async (result) => {
      if (!result) return
      const fileType = detectFileType(result.path)
      setFile({ path: result.path, content: result.content, isDirty: false, fileType })
      loadContent(result.content, fileType)
      document.title = `${result.path.split(/[/\\]/).pop()} — Lumina`
      await window.api.addRecentFile(result.path, extractSnippet(result.content, fileType))
      const recents = await window.api.getRecentFiles()
      setRecentFiles(recents)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync dirty flag to window global for close guard
  useEffect(() => {
    return useAppStore.subscribe((state) => {
      ;(window as Window & { __lumina_isDirty__?: boolean }).__lumina_isDirty__ = state.file.isDirty
    })
  }, [])

  return { openFile, saveFile, saveFileAs, newFile, openFilePath }
}
