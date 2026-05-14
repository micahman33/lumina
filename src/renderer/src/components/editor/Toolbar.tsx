import { useState, useEffect } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Tooltip from '@radix-ui/react-tooltip'
import {
  Bold, Italic, Strikethrough, Code, Code2,
  List, ListOrdered, ListTodo,
  Quote, Table, Image, Settings, FolderOpen, Save,
  PanelLeftOpen, ChevronDown, Link2, Undo2, Redo2, Minus,
  Maximize2, Download
} from 'lucide-react'
import { TableWizard } from '../table/TableWizard'
import type { Editor } from '@tiptap/react'
import { useAppStore } from '../../store/appStore'

interface ToolbarProps {
  editor: Editor
  onOpenFile: () => void
  onSaveFile: () => void
  onInsertImage: () => void
  onExportHtml: () => void
  onExportPdf: () => void
  onExportDocx: () => void
}

function getFormatLabel(editor: Editor): string {
  if (editor.isActive('heading', { level: 1 })) return 'Heading 1'
  if (editor.isActive('heading', { level: 2 })) return 'Heading 2'
  if (editor.isActive('heading', { level: 3 })) return 'Heading 3'
  if (editor.isActive('heading', { level: 4 })) return 'Heading 4'
  if (editor.isActive('blockquote')) return 'Blockquote'
  if (editor.isActive('codeBlock')) return 'Code block'
  if (editor.isActive('bulletList')) return 'Bullet list'
  if (editor.isActive('orderedList')) return 'Numbered list'
  if (editor.isActive('taskList')) return 'Task list'
  return 'Paragraph'
}

function Tip({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}): JSX.Element {
  return (
    <Tooltip.Provider delayDuration={400}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="bottom"
            sideOffset={6}
            className="z-50 rounded-md px-2 py-1 text-xs text-white shadow-lg"
            style={{ background: '#1F1F25', fontSize: 11, fontWeight: 500 }}
          >
            {label}
            <Tooltip.Arrow style={{ fill: '#1F1F25' }} />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}

function TB({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}): JSX.Element {
  return (
    <Tip label={label}>
      <button
        onMouseDown={(e) => { e.preventDefault(); onClick() }}
        disabled={disabled}
        className="titlebar-no-drag inline-flex items-center justify-center rounded transition-colors duration-100"
        style={{
          width: 28, height: 28,
          borderRadius: 6,
          background: active ? 'rgba(91,108,255,0.12)' : 'transparent',
          color: active ? '#5B6CFF' : 'var(--lm-ink-soft)',
          opacity: disabled ? 0.35 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
          border: 'none',
        }}
        onMouseEnter={(e) => {
          if (!active && !disabled) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)'
        }}
        onMouseLeave={(e) => {
          if (!active) (e.currentTarget as HTMLElement).style.background = active ? 'rgba(91,108,255,0.12)' : 'transparent'
        }}
        aria-label={label}
      >
        {children}
      </button>
    </Tip>
  )
}

function Sep(): JSX.Element {
  return (
    <div style={{ width: 1, height: 16, background: 'var(--lm-border)', margin: '0 6px', flexShrink: 0 }} />
  )
}

