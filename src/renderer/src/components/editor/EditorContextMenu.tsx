import { useEffect, useRef, useState } from 'react'
import {
  Bold, Italic, Strikethrough, Code, Link2, Link2Off,
  ExternalLink, List, ListOrdered, ListTodo,
  Heading1, Heading2, Heading3, Heading4,
  Pilcrow, Table, Image as ImageIcon, Scissors, Copy,
  RowsIcon, Columns3, Trash2, XCircle, Type, ChevronRight, Check
} from 'lucide-react'
import type { Editor } from '@tiptap/react'
import { useAppStore } from '../../store/appStore'

export interface SpellData {
  misspelledWord: string
  suggestions: string[]
}

export interface ContextMenuState {
  x: number
  y: number
  visible: boolean
  spell?: SpellData
}

interface EditorContextMenuProps {
  editor: Editor
  menuState: ContextMenuState
  onClose: () => void
  onInsertImage: () => void
}

type MenuContext = 'selection' | 'link' | 'table' | 'default'

function getContext(editor: Editor): MenuContext {
  const hasSelection = !editor.state.selection.empty
  const isInTable =
    editor.isActive('table') ||
    editor.isActive('tableCell') ||
    editor.isActive('tableHeader')
  if (isInTable) return 'table'
  if (hasSelection) return 'selection'
  if (editor.isActive('link')) return 'link'
  return 'default'
}

function getCurrentBlockLabel(editor: Editor): string {
  if (editor.isActive('heading', { level: 1 })) return 'Heading 1'
  if (editor.isActive('heading', { level: 2 })) return 'Heading 2'
  if (editor.isActive('heading', { level: 3 })) return 'Heading 3'
  if (editor.isActive('heading', { level: 4 })) return 'Heading 4'
  if (editor.isActive('heading', { level: 5 })) return 'Heading 5'
  if (editor.isActive('heading', { level: 6 })) return 'Heading 6'
  if (editor.isActive('blockquote')) return 'Quote'
  if (editor.isActive('codeBlock')) return 'Code Block'
  if (editor.isActive('bulletList')) return 'Bullet List'
  if (editor.isActive('orderedList')) return 'Numbered List'
  if (editor.isActive('taskList')) return 'Task List'
  return 'Paragraph'
}

// ── Shared primitive components ────────────────────────────────────────────

