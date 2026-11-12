import { useCallback, useEffect, useRef } from 'react'
import { useAppStore } from '../store/appStore'
import type { Editor } from '@tiptap/react'
import { DEFAULT_META } from '../types/file'
import type { FileMeta, FileType, OpenFileResult, ViewKind } from '../types/file'
import { buildTxtDoc, serializeTxtDoc, detectFileType, extractSnippet, viewKindFor } from '../utils/txtUtils'
import { resolveRelativeImagePaths, unresolveRelativeImagePaths, normalizeAlignAttributes } from '../utils/markdownUtils'
import { getSurface, registerSurface } from '../surfaces'

// Re-export detectFileType for backward compatibility (other files import it from here)
export { detectFileType } from '../utils/txtUtils'

const fileName = (path: string): string => path.split(/[/\\]/).pop() ?? path

function currentView(): ViewKind {
  const { fileType, viewAsText } = useAppStore.getState().file
  return viewKindFor(fileType, viewAsText)
}

/** Switch a CSV between the table and the raw text, carrying unsaved edits across. */
export function toggleCsvTextView(): void {
  const { file, setFile } = useAppStore.getState()
  const content = getSurface(currentView())?.getContent() ?? file.content
  setFile({ content, viewAsText: !file.viewAsText, loadId: file.loadId + 1 })
}

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
  const setSaveBlocked = useAppStore((s) => s.setSaveBlocked)
  const setViewStatus = useAppStore((s) => s.setViewStatus)

  /** Add to recents without reordering existing entries mid-session. */
  const stableAddRecent = useCallback(
    async (path: string, snippet?: string) => {
      await window.api.addRecentFile(path, snippet)
      const current = useAppStore.getState().recentFiles
      if (!current.some((f) => f.path === path)) {
        setRecentFiles([{ path, name: fileName(path), lastOpened: new Date().toISOString(), snippet }, ...current].slice(0, 20))
      }
    },
    [setRecentFiles]
  )

  /**
   * Put content into the editor for this file type. The code and table views load themselves
   * from the store (see `loadId`), so only the rich TipTap view is driven from here.
   */
  const loadContent = useCallback(
    (raw: string, fileType: FileType, filePath?: string | null) => {
      if (!editor) return
      if (viewKindFor(fileType) === 'rich') {
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
      }
      markDirty(false)
    },
    [editor, markDirty]
  )

  // The rich (TipTap) view as a document surface
  useEffect(() => {
    if (!editor) return
    return registerSurface('rich', {
      getContent: () => {
        const { fileType, path } = useAppStore.getState().file
        if (fileType === 'txt') return serializeTxtDoc(editor.state.doc)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = (editor.storage as any).markdown?.getMarkdown() ?? editor.getText()
        // Strip the media:// prefixes we added on load — restore original relative paths
        return path ? unresolveRelativeImagePaths(raw, path) : raw
      },
      snapshot: () => editor.state.doc,
      isUnchangedSince: (doc) => editor.state.doc.eq(doc as typeof editor.state.doc),
      focus: () => editor.commands.focus(),
    })
  }, [editor])

  /** Show a freshly read file. Leaves the document clean. */
  const applyOpened = useCallback(
    (result: OpenFileResult) => {
      const fileType = detectFileType(result.path)
      const meta: FileMeta = {
        encoding: result.encoding,
        hasBom: result.hasBom,
        eol: result.eol,
        mtimeMs: result.mtimeMs,
        readOnly: result.readOnly,
      }
      setFile({
        path: result.path,
        content: result.content,
        isDirty: false,
        fileType,
        meta,
        kind: result.kind,
        size: result.size,
        viewAsText: false,
        loadId: useAppStore.getState().file.loadId + 1,
      })
      setSaveBlocked(false)
      setViewStatus({})
      editor?.setEditable(!result.readOnly)
      loadContent(result.content, fileType, result.path)
      document.title = `${fileName(result.path)} — Lumina`
    },
    [editor, setFile, setSaveBlocked, setViewStatus, loadContent]
  )

  const reloadFromDisk = useCallback(
    async (path: string) => {
      const result = await window.api.openFilePath(path)
      if (result && useAppStore.getState().file.path === path) applyOpened(result)
    },
    [applyOpened]
  )

  /**
   * Write the current document to disk and report whether it is now safely saved.
   *  - Refuses to overwrite a file another program changed; the user decides what happens.
   *  - Only marks the document clean if nothing was typed while the write was in flight —
   *    otherwise those keystrokes would be flagged as saved and never auto-saved.
   */
  const saveInFlight = useRef<Promise<boolean> | null>(null)
  const writeCurrentFile = useCallback(async (): Promise<boolean> => {
    // One save at a time: a second caller (auto-save firing while a conflict prompt is up)
    // waits for the first, then re-checks whether there is still anything to do.
    if (saveInFlight.current) {
      await saveInFlight.current
      if (!useAppStore.getState().file.isDirty) return true
    }
    const run = async (): Promise<boolean> => {
      const { path, meta, kind, content: loaded } = useAppStore.getState().file
      if (!path) return false
      if (kind === 'binary' || meta.readOnly) return true
      const surface = getSurface(currentView())
      // getContent first: format-on-save may tidy the document, and the snapshot must be
      // of the document as written.
      const content = surface ? surface.getContent() : loaded
      const snapshot = surface?.snapshot()

      let result = await window.api.saveFile(path, content, meta)
      if (!result.ok && result.reason === 'conflict') {
        const choice = await window.api.confirmConflict(fileName(path))
        if (choice === 'reload') {
          await reloadFromDisk(path)
          return true
        }
        if (choice === 'cancel') {
          setSaveBlocked(true)
          return false
        }
        result = await window.api.saveFile(path, content, meta, true)
      }
      if (!result.ok) {
        showToast(`Couldn't save ${fileName(path)}`, 'error')
        return false
      }
      const now = useAppStore.getState().file
      if (now.path === path) {
        setFile({ meta: { ...now.meta, mtimeMs: result.mtimeMs } })
        setSaveBlocked(false)
        if (!surface || surface.isUnchangedSince(snapshot)) markDirty(false)
      }
      return true
    }
    saveInFlight.current = run().finally(() => { saveInFlight.current = null })
    return saveInFlight.current
  }, [markDirty, setFile, setSaveBlocked, showToast, reloadFromDisk])

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
      const raw = (editor.storage as unknown as Record<string, { getMarkdown?: () => string }>)
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
        showToast(`Couldn't open ${fileName(path)}`, 'error')
        return
      }
      applyOpened(result)
      await stableAddRecent(result.path, extractSnippet(result.content, detectFileType(result.path)))
    },
    [applyOpened, stableAddRecent, snapshotDraftIfNeeded, flushPendingSave, showToast]
  )

  /** Reset to a blank, untitled Markdown document holding `content`. */
  const showUntitled = useCallback(
    (content: string) => {
      setFile({
        path: null,
        content,
        isDirty: false,
        fileType: 'md',
        meta: DEFAULT_META,
        kind: 'text',
        size: 0,
        viewAsText: false,
        loadId: useAppStore.getState().file.loadId + 1,
      })
      setSaveBlocked(false)
      setViewStatus({})
      editor?.setEditable(true)
      // loadContent leaves the document clean (setContent alone would flag it dirty)
      loadContent(content, 'md', null)
    },
    [editor, setFile, setSaveBlocked, setViewStatus, loadContent]
  )

  const newFile = useCallback(async () => {
    if (!(await flushPendingSave())) return
    snapshotDraftIfNeeded()
    showUntitled('')
    document.title = 'Untitled — Lumina'
  }, [showUntitled, snapshotDraftIfNeeded, flushPendingSave])

  /** Restore the in-memory draft into the editor. */
  const openDraft = useCallback(async () => {
    const { draft } = useAppStore.getState()
    if (!draft || !editor) return
    if (!(await flushPendingSave())) return
    showUntitled(draft.content)
    // A draft is by definition unsaved
    markDirty(true)
    document.title = 'Unsaved draft — Lumina'
  }, [editor, showUntitled, markDirty, flushPendingSave])

  const openFile = useCallback(async () => {
    const result = await window.api.openFile()
    if (!result) return
    if (result.path === useAppStore.getState().file.path) return
    if (!(await flushPendingSave())) return
    snapshotDraftIfNeeded()
    applyOpened(result)
    await stableAddRecent(result.path, extractSnippet(result.content, detectFileType(result.path)))
  }, [applyOpened, stableAddRecent, snapshotDraftIfNeeded, flushPendingSave])

  const saveFileAs = useCallback(async () => {
    const before = useAppStore.getState().file
    if (before.kind === 'binary') return
    const viewBefore = currentView()
    const content = getSurface(viewBefore)?.getContent() ?? before.content
    // A read-only file is read-only because of its encoding; a copy is written as UTF-8
    const meta = before.meta.readOnly ? DEFAULT_META : before.meta
    const result = await window.api.saveFileAs(content, before.path ?? undefined, meta)
    if (!result) return
    const fileType = detectFileType(result.path)
    setFile({
      path: result.path,
      isDirty: false,
      fileType,
      viewAsText: false,
      meta: { ...meta, mtimeMs: result.mtimeMs, readOnly: false },
    })
    setSaveBlocked(false)
    editor?.setEditable(true)
    if (viewKindFor(fileType) !== viewBefore || fileType !== before.fileType) {
      // Saved under a different type (notes.md → notes.json): show it in that type's view
      setFile({ content, loadId: useAppStore.getState().file.loadId + 1 })
      loadContent(content, fileType, result.path)
    }
    markDirty(false)
    clearDraft()  // draft is now a real saved file
    await stableAddRecent(result.path, extractSnippet(content, fileType))
    document.title = `${fileName(result.path)} — Lumina`
  }, [editor, setFile, setSaveBlocked, markDirty, clearDraft, stableAddRecent, loadContent])

  const saveFile = useCallback(async () => {
    const { path, meta } = useAppStore.getState().file
    if (!path || meta.readOnly) { await saveFileAs(); return }
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
    if (!editor) return
    window.api.readInitialFile().then(async (result) => {
      if (!result) return
      applyOpened(result)
      await window.api.addRecentFile(result.path, extractSnippet(result.content, detectFileType(result.path)))
      const recents = await window.api.getRecentFiles()
      setRecentFiles(recents)
    })
  }, [!!editor]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save: 2 seconds after the last edit, if the file already has a path
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    const wanted = (s: ReturnType<typeof useAppStore.getState>): boolean =>
      s.file.isDirty && !!s.file.path && !s.file.meta.readOnly && !s.saveBlocked

    const unsub = useAppStore.subscribe((state) => {
      if (wanted(state)) {
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => {
          // Re-read state at fire time — path may have changed
          if (wanted(useAppStore.getState())) writeCurrentFile()
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
  }, [writeCurrentFile])

  // Pick up changes another program made to the open file. Checked when the window regains
  // focus, and only when there are no unsaved edits to lose (a dirty document is handled by
  // the conflict prompt on save instead).
  useEffect(() => {
    const onFocus = async (): Promise<void> => {
      const { path, isDirty, meta } = useAppStore.getState().file
      if (!path || isDirty || meta.mtimeMs === null) return
      const onDisk = await window.api.statFile(path)
      const now = useAppStore.getState().file
      if (onDisk !== null && now.path === path && !now.isDirty && onDisk > meta.mtimeMs + 1) {
        await reloadFromDisk(path)
      }
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [reloadFromDisk])

  // Dropping a file anywhere on the window opens it. Images dropped on a Markdown document
  // are handled (and stopped) by the editor itself, so they never reach this listener.
  useEffect(() => {
    const hasFiles = (e: DragEvent): boolean => !!e.dataTransfer?.types.includes('Files')
    const onDragOver = (e: DragEvent): void => { if (hasFiles(e)) e.preventDefault() }
    const onDrop = (e: DragEvent): void => {
      if (!hasFiles(e)) return
      e.preventDefault()
      const file = Array.from(e.dataTransfer?.files ?? []).find((f) => !f.type.startsWith('image/'))
      if (!file) return
      const path = window.api.getPathForFile(file)
      if (path) openFilePath(path)
    }
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('drop', onDrop)
    }
  }, [openFilePath])

  // Sync dirty flag to window global for close guard
  useEffect(() => {
    return useAppStore.subscribe((state) => {
      ;(window as Window & { __lumina_isDirty__?: boolean }).__lumina_isDirty__ = state.file.isDirty
    })
  }, [])

  return { openFile, saveFile, saveFileAs, newFile, openFilePath, openDraft }
}