export function Toolbar({ editor, onOpenFile, onSaveFile, onInsertImage, onExportHtml, onExportPdf, onExportDocx }: ToolbarProps): JSX.Element {
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen)
  const setLinkDialogOpen = useAppStore((s) => s.setLinkDialogOpen)
  const fileType = useAppStore((s) => s.file.fileType)
  const outlineOpen = useAppStore((s) => s.outlineOpen)
  const setOutlineOpen = useAppStore((s) => s.setOutlineOpen)
  const focusMode = useAppStore((s) => s.focusMode)
  const setFocusMode = useAppStore((s) => s.setFocusMode)
  const isMd = fileType === 'md'
  const isMac = navigator.platform.toLowerCase().includes('mac')
  const mod = isMac ? '⌘' : 'Ctrl'

  // Re-render on every editor transaction so isActive() / word count stay in sync
  const [, tick] = useState(0)
  useEffect(() => {
    const update = (): void => tick((n) => n + 1)
    editor.on('transaction', update)
    return () => { editor.off('transaction', update) }
  }, [editor])

  const formatLabel = getFormatLabel(editor)

  const wordCount = (editor.storage as { wordCount?: number }).wordCount ?? 0
  const readingMins = Math.max(1, Math.ceil(wordCount / 250))
  const wordStr = wordCount === 1 ? '1 word' : `${wordCount} words`

  const FORMAT_ITEMS = [
    { label: 'Paragraph', action: () => editor.chain().focus().setParagraph().run(), shortcut: `${mod}⌥0` },
    { label: 'Heading 1', action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), shortcut: `${mod}⌥1` },
    { label: 'Heading 2', action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), shortcut: `${mod}⌥2` },
    { label: 'Heading 3', action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), shortcut: `${mod}⌥3` },
    { label: 'Heading 4', action: () => editor.chain().focus().toggleHeading({ level: 4 }).run(), shortcut: `${mod}⌥4` },
  ]

  return (
    <div
      className="titlebar-no-drag flex items-center h-11 shrink-0 overflow-x-auto"
      style={{ background: 'var(--lm-chrome)', borderBottom: '1px solid var(--lm-border)', padding: '0 12px', gap: 1 }}
    >
      {/* Nav: Sidebar + File */}
      <TB label="Toggle sidebar" onClick={toggleSidebar}><PanelLeftOpen size={15} strokeWidth={1.6} /></TB>
      <TB label={`Open file · ${mod}O`} onClick={onOpenFile}><FolderOpen size={15} strokeWidth={1.6} /></TB>
      <TB label={`Save · ${mod}S`} onClick={onSaveFile}><Save size={15} strokeWidth={1.6} /></TB>

      <Sep />

      {/* History */}
      <TB label={`Undo · ${mod}Z`} disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 size={15} strokeWidth={1.6} />
      </TB>
      <TB label={`Redo · ${mod}⇧Z`} disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 size={15} strokeWidth={1.6} />
      </TB>

      <Sep />

      {/* Format dropdown — Markdown only */}
      {isMd && (
        <>
          <Tooltip.Provider delayDuration={400}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <div>
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <button
                        className="titlebar-no-drag inline-flex items-center gap-2 rounded"
                        style={{
                          height: 28, minWidth: 124, padding: '0 10px',
                          borderRadius: 6,
                          border: '1px solid var(--lm-border)',
                          background: 'rgba(0,0,0,0.015)',
                          fontSize: 12.5, fontWeight: 500,
                          color: 'var(--lm-ink-soft)',
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ flex: 1, textAlign: 'left' }}>{formatLabel}</span>
                        <ChevronDown size={10} strokeWidth={1.5} style={{ color: 'var(--lm-ink-faint)', flexShrink: 0 }} />
                      </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content
                        className="z-50 rounded-xl shadow-xl py-1"
                        style={{ background: 'var(--lm-chrome)', border: '1px solid var(--lm-border)', minWidth: 180 }}
                        sideOffset={4}
                      >
                        {FORMAT_ITEMS.map(({ label, action, shortcut }) => (
                          <DropdownMenu.Item
                            key={label}
                            onSelect={action}
                            className="flex items-center justify-between px-4 outline-none cursor-pointer"
                            style={{ padding: '7px 16px', fontSize: 13, color: 'var(--lm-ink)' }}
                            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'rgba(91,108,255,0.08)'}
                            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                          >
                            <span>{label}</span>
                            <span style={{ fontSize: 11, color: 'var(--lm-ink-faint)', fontFamily: 'ui-monospace, monospace' }}>{shortcut}</span>
                          </DropdownMenu.Item>
                        ))}
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                </div>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content side="bottom" sideOffset={6}
                  className="z-50 rounded-md px-2 py-1 text-xs shadow-lg"
                  style={{ background: '#1F1F25', color: '#fff', fontSize: 11, fontWeight: 500 }}>
                  Format · paragraph or heading
                  <Tooltip.Arrow style={{ fill: '#1F1F25' }} />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
          <Sep />
        </>
      )}

      {/* Inline formatting — Markdown only */}
      {isMd && (
        <>
          <TB label={`Bold · ${mod}B`} active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={15} strokeWidth={1.6} /></TB>
          <TB label={`Italic · ${mod}I`} active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={15} strokeWidth={1.6} /></TB>
          <TB label="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={15} strokeWidth={1.6} /></TB>
          <TB label="Inline code" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}><Code size={15} strokeWidth={1.6} /></TB>
          <Sep />
        </>
      )}

      {/* Lists — both modes */}
      <TB label="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={15} strokeWidth={1.6} /></TB>
      <TB label="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={15} strokeWidth={1.6} /></TB>
      {isMd && <TB label="Task list" active={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()}><ListTodo size={15} strokeWidth={1.6} /></TB>}

      {/* Blocks — Markdown only */}
      {isMd && (
        <>
          <Sep />
          <TB label={`Blockquote · ${mod}⇧.`} active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={15} strokeWidth={1.6} /></TB>
          <TB label="Code block" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}><Code2 size={15} strokeWidth={1.6} /></TB>
          <TB label="Horizontal rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus size={15} strokeWidth={1.6} /></TB>
        </>
      )}

      {/* Insert — Markdown only */}
      {isMd && (
        <>
          <Sep />
          <TB label={`Link · ${mod}K`} active={editor.isActive('link')} onClick={() => setLinkDialogOpen(true)}><Link2 size={15} strokeWidth={1.6} /></TB>
          <TableWizard editor={editor}>
            {/* Native button passed directly so Popover.Trigger asChild gets a
                referenceable DOM element — avoids the React forwardRef warning */}
            <button
              className="titlebar-no-drag inline-flex items-center justify-center rounded transition-colors duration-100"
              style={{ width: 28, height: 28, borderRadius: 6, background: 'transparent', border: 'none', color: 'var(--lm-ink-soft)', cursor: 'pointer' }}
              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)'}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              aria-label="Insert table"
              title="Insert table"
            >
              <Table size={15} strokeWidth={1.6} />
            </button>
          </TableWizard>
          <TB label="Insert image" onClick={onInsertImage}><Image size={15} strokeWidth={1.6} /></TB>
        </>
      )}

      {/* Export dropdown */}
      <Sep />
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            className="titlebar-no-drag inline-flex items-center gap-1 rounded transition-colors duration-100"
            style={{
              height: 28, padding: '0 8px',
              borderRadius: 6,
              border: '1px solid var(--lm-border)',
              background: 'rgba(0,0,0,0.015)',
              fontSize: 12, fontWeight: 500,
              color: 'var(--lm-ink-soft)',
              cursor: 'pointer',
              gap: 4,
            }}
            aria-label="Export"
            title="Export"
          >
            <Download size={13} strokeWidth={1.6} />
            <span style={{ fontSize: 12 }}>Export</span>
            <ChevronDown size={9} strokeWidth={1.5} style={{ color: 'var(--lm-ink-faint)' }} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="z-50 rounded-lg shadow-xl py-1"
            style={{ background: 'var(--lm-chrome)', border: '1px solid var(--lm-border)', minWidth: 160 }}
            sideOffset={4}
            align="end"
          >
            <DropdownMenu.Item
              onSelect={onExportHtml}
              className="flex items-center px-4 outline-none cursor-pointer"
              style={{ padding: '7px 14px', fontSize: 13, color: 'var(--lm-ink)' }}
              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'rgba(91,108,255,0.08)'}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              Export as HTML
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={onExportPdf}
              className="flex items-center px-4 outline-none cursor-pointer"
              style={{ padding: '7px 14px', fontSize: 13, color: 'var(--lm-ink)' }}
              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'rgba(91,108,255,0.08)'}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              Export as PDF
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={onExportDocx}
              className="flex items-center px-4 outline-none cursor-pointer"
              style={{ padding: '7px 14px', fontSize: 13, color: 'var(--lm-ink)' }}
              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'rgba(91,108,255,0.08)'}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              Export as Word (.docx)
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Word count */}
      <span style={{ fontSize: 11, color: 'var(--lm-ink-faint)', fontFamily: 'ui-monospace, monospace', marginRight: 8, whiteSpace: 'nowrap' }}>
        {wordStr} · {readingMins} min
      </span>

      {/* Outline + Focus mode */}
      <TB label={`Toggle outline · ${mod}⇧O`} active={outlineOpen} onClick={() => setOutlineOpen(!outlineOpen)}>
        <List size={15} strokeWidth={1.6} />
      </TB>
      <TB label={`Focus mode · ${mod}⇧↵`} active={focusMode} onClick={() => setFocusMode(!focusMode)}>
        <Maximize2 size={15} strokeWidth={1.6} />
      </TB>

      {/* Settings */}
      <TB label="Settings" onClick={() => setSettingsOpen(true)}><Settings size={15} strokeWidth={1.6} /></TB>
    </div>
  )
}
