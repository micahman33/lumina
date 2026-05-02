import { useCallback, useEffect } from 'react'
import { useAppStore } from '../store/appStore'
import type { Editor } from '@tiptap/react'
import type { FileType } from '../types/file'

// ── Helpers ───────────────────────────────────────────────────────────────

/** Derive file type from extension. */
export function detectFileType(path: string | null): FileType {
  if (!path) return 'md'
  const ext = path.split('.').pop()?.toLowerCase()
  if (ext === 'txt') return 'txt'
  return 'md'
}

/** Strip Markdown syntax to produce a plain-text snippet for search indexing. */
function extractSnippet(content: string, fileType: FileType = 'md', maxLen = 300): string {
  if (fileType === 'txt') return content.replace(/\n+/g, ' ').trim().slice(0, maxLen)
  return content
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`{1,3}[^`\n]*`{1,3}/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s*[-*+>]\s+/gm, '')
    .replace(/\n+/g, ' ')
    .trim()
    .slice(0, maxLen)
}

/**
 * Build a ProseMirror JSON document from raw plain text.
 * Detects simple `- item` / `1. item` list patterns; everything else is a paragraph.
 * Using JSON bypasses tiptap-markdown's content parser entirely.
 */
function buildTxtDoc(raw: string): object {
  const content: object[] = []
  const blocks = raw.split(/\r?\n\r?\n+/)

  for (const block of blocks) {
    const trimmed = block.trim()
    if (!trimmed) continue
    const lines = trimmed.split(/\r?\n/)

    if (lines.every((l) => /^[-*+]\s/.test(l))) {
      content.push({
        type: 'bulletList',
        content: lines.map((l) => ({
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: l.replace(/^[-*+]\s+/, '') }] }]
        }))
      })
      continue
    }

    if (lines.every((l) => /^\d+\.\s/.test(l))) {
      content.push({
        type: 'orderedList',
        content: lines.map((l) => ({
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: l.replace(/^\d+\.\s+/, '') }] }]
        }))
      })
      continue
    }

    // Paragraph — preserve hard line breaks within the block
    const inlineNodes: object[] = []
    lines.forEach((line, i) => {
      if (line) inlineNodes.push({ type: 'text', text: line })
      if (i < lines.length - 1) inlineNodes.push({ type: 'hardBreak' })
    })
    content.push({ type: 'paragraph', content: inlineNodes })
  }

  if (content.length === 0) content.push({ type: 'paragraph' })
  return { type: 'doc', content }
}

/**
 * Walk the ProseMirror doc and serialize to plain text.
 * List items get their markers back; paragraphs are double-newline separated.
 */
function serializeTxt(editor: Editor): string {
  const parts: string[] = []

  editor.state.doc.forEach((node) => {
    if (node.type.name === 'bulletList') {
      node.forEach((item) => parts.push(`- ${item.textContent}`))
      parts.push('')
    } else if (node.type.name === 'orderedList') {
      let i = (node.attrs.start as number) ?? 1
      node.forEach((item) => { parts.push(`${i}. ${item.textContent}`); i++ })
      parts.push('')
    } else {
      parts.push(node.textContent)
    }
  })

  return parts.join('\n').trimEnd() + '\n'
}

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
      if (fileType === 'txt') {
        editor.commands.setContent(buildTxtDoc(raw))
      } else {
        editor.commands.setContent(raw)
      }
      markDirty(false)
    },
    [editor, markDirty]
  )

  /** Serialize editor content to the correct format for saving. */
  const getContent = useCallback((): string => {
    if (!editor) return ''
    const fileType = useAppStore.getState().file.fileType
    if (fileType === 'txt') return serializeTxt(editor)
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
    const result = await window.api.saveFileAs(content)
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