function Item({
  icon: Icon,
  label,
  shortcut,
  danger,
  disabled,
  onClick
}: {
  icon?: React.FC<{ size?: number }>
  label: string
  shortcut?: string
  danger?: boolean
  disabled?: boolean
  onClick: () => void
}): JSX.Element {
  return (
    <button
      className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-sm transition-colors ${
        danger
          ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
          : disabled
          ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      {Icon && <Icon size={14} />}
      <span className="flex-1 text-left">{label}</span>
      {shortcut && (
        <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">{shortcut}</span>
      )}
    </button>
  )
}

function Sep(): JSX.Element {
  return <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
}

function SectionLabel({ children }: { children: string }): JSX.Element {
  return (
    <p className="px-3 pt-1.5 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
      {children}
    </p>
  )
}

// ── Format flyout submenu ──────────────────────────────────────────────────

const FORMAT_OPTIONS = [
  { label: 'Paragraph', icon: Pilcrow,  action: (e: Editor) => e.chain().focus().setParagraph().run(),                 isActive: (e: Editor) => e.isActive('paragraph') && !e.isActive('bulletList') && !e.isActive('orderedList') && !e.isActive('taskList') },
  { label: 'Heading 1', icon: Heading1, action: (e: Editor) => e.chain().focus().toggleHeading({ level: 1 }).run(),    isActive: (e: Editor) => e.isActive('heading', { level: 1 }) },
  { label: 'Heading 2', icon: Heading2, action: (e: Editor) => e.chain().focus().toggleHeading({ level: 2 }).run(),    isActive: (e: Editor) => e.isActive('heading', { level: 2 }) },
  { label: 'Heading 3', icon: Heading3, action: (e: Editor) => e.chain().focus().toggleHeading({ level: 3 }).run(),    isActive: (e: Editor) => e.isActive('heading', { level: 3 }) },
  { label: 'Heading 4', icon: Heading4, action: (e: Editor) => e.chain().focus().toggleHeading({ level: 4 }).run(),    isActive: (e: Editor) => e.isActive('heading', { level: 4 }) },
]

function FormatSubmenu({
  editor,
  menuX,
  menuWidth,
  run
}: {
  editor: Editor
  menuX: number
  menuWidth: number
  run: (fn: () => void) => void
}): JSX.Element {
  const [open, setOpen] = useState(false)
  const currentLabel = getCurrentBlockLabel(editor)

  // Decide whether flyout opens right or left based on available space
  const flyoutWidth = 180
  const spaceRight = window.innerWidth - (menuX + menuWidth) - 8
  const openLeft = spaceRight < flyoutWidth

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {/* Trigger row */}
      <button className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
        <Type size={14} />
        <span className="flex-1 text-left">Format</span>
        <span className="text-xs text-gray-400 dark:text-gray-500 mr-1">{currentLabel}</span>
        <ChevronRight size={12} className="text-gray-400 dark:text-gray-500 shrink-0" />
      </button>

      {/* Flyout panel — flush against trigger (no margin) to prevent mouse gap */}
      {open && (
        <div
          className="absolute top-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-1.5 z-50"
          style={{
            width: flyoutWidth,
            ...(openLeft ? { right: '100%' } : { left: '100%' })
          }}
        >
          {FORMAT_OPTIONS.map((opt) => {
            const active = opt.isActive(editor)
            return (
              <button
                key={opt.label}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={() => run(() => opt.action(editor))}
              >
                {/* checkmark placeholder keeps icon column aligned */}
                <span className="w-3 shrink-0">
                  {active && <Check size={12} className="text-blue-500" />}
                </span>
                <opt.icon size={14} className="shrink-0" />
                <span className="flex-1 text-left">{opt.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Spell-check suggestions ────────────────────────────────────────────────

function SpellSuggestions({
  spell,
  run
}: {
  spell: SpellData
  run: (fn: () => void) => void
}): JSX.Element | null {
  if (!spell.misspelledWord || spell.suggestions.length === 0) return null
  return (
    <>
      <SectionLabel>Spelling suggestions</SectionLabel>
      {spell.suggestions.slice(0, 5).map((word) => (
        <button
          key={word}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          onClick={() => run(() => window.api.replaceMisspelling(word))}
        >
          <span className="flex-1 text-left">{word}</span>
        </button>
      ))}
      <Sep />
    </>
  )
}

// ── Main context menu ──────────────────────────────────────────────────────

export function EditorContextMenu({
  editor,
  menuState,
  onClose,
  onInsertImage
}: EditorContextMenuProps): JSX.Element | null {
  const ref = useRef<HTMLDivElement>(null)
  const setLinkDialogOpen = useAppStore((s) => s.setLinkDialogOpen)

  useEffect(() => {
    const handler = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const keyHandler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [onClose])

  if (!menuState.visible) return null

  const ctx = getContext(editor)

  const menuWidth = 240
  const menuHeight = 380
  const x = Math.min(menuState.x, window.innerWidth - menuWidth - 8)
  const y = Math.min(menuState.y, window.innerHeight - menuHeight - 8)

  const run = (fn: () => void): void => {
    fn()
    onClose()
  }

  const sharedFormatSubmenu = (
    <FormatSubmenu editor={editor} menuX={x} menuWidth={menuWidth} run={run} />
  )

  // --- Selection context ---
  const SelectionItems = (): JSX.Element => (
    <>
      <SectionLabel>Format selection</SectionLabel>
      <Item icon={Bold} label="Bold" shortcut="⌘B"
        onClick={() => run(() => editor.chain().focus().toggleBold().run())} />
      <Item icon={Italic} label="Italic" shortcut="⌘I"
        onClick={() => run(() => editor.chain().focus().toggleItalic().run())} />
      <Item icon={Strikethrough} label="Strikethrough"
        onClick={() => run(() => editor.chain().focus().toggleStrike().run())} />
      <Item icon={Code} label="Inline code"
        onClick={() => run(() => editor.chain().focus().toggleCode().run())} />
      <Item icon={Link2} label="Add link" shortcut="⌘K"
        onClick={() => { onClose(); setLinkDialogOpen(true) }} />
      <Sep />
      {sharedFormatSubmenu}
      <Sep />
      <Item icon={Scissors} label="Cut" shortcut="⌘X"
        onClick={() => run(() => document.execCommand('cut'))} />
      <Item icon={Copy} label="Copy" shortcut="⌘C"
        onClick={() => run(() => document.execCommand('copy'))} />
      <Sep />
      <Item icon={XCircle} label="Clear formatting"
        onClick={() => run(() => editor.chain().focus().clearNodes().unsetAllMarks().run())} />
    </>
  )

  // --- Link context ---
  const LinkItems = (): JSX.Element => {
    const href = editor.getAttributes('link').href as string | undefined
    return (
      <>
        <SectionLabel>Link</SectionLabel>
        {href && (
          <Item icon={ExternalLink} label="Open in browser"
            onClick={() => { onClose(); window.api.openExternal(href) }} />
        )}
        <Item icon={Link2} label="Edit link" shortcut="⌘K"
          onClick={() => { onClose(); setLinkDialogOpen(true) }} />
        <Item icon={Link2Off} label="Remove link" danger
          onClick={() => run(() => editor.chain().focus().unsetLink().run())} />
        <Sep />
        {sharedFormatSubmenu}
        <Sep />
        <SectionLabel>Insert</SectionLabel>
        <Item icon={Link2} label="Insert link" shortcut="⌘K"
          onClick={() => { onClose(); setLinkDialogOpen(true) }} />
        <Item icon={Table} label="Insert table"
          onClick={() => run(() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())} />
        <Item icon={ImageIcon} label="Insert image"
          onClick={() => { onClose(); onInsertImage() }} />
      </>
    )
  }

  // --- Default context (cursor in text, nothing selected) ---
  const DefaultItems = (): JSX.Element => (
    <>
      {sharedFormatSubmenu}
      <Sep />
      <SectionLabel>Insert</SectionLabel>
      <Item icon={List} label="Bullet list"
        onClick={() => run(() => editor.chain().focus().toggleBulletList().run())} />
      <Item icon={ListOrdered} label="Numbered list"
        onClick={() => run(() => editor.chain().focus().toggleOrderedList().run())} />
      <Item icon={ListTodo} label="Task list"
        onClick={() => run(() => editor.chain().focus().toggleTaskList().run())} />
      <Sep />
      <Item icon={Link2} label="Insert link" shortcut="⌘K"
        onClick={() => { onClose(); setLinkDialogOpen(true) }} />
      <Item icon={Table} label="Insert table"
        onClick={() => run(() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())} />
      <Item icon={ImageIcon} label="Insert image"
        onClick={() => { onClose(); onInsertImage() }} />
    </>
  )

  // --- Table context ---
  const TableItems = (): JSX.Element => {
    const hasSelection = !editor.state.selection.empty
    return (
      <>
        {hasSelection && (
          <>
            <SectionLabel>Format selection</SectionLabel>
            <Item icon={Bold} label="Bold" shortcut="⌘B"
              onClick={() => run(() => editor.chain().focus().toggleBold().run())} />
            <Item icon={Italic} label="Italic" shortcut="⌘I"
              onClick={() => run(() => editor.chain().focus().toggleItalic().run())} />
            <Item icon={Link2} label="Add link" shortcut="⌘K"
              onClick={() => { onClose(); setLinkDialogOpen(true) }} />
            <Sep />
          </>
        )}
        <SectionLabel>Rows</SectionLabel>
        <Item icon={RowsIcon} label="Add row above"
          onClick={() => run(() => editor.chain().focus().addRowBefore().run())} />
        <Item icon={RowsIcon} label="Add row below"
          onClick={() => run(() => editor.chain().focus().addRowAfter().run())} />
        <Item icon={Trash2} label="Delete row" danger
          onClick={() => run(() => editor.chain().focus().deleteRow().run())} />
        <Sep />
        <SectionLabel>Columns</SectionLabel>
        <Item icon={Columns3} label="Add column before"
          onClick={() => run(() => editor.chain().focus().addColumnBefore().run())} />
        <Item icon={Columns3} label="Add column after"
          onClick={() => run(() => editor.chain().focus().addColumnAfter().run())} />
        <Item icon={Trash2} label="Delete column" danger
          onClick={() => run(() => editor.chain().focus().deleteColumn().run())} />
        <Sep />
        <Item icon={Trash2} label="Delete table" danger
          onClick={() => run(() => editor.chain().focus().deleteTable().run())} />
      </>
    )
  }

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-1.5 overflow-visible"
      style={{ left: x, top: y, width: menuWidth, maxHeight: menuHeight }}
    >
      {menuState.spell && <SpellSuggestions spell={menuState.spell} run={run} />}
      {ctx === 'selection' && <SelectionItems />}
      {ctx === 'link' && <LinkItems />}
      {ctx === 'table' && <TableItems />}
      {ctx === 'default' && <DefaultItems />}
    </div>
  )
}
