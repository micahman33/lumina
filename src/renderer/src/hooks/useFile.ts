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
 *
 * Strategy: scan line-by-line. Blank lines (\n\n) flush the current block and
 * become empty paragraph nodes (preserving the blank line on round-trip).
 * Non-blank lines accumulate into a "block". When a block is flushed:
 *   - ALL lines match `- item`  → bulletList node
 *   - ALL lines match `1. item` → orderedList node
 *   - Otherwise → one paragraph node per line (tight, no merging)
 *
 * This means:
 *   • "1. Micah\n2. Smith" without a preceding blank line → plain text paragraphs
 *   • "\n1. Micah\n2. Smith\n" (blank-line delimited) → formatted numbered list
 *
 * Serializing back with serializeTxt round-trips perfectly — the file on disk
 * always stays as plain text with `1.`/`-` markers intact.
 */
function buildTxtDoc(raw: string): object {
  const lines = raw.split(/\r?\n/)
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()

  const nodes: object[] = []
  let block: string[] = []

  /** Wrap list item text in a paragraph node, guarding against the empty-string
   *  case — ProseMirror text nodes MUST be non-empty or TipTap throws. */
  const listItemNode = (text: string): object => ({
    type: 'listItem',
    content: [
      text
        ? { type: 'paragraph', content: [{ type: 'text', text }] }
        : { type: 'paragraph' }
    ]
  })

  const flushBlock = (): void => {
    if (block.length === 0) return
    if (block.every((l) => /^[-*+]\s/.test(l))) {
      nodes.push({
        type: 'bulletList',
        content: block.map((l) => listItemNode(l.replace(/^[-*+]\s+/, '')))
      })
    } else if (block.every((l) => /^\d+\.\s/.test(l))) {
      nodes.push({
        type: 'orderedList',
        content: block.map((l) => listItemNode(l.replace(/^\d+\.\s+/, '')))
      })
    } else {
      // Regular block: one paragraph per line so Enter-key editing stays line-faithful
      for (const line of block) {
        nodes.push({ type: 'paragraph', content: [{ type: 'text', text: line }] })
      }
    }
    block = []
  }

  for (const line of lines) {
    if (line === '') {
      flushBlock()
      nodes.push({ type: 'paragraph' }) // blank line = empty paragraph
    } else {
      block.push(line)
    }
  }
  flushBlock()

  if (nodes.length === 0) nodes.push({ type: 'paragraph' })
  return { type: 'doc', content: nodes }
}

/**
 * Walk the ProseMirror doc and serialize back to plain text.
 *
 * List nodes are always written with a blank-line separator on each side so
 * that buildTxtDoc can detect them on the next open. Without this, a toolbar-
 * created bullet list saved as "New List:\n- item" would reload as plain text
 * because the first line breaks the "all lines match list pattern" check.
 *
 * Rules:
 *   paragraph   → one line (empty paragraph = blank line)
 *   bulletList  → "- item\n- item\n..." surrounded by blank lines
 *   orderedList → "1. item\n2. item\n..." surrounded by blank lines
 *
 * After building, collapse any 3+ consecutive newlines to 2 (one blank line)
 * so double-empty-paragraph situations don't produce double blank lines.
 */
function serializeTxt(editor: Editor): string {
  type Chunk = { kind: 'list' | 'para'; text: string }
  const chunks: Chunk[] = []

  editor.state.doc.forEach((node) => {
    if (node.type.name === 'bulletList') {
      const items: string[] = []
      node.forEach((item) => items.push(`- ${item.textContent}`))
      chunks.push({ kind: 'list', text: items.join('\n') })
    } else if (node.type.name === 'orderedList') {
      const items: string[] = []
      let idx = (node.attrs.start as number) ?? 1
      node.forEach((item) => { items.push(`${idx}. ${item.textContent}`); idx++ })
      chunks.push({ kind: 'list', text: items.join('\n') })
    } else {
      chunks.push({ kind: 'para', text: node.textContent })
    }
  })

  let out = ''
  for (let i = 0; i < chunks.length; i++) {
    const { kind, text } = chunks[i]
    if (i === 0) { out = text; continue }
    const prev = chunks[i - 1]
    // Lists need a blank line before/after to survive a round-trip through buildTxtDoc.
    // If the previous chunk was already an empty paragraph it has contributed one \n;
    // we only need one more \n to make \n\n. Otherwise we need two \n's.
    if (kind === 'list') {
      out += prev.text === '' ? '\n' + text : '\n\n' + text
    } else if (prev.kind === 'list') {
      out += '\n\n' + text
    } else {
      out += '\n' + text
    }
  }

  // Collapse 3+ newlines → 2 (prevents double blank lines when an empty paragraph
  // sits adjacent to a list that already forced a blank-line separator).
  return out.replace(/\n{3,}/g, '\n\n').trimStart() + '\n'
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
