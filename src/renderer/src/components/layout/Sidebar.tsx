import { useRef, useState } from 'react'
import { useAppStore } from '../../store/appStore'
import { Search, FilePlus, Folder } from 'lucide-react'

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 2) return 'Edited just now'
  if (m < 60) return `${m} minutes ago`
  const h = Math.floor(m / 60)
  if (h < 24) return h === 1 ? '1 hour ago' : `${h} hours ago`
  const d = Math.floor(h / 24)
  if (d === 1) return 'Yesterday'
  if (d < 7) return `${d} days ago`
  return 'Last week'
}

interface SidebarProps {
  onOpenFile: (path: string) => void
  onNewFile: () => void
}

export function Sidebar({ onOpenFile, onNewFile }: SidebarProps): JSX.Element {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const recentFiles = useAppStore((s) => s.recentFiles)
  const activeFilePath = useAppStore((s) => s.file.path)
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const q = query.trim().toLowerCase()
  const filtered = q
    ? recentFiles.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          (f.snippet ?? '').toLowerCase().includes(q)
      )
    : recentFiles

  /** Return a short excerpt around the query match within the snippet. */
  function snippetExcerpt(snippet: string | undefined): string | null {
    if (!q || !snippet) return null
    const idx = snippet.toLowerCase().indexOf(q)
    if (idx === -1) return null
    const start = Math.max(0, idx - 30)
    const end = Math.min(snippet.length, idx + q.length + 60)
    return (start > 0 ? '…' : '') + snippet.slice(start, end) + (end < snippet.length ? '…' : '')
  }

  // Parent directory of active file for footer
  const activeDir = activeFilePath
    ? activeFilePath.split(/[/\\]/).slice(0, -1).join('/') || '/'
    : ''

  return (
    <div
      className={`flex flex-col shrink-0 overflow-hidden transition-all duration-200 ease-in-out ${sidebarOpen ? 'w-[220px]' : 'w-0'}`}
      style={{ borderRight: '1px solid var(--lm-border)', background: 'var(--lm-sidebar)' }}
    >
      <div className="w-[220px] flex flex-col h-full">
        {/* Search box */}
        <div className="px-2.5 pt-3.5 pb-0">
          <div
            className="flex items-center gap-2 px-2.5 rounded-lg cursor-text"
            style={{
              padding: '7px 10px',
              borderRadius: 8,
              background: 'rgba(0,0,0,0.04)',
              border: '1px solid rgba(0,0,0,0.03)',
            }}
            onClick={() => searchRef.current?.focus()}
          >
            <Search size={13} strokeWidth={1.6} style={{ color: 'var(--lm-ink-faint)', flexShrink: 0 }} />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search files"
              className="flex-1 bg-transparent border-none outline-none min-w-0"
              style={{ fontSize: 12, color: 'var(--lm-ink)', caretColor: '#5B6CFF' }}
            />
            {query ? (
              <button
                onClick={() => setQuery('')}
                style={{ fontSize: 11, color: 'var(--lm-ink-faint)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                ✕
              </button>
            ) : (
              <span
                style={{
                  fontSize: 10,
                  color: 'var(--lm-ink-faint)',
                  fontFamily: 'ui-monospace, monospace',
                  padding: '1px 5px',
                  borderRadius: 3,
                  background: 'rgba(0,0,0,0.05)',
                }}
              >
                ⌘K
              </span>
            )}
          </div>
        </div>

        {/* "Recent" header */}
        <div
          className="flex items-center justify-between px-3 pb-2 pt-3.5"
          style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--lm-ink-faint)' }}
        >
          <span>Recent</span>
          <button
            onClick={onNewFile}
            className="titlebar-no-drag hover:opacity-70 transition-opacity"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
            title="New file"
          >
            <FilePlus size={13} strokeWidth={1.6} style={{ color: 'var(--lm-ink-faint)' }} />
          </button>
        </div>

        {/* File list */}
        <div className="flex-1 overflow-y-auto px-2.5 pb-2 flex flex-col gap-0.5">
          {filtered.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--lm-ink-faint)', padding: '8px 12px' }}>
              {query ? 'No matches' : 'No recent files'}
            </div>
          ) : (
            filtered.map((file) => {
              const active = file.path === activeFilePath
              return (
                <button
                  key={file.path}
                  onClick={() => onOpenFile(file.path)}
                  title={file.path}
                  className="titlebar-no-drag w-full text-left transition-colors duration-100"
                  style={{
                    position: 'relative',
                    padding: '8px 12px 8px 16px',
                    borderRadius: 8,
                    background: active
                      ? 'rgba(91,108,255,0.10)'
                      : 'transparent',
                    cursor: 'pointer',
                    border: 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)'
                  }}
                  onMouseLeave={(e) => {
                    if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'
                  }}
                >
                  {/* Active indicator bar */}
                  {active && (
                    <div style={{
                      position: 'absolute', left: 4, top: 10, bottom: 10,
                      width: 3, borderRadius: 2,
                      background: '#5B6CFF',
                    }} />
                  )}
                  <div style={{
                    fontSize: 13,
                    fontWeight: active ? 600 : 500,
                    color: 'var(--lm-ink)',
                    lineHeight: 1.3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {file.name}
                  </div>
                  {(() => {
                    const excerpt = snippetExcerpt(file.snippet)
                    return excerpt ? (
                      <div style={{ fontSize: 11, color: 'var(--lm-ink-faint)', marginTop: 3, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {excerpt}
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: 'var(--lm-ink-faint)', marginTop: 2 }}>
                        {relativeTime(file.lastOpened)}
                      </div>
                    )
                  })()}
                </button>
              )
            })
          )}
        </div>

        {/* Footer — current folder */}
        {activeDir && (
          <div
            style={{
              borderTop: '1px solid var(--lm-border)',
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 11,
              color: 'var(--lm-ink-faint)',
            }}
          >
            <Folder size={13} strokeWidth={1.6} style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeDir}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
