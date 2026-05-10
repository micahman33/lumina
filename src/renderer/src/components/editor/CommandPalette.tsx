import { useEffect, useRef, useState, useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import {
  FilePlus,
  FolderOpen,
  Save,
  SaveAll,
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Quote,
  Terminal,
  List,
  ListOrdered,
  CheckSquare,
  Link,
  Table,
  Minus,
  PanelLeft,
  Search,
  Sun,
  Moon,
  Monitor,
  Clock,
  LucideIcon,
} from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import type { RecentFile } from '../../types/file'

// ─── Fuzzy matching utils ──────────────────────────────────────────────────

/**
 * Returns true if query matches text (or any keyword) via substring or sequential chars.
 * Empty query always matches.
 */
export function fuzzyMatch(query: string, text: string, keywords: string[] = []): boolean {
  return fuzzyScore(query, text, keywords) > 0
}

/**
 * Returns a numeric score for how well query matches text (or keywords).
 * - Empty query → 1
 * - Exact substring → 3
 * - Sequential chars → 1
 * - No match → 0
 */
export function fuzzyScore(query: string, text: string, keywords: string[] = []): number {
  if (!query) return 1
  const q = query.toLowerCase()
  const t = text.toLowerCase()

  // Check text itself
  const textScore = scoreAgainst(q, t)
  if (textScore > 0) return textScore

  // Check keywords
  for (const kw of keywords) {
    const kwScore = scoreAgainst(q, kw.toLowerCase())
    if (kwScore > 0) return kwScore
  }

  return 0
}

function scoreAgainst(q: string, t: string): number {
  if (t.includes(q)) return 3

  // Sequential char match
  let qi = 0
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++
  }
  if (qi === q.length) return 1

  return 0
}

// ─── Command definitions ───────────────────────────────────────────────────

type Category = 'file' | 'format' | 'insert' | 'view' | 'recent'

const CATEGORY_ORDER: Category[] = ['file', 'format', 'insert', 'view', 'recent']

const CATEGORY_LABELS: Record<Category, string> = {
  file: 'File',
  format: 'Format',
  insert: 'Insert',
  view: 'View',
  recent: 'Recent',
}

const CATEGORY_COLORS: Record<Category, string> = {
  file: '#5B6CFF',
  format: '#22c55e',
  insert: '#f59e0b',
  view: '#06b6d4',
  recent: '#a855f7',
}

interface CommandDef {
  id: string
  label: string
  category: Category
  icon: LucideIcon
  shortcut?: string
  keywords?: string[]
  action: (ctx: CommandContext) => void
}

interface CommandContext {
  editor: Editor | null
  onOpenFile: () => void
  onSaveFile: () => void
  onSaveFileAs: () => void
  onNewFile: () => void
}

