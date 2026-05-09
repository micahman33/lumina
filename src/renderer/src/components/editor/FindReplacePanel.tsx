import { useEffect, useRef, useState } from 'react'
import { ChevronUp, ChevronDown, X, Replace, ReplaceAll, CaseSensitive } from 'lucide-react'
import type { Editor } from '@tiptap/react'
import { useAppStore } from '../../store/appStore'
import type { SearchStorage } from '../../extensions/searchAndReplace'

interface FindReplacePanelProps {
  editor: Editor
}

export function FindReplacePanel({ editor }: FindReplacePanelProps): JSX.Element | null {
  const open = useAppStore((s) => s.findReplaceOpen)
  const setOpen = useAppStore((s) => s.setFindReplaceOpen)

  const [searchTerm, setSearchTerm] = useState('')
  const [replaceTerm, setReplaceTerm] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [, forceUpdate] = useState(0)

  const searchRef = useRef<HTMLInputElement>(null)
  const replaceRef = useRef<HTMLInputElement>(null)

  // Focus search input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50)
    }
  }, [open])

  // Keep editor decorations in sync
  useEffect(() => {
    if (!open) {
      editor.commands.clearSearch()
      return
    }
    editor.commands.setSearchTerm(searchTerm, caseSensitive)
    forceUpdate((n) => n + 1) // re-render to reflect new result count
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, caseSensitive, open])

  // Close on Escape anywhere in panel
  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') close()
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      editor.commands.nextSearchResult()
      forceUpdate((n) => n + 1)
    }
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault()
      editor.commands.prevSearchResult()
      forceUpdate((n) => n + 1)
    }
  }

  const close = (): void => {
    editor.commands.clearSearch()
    setOpen(false)
    editor.commands.focus()
  }

  if (!open) return null

  const storage = editor.storage.searchAndReplace as SearchStorage
  const count = storage?.results?.length ?? 0
  const index = storage?.resultIndex ?? 0
  const hasResults = count > 0
  const countLabel = searchTerm
    ? count === 0
      ? 'No results'
      : `${index + 1} / ${count}`
    : ''

  const navigate = (dir: 'next' | 'prev'): void => {
    if (dir === 'next') editor.commands.nextSearchResult()
    else editor.commands.prevSearchResult()
    forceUpdate((n) => n + 1)
  }

  const replaceCurrent = (): void => {
    editor.commands.setReplaceTerm(replaceTerm)
    editor.commands.replaceCurrentResult()
    // Refresh results after replace
    setTimeout(() => {
      editor.commands.setSearchTerm(searchTerm, caseSensitive)
      forceUpdate((n) => n + 1)
    }, 0)
  }

  const replaceAll = (): void => {
    editor.commands.setReplaceTerm(replaceTerm)
    editor.commands.replaceAllResults()
    setTimeout(() => {
      editor.commands.setSearchTerm(searchTerm, caseSensitive)
      forceUpdate((n) => n + 1)
    }, 0)
  }

  return (
    <div
      className="absolute top-2 right-4 z-50 shadow-xl rounded-xl border overflow-hidden"
      style={{
        background: 'var(--lm-chrome)',
        borderColor: 'var(--lm-border)',
        width: 340,
      }}
      onKeyDown={handleKeyDown}
    >
      {/* ── Find row ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 px-2 py-1.5" style={{ borderBottom: '1px solid var(--lm-border)' }}>
        {/* Search input */}
        <input
          ref={searchRef}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Find"
          spellCheck={false}
          className="flex-1 bg-transparent border-none outline-none text-sm min-w-0"
          style={{ color: 'var(--lm-ink)', fontSize: 13 }}
        />

        {/* Result count */}
        <span
          className="text-xs shrink-0 tabular-nums"
          style={{
            color: searchTerm && count === 0 ? '#EF4444' : 'var(--lm-ink-faint)',
            minWidth: 48,
            textAlign: 'right',
          }}
        >
          {countLabel}
        </span>

        {/* Case sensitive toggle */}
        <button
          title="Case sensitive"
          onClick={() => setCaseSensitive((v) => !v)}
          className="p-1 rounded transition-colors"
          style={{
            color: caseSensitive ? '#5B6CFF' : 'var(--lm-ink-faint)',
            background: caseSensitive ? 'rgba(91,108,255,0.12)' : 'transparent',
          }}
        >
          <CaseSensitive size={14} />
        </button>

        {/* Prev / Next */}
        <button
          title="Previous (Shift+Enter)"
          disabled={!hasResults}
          onClick={() => navigate('prev')}
          className="p-1 rounded transition-colors hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30"
          style={{ color: 'var(--lm-ink-faint)' }}
        >
          <ChevronUp size={14} />
        </button>
        <button
          title="Next (Enter)"
          disabled={!hasResults}
          onClick={() => navigate('next')}
          className="p-1 rounded transition-colors hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30"
          style={{ color: 'var(--lm-ink-faint)' }}
        >
          <ChevronDown size={14} />
        </button>

        {/* Close */}
        <button
          title="Close (Esc)"
          onClick={close}
          className="p-1 rounded transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          style={{ color: 'var(--lm-ink-faint)' }}
        >
          <X size={14} />
        </button>
      </div>

      {/* ── Replace row ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 px-2 py-1.5">
        <input
          ref={replaceRef}
          value={replaceTerm}
          onChange={(e) => setReplaceTerm(e.target.value)}
          placeholder="Replace"
          spellCheck={false}
          className="flex-1 bg-transparent border-none outline-none text-sm min-w-0"
          style={{ color: 'var(--lm-ink)', fontSize: 13 }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); replaceCurrent() }
          }}
        />
        <button
          title="Replace"
          disabled={!hasResults}
          onClick={replaceCurrent}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30"
          style={{ color: 'var(--lm-ink-faint)', fontSize: 12 }}
        >
          <Replace size={13} />
          <span>Replace</span>
        </button>
        <button
          title="Replace all"
          disabled={!hasResults}
          onClick={replaceAll}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30"
          style={{ color: 'var(--lm-ink-faint)', fontSize: 12 }}
        >
          <ReplaceAll size={13} />
          <span>All</span>
        </button>
      </div>
    </div>
  )
}
