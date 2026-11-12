import { useCallback, useEffect } from 'react'
import { useAppStore } from '../store/appStore'
import type { Editor } from '@tiptap/react'
import type { FileType } from '../types/file'
import { buildTxtDoc, serializeTxtDoc, detectFileType, extractSnippet } from '../utils/txtUtils'
import { resolveRelativeImagePaths, unresolveRelativeImagePaths, normalizeAlignAttributes } from '../utils/markdownUtils'

// Re-export detectFileType for backward compatibility (other files import it from here)
export { detectFileType } from '../utils/txtUtils'

// ── Hook ─────────────────────────────────────────────────────────────────

export function useFile(editor: Editor | null): {
  openFile: () => Promise<void>
  saveFile: () => Promise<void>
  saveFileAs: () => Promise<void>
  newFile: () => void
  openFilePath: (path: string) => Promise<void>
  openDraft: () => void
} {
  const setFile = useAppStore((s) => s.setFile)
  const markDirty = useAppStore((s) => s.markDirty)
  const setRecentFiles = useAppStore((s) => s.setRecentFiles)
  const saveDraft = useAppStore((s) => s.saveDraft)
  const clearDraft = useAppStore((s) => s.clearDraft)
  const showToast = useAppStore((s) => s.showToast)

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
    (raw: string, fileType: FileType, filePath?: string | null) => {
      if (!editor) return
      try {
        if (fileType === 'txt') {
          editor.commands.setContent(buildTxtDoc(raw))
        } else {
          // 1. Normalise deprecated align="center" → style="text-align:center"
          //    so TipTap's TextAlign extension centres the content correctly.
          // 2. Resolve relative image paths to media:// URLs so local images render.
          //    The reverse (unresolve) happens in getContent() before saving.
          const aligned = normalizeAlignAttributes(raw)
          const content = filePath ? resolveRelativeImagePaths(aligned, filePath) : aligned
          editor.commands.setContent(content)
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
    const { fileType, path } = useAppStore.getState().file
    if (fileType === 'txt') return serializeTxtDoc(editor.state.doc)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = (editor.storage as any).markdown?.getMarkdown() ?? editor.getText()
    // Strip file:// absolute prefixes we added on load — restore original relative paths
    return path ? unresolveRelativeImagePaths(raw, path) : raw
  }, [editor])

  /**
   * Write the current document to disk and report whether it is now safely saved.
   * The document is only marked clean if nothing was typed while the write was in flight —
   * otherwise those keystrokes would be flagged as saved and never auto-saved.
   */
  const writeCurrentFile = useCallback(async (): Promise<boolean> => {
    const { path } = useAppStore.getState().file
    if (!path || !editor) return false
    const docAtSave = editor.state.doc
    const ok = await window.api.saveFile(path, getContent())
    if (!ok) {
      showToast(`Couldn't save ${path.split(/[/\\]/).pop()}`, 'error')
      return false
    }
    if (useAppStore.getState().file.path === path && editor.state.doc.eq(docAtSave)) {
      markDirty(false)
    }
    return true
  }, [editor, getContent, markDirty, showToast])

  /**
   * Auto-save runs 2 s after the last keystroke, so switching documents inside that window
   * would otherwise discard the newest edits. Every "switch away" action awaits this first.
   * Returns false if the save failed, in which case the caller must not switch.
   */
  const flushPendingSave = useCallback(async (): Promise<boolean> => {
    const { path, isDirty } = useAppStore.getState().file
    if (!path || !isDirty) return true
    return writeCurrentFile()
  }, [writeCurrentFile])

  /**
   * If there's an unsaved new file with content, snapshot it to the draft store
   * before switching away.  Called at the top of every "open" action.
   */
  const snapshotDraftIfNeeded = useCallback(() => {
    const state = useAppStore.getState()
    if (!state.file.path && state.file.isDirty && editor) {
      const raw = (editor.storage as Record<string, { getMarkdown?: () => string }>)
        .markdown?.getMarkdown?.() ?? editor.getText()
      if (raw.trim()) saveDraft(raw)
    }
  }, [editor, saveDraft])

  const openFilePath = useCallback(
    async (path: string) => {
      if (path === useAppStore.getState().file.path) return
      if (!(await flushPendingSave())) return
      snapshotDraftIfNeeded()
      const result = await window.api.openFilePath(path)
      if (!result) {
        showToast(`Couldn't open ${path.split(/[/\\]/).pop()}`, 'error')
        return
      }
      const fileType = detectFileType(result.path)
      setFile({ path: result.path, content: result.content, isDirty: false, fileType })
      loadContent(result.content, fileType, result.path)
      await stableAddRecent(result.path, extractSnippet(result.content, fileType))
      document.title = `${result.path.split(/[/\\]/).pop()} — Lumina`
    },
    [setFile, loadContent, stableAddRecent, snapshotDraftIfNeeded, flushPendingSave, showToast]
  )

  const newFile = useCallback(async () => {
    if (!(await flushPendingSave())) return
    snapshotDraftIfNeeded()
    setFile({ path: null, content: '', isDirty: false, fileType: 'md' })
    editor?.commands.setContent('')
    // setContent emits an update, which flags the document dirty — a blank file isn't
    markDirty(false)
    document.title = 'Untitled — Lumina'
  }, [editor, setFile, markDirty, snapshotDraftIfNeeded, flushPendingSave])

  /** Restore the in-memory draft into the editor. */
  const openDraft = useCallback(async () => {
    const { draft } = useAppStore.getState()
    if (!draft || !editor) return
    if (!(await flushPendingSave())) return
    setFile({ path: null, content: draft.content, isDirty: true, fileType: 'md' })
    loadContent(draft.content, 'md', null)
    // loadContent leaves the document clean, but a draft is by definition unsaved
    markDirty(true)
    document.title = 'Unsaved draft — Lumina'
  }, [editor, setFile, loadContent, markDirty, flushPendingSave])

  const openFile = useCallback(async () => {
    const result = await window.api.openFile()
    if (!result) return
    if (!(await flushPendingSave())) return
    snapshotDraftIfNeeded()
    const fileType = detectFileType(result.path)
    setFile({ path: result.path, content: result.content, isDirty: false, fileType })
    loadContent(result.content, fileType, result.path)
    await stableAddRecent(result.path, extractSnippet(result.content, fileType))
    document.title = `${result.path.split(/[/\\]/).pop()} — Lumina`
  }, [setFile, loadContent, stableAddRecent, snapshotDraftIfNeeded, flushPendingSave])

  const saveFileAs = useCallback(async () => {
    const content = getContent()
    const result = await window.api.saveFileAs(content, useAppStore.getState().file.path ?? undefined)
    if (!result) return
    const fileType = detectFileType(result.path)
    setFile({ path: result.path, isDirty: false, fileType })
    markDirty(false)
    clearDraft()  // draft is now a real saved file
    ;(window as Window & { __lumina_isDirty__?: boolean }).__lumina_isDirty__ = false
    await stableAddRecent(result.path, extractSnippet(content, fileType))
    document.title = `${result.path.split(/[/\\]/).pop()} — Lumina`
  }, [getContent, setFile, markDirty, clearDraft, stableAddRecent])

  const saveFile = useCallback(async () => {
    if (!useAppStore.getState().file.path) { await saveFileAs(); return }
    await writeCurrentFile()
  }, [saveFileAs, writeCurrentFile])

  // Menu-triggered open / save
  useEffect(() => {
    const unsubSave = window.api.onMenuSave(() => saveFile())
    const unsubSaveAs = window.api.onMenuSaveAs(() => saveFileAs())
    const unsubOpen = window.api.onOpenFile((path) => {
      if (path === null) newFile()
      else openFilePath(path)
    })
    // "Save" on the close prompt: only let the window close if the save really happened
    // (the user may cancel Save As, or the write may fail).
    const unsubClose = window.api.onSaveAndClose(async () => {
      await saveFile()
      if (!useAppStore.getState().file.isDirty) window.api.closeAfterSave()
    })
    return () => { unsubSave(); unsubSaveAs(); unsubOpen(); unsubClose() }
  }, [saveFile, saveFileAs, openFilePath, newFile])

  // Load initial file (CLI / most recent / welcome)
  useEffect(() => {
    window.api.readInitialFile().then(async (result) => {
      if (!result) return
      const fileType = detectFileType(result.path)
      setFile({ path: result.path, content: result.content, isDirty: false, fileType })
      loadContent(result.content, fileType, result.path)
      document.title = `${result.path.split(/[/\\]/).pop()} — Lumina`
      await window.api.addRecentFile(result.path, extractSnippet(result.content, fileType))
      const recents = await window.api.getRecentFiles()
      setRecentFiles(recents)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save: 2 seconds after the last edit, if the file already has a path
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null

    const unsub = useAppStore.subscribe((state) => {
      if (state.file.isDirty && state.file.path) {
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => {
          // Re-read state at fire time — path may have changed
          const s = useAppStore.getState()
          if (s.file.isDirty && s.file.path) saveFile()
        }, 2000)
      } else if (timer) {
        clearTimeout(timer)
        timer = null
      }
    })

    return () => {
      unsub()
      if (timer) clearTimeout(timer)
    }
  }, [saveFile])

  // Sync dirty flag to window global for close guard
  useEffect(() => {
    return useAppStore.subscribe((state) => {
      ;(window as Window & { __lumina_isDirty__?: boolean }).__lumina_isDirty__ = state.file.isDirty
    })
  }, [])

  return { openFile, saveFile, saveFileAs, newFile, openFilePath, openDraft }
}