const STATIC_COMMANDS: CommandDef[] = [
  // ── File ────────────────────────────────────────────────────────────────
  {
    id: 'file:new',
    label: 'New File',
    category: 'file',
    icon: FilePlus,
    shortcut: '⌘N',
    keywords: ['create', 'new'],
    action: ({ onNewFile }) => onNewFile(),
  },
  {
    id: 'file:open',
    label: 'Open File',
    category: 'file',
    icon: FolderOpen,
    shortcut: '⌘O',
    keywords: ['open', 'browse'],
    action: ({ onOpenFile }) => onOpenFile(),
  },
  {
    id: 'file:save',
    label: 'Save',
    category: 'file',
    icon: Save,
    shortcut: '⌘S',
    keywords: ['save'],
    action: ({ onSaveFile }) => onSaveFile(),
  },
  {
    id: 'file:save-as',
    label: 'Save As',
    category: 'file',
    icon: SaveAll,
    keywords: ['save as', 'export'],
    action: ({ onSaveFileAs }) => onSaveFileAs(),
  },

  // ── Format ──────────────────────────────────────────────────────────────
  {
    id: 'format:bold',
    label: 'Bold',
    category: 'format',
    icon: Bold,
    shortcut: '⌘B',
    keywords: ['bold', 'strong'],
    action: ({ editor }) => editor?.chain().focus().toggleBold().run(),
  },
  {
    id: 'format:italic',
    label: 'Italic',
    category: 'format',
    icon: Italic,
    shortcut: '⌘I',
    keywords: ['italic', 'emphasis', 'em'],
    action: ({ editor }) => editor?.chain().focus().toggleItalic().run(),
  },
  {
    id: 'format:strikethrough',
    label: 'Strikethrough',
    category: 'format',
    icon: Strikethrough,
    keywords: ['strikethrough', 'strike', 'del'],
    action: ({ editor }) => editor?.chain().focus().toggleStrike().run(),
  },
  {
    id: 'format:inline-code',
    label: 'Inline Code',
    category: 'format',
    icon: Code,
    shortcut: '⌘E',
    keywords: ['code', 'inline', 'monospace'],
    action: ({ editor }) => editor?.chain().focus().toggleCode().run(),
  },
  {
    id: 'format:h1',
    label: 'Heading 1',
    category: 'format',
    icon: Heading1,
    shortcut: '⌘⌥1',
    keywords: ['heading', 'h1', 'title'],
    action: ({ editor }) => editor?.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: 'format:h2',
    label: 'Heading 2',
    category: 'format',
    icon: Heading2,
    shortcut: '⌘⌥2',
    keywords: ['heading', 'h2', 'subtitle'],
    action: ({ editor }) => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: 'format:h3',
    label: 'Heading 3',
    category: 'format',
    icon: Heading3,
    shortcut: '⌘⌥3',
    keywords: ['heading', 'h3'],
    action: ({ editor }) => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: 'format:h4',
    label: 'Heading 4',
    category: 'format',
    icon: Heading4,
    shortcut: '⌘⌥4',
    keywords: ['heading', 'h4'],
    action: ({ editor }) => editor?.chain().focus().toggleHeading({ level: 4 }).run(),
  },
  {
    id: 'format:blockquote',
    label: 'Blockquote',
    category: 'format',
    icon: Quote,
    keywords: ['blockquote', 'quote'],
    action: ({ editor }) => editor?.chain().focus().toggleBlockquote().run(),
  },
  {
    id: 'format:code-block',
    label: 'Code Block',
    category: 'format',
    icon: Terminal,
    keywords: ['code block', 'fenced', 'fence'],
    action: ({ editor }) => editor?.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: 'format:bullet-list',
    label: 'Bullet List',
    category: 'format',
    icon: List,
    keywords: ['bullet', 'list', 'unordered'],
    action: ({ editor }) => editor?.chain().focus().toggleBulletList().run(),
  },
  {
    id: 'format:numbered-list',
    label: 'Numbered List',
    category: 'format',
    icon: ListOrdered,
    keywords: ['numbered', 'ordered', 'list'],
    action: ({ editor }) => editor?.chain().focus().toggleOrderedList().run(),
  },
  {
    id: 'format:task-list',
    label: 'Task List',
    category: 'format',
    icon: CheckSquare,
    keywords: ['task', 'todo', 'checkbox', 'check'],
    action: ({ editor }) => editor?.chain().focus().toggleTaskList().run(),
  },

  // ── Insert ──────────────────────────────────────────────────────────────
  {
    id: 'insert:link',
    label: 'Link',
    category: 'insert',
    icon: Link,
    shortcut: '⌘K',
    keywords: ['link', 'url', 'href'],
    action: () => useAppStore.getState().setLinkDialogOpen(true),
  },
  {
    id: 'insert:table',
    label: 'Table',
    category: 'insert',
    icon: Table,
    keywords: ['table', 'grid'],
    action: ({ editor }) =>
      editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    id: 'insert:hr',
    label: 'Horizontal Rule',
    category: 'insert',
    icon: Minus,
    keywords: ['horizontal rule', 'divider', 'separator', 'hr'],
    action: ({ editor }) => editor?.chain().focus().setHorizontalRule().run(),
  },

  // ── View ────────────────────────────────────────────────────────────────
  {
    id: 'view:toggle-sidebar',
    label: 'Toggle Sidebar',
    category: 'view',
    icon: PanelLeft,
    keywords: ['sidebar', 'panel', 'toggle'],
    action: () => useAppStore.getState().toggleSidebar(),
  },
  {
    id: 'view:find-replace',
    label: 'Find & Replace',
    category: 'view',
    icon: Search,
    shortcut: '⌘F',
    keywords: ['find', 'replace', 'search'],
    action: () => useAppStore.getState().setFindReplaceOpen(true),
  },
  {
    id: 'view:theme-light',
    label: 'Theme → Light',
    category: 'view',
    icon: Sun,
    keywords: ['theme', 'light', 'appearance'],
    action: () => useAppStore.getState().setTheme('light'),
  },
  {
    id: 'view:theme-dark',
    label: 'Theme → Dark',
    category: 'view',
    icon: Moon,
    keywords: ['theme', 'dark', 'appearance'],
    action: () => useAppStore.getState().setTheme('dark'),
  },
  {
    id: 'view:theme-system',
    label: 'Theme → System',
    category: 'view',
    icon: Monitor,
    keywords: ['theme', 'system', 'auto', 'appearance'],
    action: () => useAppStore.getState().setTheme('system'),
  },
]

