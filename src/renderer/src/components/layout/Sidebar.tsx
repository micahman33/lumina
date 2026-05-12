import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAppStore } from '../../store/appStore'
import { Search, FilePlus, Folder, Pin, PinOff, FolderOpen, Trash2, Pencil } from 'lucide-react'
import type { RecentFile } from '../../types/file'

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

interface CtxMenu {
  x: number
  y: number
  file: RecentFile
}

export function Sidebar({ onOpenFile, onNewFile }: SidebarProps): JSX.Element {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const recentFiles = useAppStore((s) => s.recentFiles)
  const setRecentFiles = useAppStore((s) => s.setRecentFiles)
  const activeFilePath = useAppStore((s) => s.file.path)
  const setFile = useAppStore((s) => s.setFile)
  const [query, setQuery] = useState('')
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null)
  const [renamingPath, setRenamingPath] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const ctxRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)

  const q = query.trim().toLowerCase()

  // Pinned files always sort first
  const sorted = [...recentFiles].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return 0
  })

  const filtered = q
    ? sorted.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          (f.snippet ?? '').toLowerCase().includes(q)
      )
    : sorted

  /** Return a short excerpt around the query match within the snippet. */
  function snippetExcerpt(snippet: string | undefined): string | null {
    if (!q || !snippet) return null
    const idx = snippet.toLowerCase().indexOf(q)
    if (idx === -1) return null
    const start = Math.max(0, idx - 30)
    const end = Math.min(snippet.length, idx + q.length + 60)
    return (start > 0 ? '…' : '') + snippet.slice(start, end) + (end < snippet.length ? '…' : '')
  }

  // Close context menu on outside click or Escape
  useEffect(() => {
    if (!ctxMenu) return
    const handler = (e: MouseEvent): void => {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) setCtxMenu(null)
    }
    const keyHandler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setCtxMenu(null)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [ctxMenu])

  // Focus rename input when entering rename mode
  useEffect(() => {
    if (renamingPath) {
      // Defer so the input is in the DOM
      setTimeout(() => {
        renameInputRef.current?.focus()
        renameInputRef.current?.select()
      }, 0)
    }
  }, [renamingPath])

  const handleContextMenu = (e: React.MouseEvent, file: RecentFile): void => {
    e.preventDefault()
    e.stopPropagation()
    // Clamp so menu never overflows viewport
    const menuH = 160 // approx height with rename item
    const x = Math.min(e.clientX, window.innerWidth - 200)
    const y = Math.min(e.clientY, window.innerHeight - menuH)
    setCtxMenu({ x, y, file })
  }

  const handlePin = async (file: RecentFile): Promise<void> => {
    setCtxMenu(null)
    const updated = await window.api.pinRecentFile(file.path)
    setRecentFiles(updated)
  }

  const handleReveal = (file: RecentFile): void => {
    setCtxMenu(null)
    window.api.revealFile(file.path)
  }

  const handleRemove = async (file: RecentFile): Promise<void> => {
    setCtxMenu(null)
    await window.api.removeRecentFile(file.path)
    setRecentFiles(recentFiles.filter((f) => f.path !== file.path))
  }

  const startRename = (file: RecentFile): void => {
    setCtxMenu(null)
    setRenamingPath(file.path)
    setRenameValue(file.name)
  }

  const commitRename = async (): Promise<void> => {
    if (!renamingPath) return
    const newName = renameValue.trim()
    setRenamingPath(null)
    if (!newName || newName === recentFiles.find((f) => f.path === renamingPath)?.name) return
    const result = await window.api.renameFile(renamingPath, newName)
    if (!result) return
    // Update local recents state
    setRecentFiles(
      recentFiles.map((f) => f.path === renamingPath ? { ...f, path: result.newPath, name: newName } : f)
    )
    // Update active file path if we just renamed the open file
    if (activeFilePath === renamingPath) {
      setFile({ path: result.newPath })
      document.title = `${newName} — Lumina`
    }
  }

  const cancelRename = (): void => {
    setRenamingPath(null)
  }

  // Parent directory of active file for footer
  const activeDir = activeFilePath
    ? activeFilePath.split(/[/\\]/).slice(0, -1).join('/') || '/'
    : ''

  return (
    <div
      className={`flex flex-col h-full shrink-0 overflow-hidden transition-all duration-200 ease-in-out ${sidebarOpen ? 'w-[220px]' : 'w-0'}`}
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
              const isRenaming = file.path === renamingPath
              return (
                <div
                  key={file.path}
                  onContextMenu={(e) => handleContextMenu(e, file)}
                  className="titlebar-no-drag w-full text-left transition-colors duration-100"
                  style={{
                    position: 'relative',
                    padding: '8px 12px 8px 16px',
                    borderRadius: 8,
                    background: active ? 'rgba(91,108,255,0.10)' : 'transparent',
                    cursor: isRenaming ? 'default' : 'pointer',
                    border: 'none',
                  }}
                  onClick={() => { if (!isRenaming) onOpenFile(file.path) }}
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

                  {/* Pin indicator */}
                  {file.pinned && !isRenaming && (
                    <div style={{ position: 'absolute', right: 8, top: 8 }}>
                      <Pin size={10} style={{ color: '#5B6CFF', opacity: 0.7 }} />
                    </div>
                  )}

                  {isRenaming ? (
                    <input
                      ref={renameInputRef}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); commitRename() }
                        if (e.key === 'Escape') cancelRename()
                      }}
                      onBlur={commitRename}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: '100%',
                        fontSize: 13,
                        fontWeight: 500,
                        color: 'var(--lm-ink)',
                        background: 'var(--lm-chrome)',
                        border: '1px solid #5B6CFF',
                        borderRadius: 4,
                        padding: '1px 5px',
                        outline: 'none',
                        caretColor: '#5B6CFF',
                      }}
                    />
                  ) : (
                    <>
                      <div style={{
                        fontSize: 13,
                        fontWeight: active ? 600 : 500,
                        color: 'var(--lm-ink)',
                        lineHeight: 1.3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        paddingRight: file.pinned ? 16 : 0,
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
                    </>
                  )}
                </div>
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

      {/* Right-click context menu — rendered via portal so it escapes overflow:hidden
          and any transform-based containing blocks in ancestor elements */}
      {ctxMenu && createPortal(
        <div
          ref={ctxRef}
          className="fixed z-[9999] py-1.5 rounded-xl shadow-xl border"
          style={{
            left: ctxMenu.x,
            top: ctxMenu.y,
            width: 192,
            background: 'var(--lm-chrome)',
            borderColor: 'var(--lm-border)',
          }}
        >
          <CtxItem
            icon={ctxMenu.file.pinned ? PinOff : Pin}
            label={ctxMenu.file.pinned ? 'Unpin' : 'Pin to top'}
            onClick={() => handlePin(ctxMenu.file)}
          />
          <CtxItem
            icon={Pencil}
            label="Rename"
            onClick={() => startRename(ctxMenu.file)}
          />
          <CtxItem
            icon={FolderOpen}
            label={window.api.platform === 'darwin' ? 'Reveal in Finder' : 'Show in Explorer'}
            onClick={() => handleReveal(ctxMenu.file)}
          />
          <div className="border-t my-1" style={{ borderColor: 'var(--lm-border)' }} />
          <CtxItem
            icon={Trash2}
            label="Remove from recents"
            danger
            onClick={() => handleRemove(ctxMenu.file)}
          />
        </div>,
        document.body
      )}
    </div>
  )
}

function CtxItem({
  icon: Icon,
  label,
  danger,
  onClick,
}: {
  icon: React.FC<{ size?: number }>
  label: string
  danger?: boolean
  onClick: () => void
}): JSX.Element {
  return (
    <button
      className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-sm transition-colors ${
        danger
          ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
          : 'hover:bg-black/5 dark:hover:bg-white/10'
      }`}
      style={{ color: danger ? undefined : 'var(--lm-ink)', border: 'none', background: 'none', cursor: 'pointer' }}
      onClick={onClick}
    >
      <Icon size={13} />
      <span className="flex-1 text-left text-[13px]">{label}</span>
    </button>
  )
}