function buildRecentCommands(recentFiles: RecentFile[]): CommandDef[] {
  return recentFiles.slice(0, 5).map((f) => ({
    id: `recent:${f.path}`,
    label: f.name,
    category: 'recent' as Category,
    icon: Clock,
    keywords: [f.path, f.name],
    action: () => {
      // Opening a recent file is triggered via the IPC / file API — we just
      // dispatch the open dialog with the path pre-filled. In practice the
      // caller can wire this up; for now we use the IPC helper if available.
      const api = (window as Window & { api?: { openFile?: (path: string) => void } }).api
      if (api?.openFile) {
        api.openFile(f.path)
      }
    },
  }))
}

// ─── Scored result type ────────────────────────────────────────────────────

interface ScoredCommand extends CommandDef {
  score: number
}

function filterAndSort(query: string, commands: CommandDef[]): ScoredCommand[] {
  const results: ScoredCommand[] = []
  for (const cmd of commands) {
    const score = fuzzyScore(query, cmd.label, cmd.keywords)
    if (score > 0) {
      results.push({ ...cmd, score })
    }
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    const ai = CATEGORY_ORDER.indexOf(a.category)
    const bi = CATEGORY_ORDER.indexOf(b.category)
    return ai - bi
  })

  return results
}

// ─── CommandPalette component ──────────────────────────────────────────────

interface CommandPaletteProps {
  editor: Editor | null
  onOpenFile: () => void
  onSaveFile: () => void
  onSaveFileAs: () => void
  onNewFile: () => void
}

export function CommandPalette({
  editor,
  onOpenFile,
  onSaveFile,
  onSaveFileAs,
  onNewFile,
}: CommandPaletteProps): JSX.Element | null {
  const commandPaletteOpen = useAppStore((s) => s.commandPaletteOpen)
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen)
  const recentFiles = useAppStore((s) => s.recentFiles)

  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const allCommands = [...STATIC_COMMANDS, ...buildRecentCommands(recentFiles)]
  const results = filterAndSort(query, allCommands)

  // Reset state when opening
  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('')
      setActiveIndex(0)
      // Delay focus slightly to ensure the element is rendered
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [commandPaletteOpen])

  // Clamp active index when results change
  useEffect(() => {
    setActiveIndex((prev) => Math.min(prev, Math.max(0, results.length - 1)))
  }, [results.length])

  const close = useCallback(() => {
    setCommandPaletteOpen(false)
  }, [setCommandPaletteOpen])

  const execute = useCallback(
    (cmd: CommandDef) => {
      close()
      const ctx: CommandContext = { editor, onOpenFile, onSaveFile, onSaveFileAs, onNewFile }
      cmd.action(ctx)
    },
    [close, editor, onOpenFile, onSaveFile, onSaveFileAs, onNewFile]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((prev) => Math.min(prev + 1, results.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((prev) => Math.max(prev - 1, 0))
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (results[activeIndex]) execute(results[activeIndex])
        return
      }
    },
    [close, execute, results, activeIndex]
  )

  // Scroll active row into view
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const row = list.querySelector<HTMLElement>('[data-active="true"]')
    if (row) row.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  if (!commandPaletteOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
        background: 'rgba(0,0,0,0.4)',
      }}
      onMouseDown={(e) => {
        // Close when clicking backdrop
        if (e.target === e.currentTarget) close()
      }}
    >
      <div
        style={{
          width: '600px',
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: '400px',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--lm-chrome)',
          border: '1px solid var(--lm-border)',
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '10px 14px',
            borderBottom: '1px solid var(--lm-border)',
            gap: '8px',
          }}
        >
          <Search size={15} style={{ color: 'var(--lm-ink-soft)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActiveIndex(0)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search commands…"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--lm-ink)',
              fontSize: '14px',
              lineHeight: '1.5',
            }}
          />
          <span
            style={{
              fontSize: '11px',
              color: 'var(--lm-ink-faint)',
              background: 'var(--lm-sidebar)',
              border: '1px solid var(--lm-border)',
              borderRadius: '4px',
              padding: '1px 5px',
              flexShrink: 0,
            }}
          >
            esc
          </span>
        </div>

        {/* Results list */}
        <div
          ref={listRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '4px 0',
          }}
        >
          {results.length === 0 && (
            <div
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                color: 'var(--lm-ink-faint)',
                fontSize: '13px',
              }}
            >
              No commands found
            </div>
          )}
          {results.map((cmd, idx) => {
            const isActive = idx === activeIndex
            const IconComp = cmd.icon
            return (
              <div
                key={cmd.id}
                data-active={isActive ? 'true' : 'false'}
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseDown={(e) => {
                  e.preventDefault()
                  execute(cmd)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '7px 14px',
                  cursor: 'pointer',
                  background: isActive ? 'rgba(91,108,255,0.12)' : 'transparent',
                  color: isActive ? '#5B6CFF' : 'var(--lm-ink)',
                  userSelect: 'none',
                }}
              >
                {/* Icon */}
                <IconComp
                  size={14}
                  style={{
                    flexShrink: 0,
                    color: isActive ? '#5B6CFF' : 'var(--lm-ink-soft)',
                  }}
                />
                {/* Label */}
                <span style={{ flex: 1, fontSize: '13px', fontWeight: 450 }}>{cmd.label}</span>
                {/* Category pill */}
                <span
                  style={{
                    fontSize: '10px',
                    padding: '1px 6px',
                    borderRadius: '9999px',
                    border: '1px solid',
                    borderColor: isActive
                      ? 'rgba(91,108,255,0.4)'
                      : CATEGORY_COLORS[cmd.category] + '55',
                    color: isActive ? '#5B6CFF' : CATEGORY_COLORS[cmd.category],
                    background: isActive
                      ? 'rgba(91,108,255,0.08)'
                      : CATEGORY_COLORS[cmd.category] + '15',
                    flexShrink: 0,
                    lineHeight: '1.6',
                  }}
                >
                  {CATEGORY_LABELS[cmd.category]}
                </span>
                {/* Shortcut */}
                {cmd.shortcut && (
                  <span
                    style={{
                      fontSize: '11px',
                      color: isActive ? 'rgba(91,108,255,0.7)' : 'var(--lm-ink-faint)',
                      flexShrink: 0,
                      fontFamily: 'system-ui, sans-serif',
                    }}
                  >
                    {cmd.shortcut}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
