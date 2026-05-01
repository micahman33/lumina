import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Tooltip from '@radix-ui/react-tooltip'
import {
  Bold, Italic, Strikethrough, Code, Code2,
  List, ListOrdered, ListTodo,
  Quote, Table, Image, Settings, FolderOpen, Save,
  PanelLeftOpen, ChevronDown, Link2
} from 'lucide-react'
import { TableWizard } from '../table/TableWizard'
import type { Editor } from '@tiptap/react'
import { useAppStore } from '../../store/appStore'

interface ToolbarProps {
  editor: Editor
  onOpenFile: () => void
  onSaveFile: () => void
  onInsertImage: () => void
}

function ToolBtn({
  label,
  active,
  disabled,
  onClick,
  children
}: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}): JSX.Element {
  return (
    <Tooltip.Provider delayDuration={600}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            onMouseDown={(e) => {
              e.preventDefault()
              onClick()
            }}
            disabled={disabled}
            className={`titlebar-no-drag inline-flex items-center justify-center w-8 h-8 rounded text-sm font-medium transition-colors ${
              active
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
            aria-label={label}
          >
            {children}
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="z-50 bg-gray-900 text-white text-xs rounded px-2 py-1"
            sideOffset={4}
          >
            {label}
            <Tooltip.Arrow className="fill-gray-900" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}

function Divider(): JSX.Element {
  return <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
}

export function Toolbar({ editor, onOpenFile, onSaveFile, onInsertImage }: ToolbarProps): JSX.Element {
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen)
  const setLinkDialogOpen = useAppStore((s) => s.setLinkDialogOpen)

  const headingLevel = [1, 2, 3, 4, 5, 6].find((l) => editor.isActive('heading', { level: l }))
  const headingLabel = headingLevel ? `H${headingLevel}` : 'P'

  return (
    <div className="titlebar-no-drag flex items-center gap-0.5 px-3 h-11 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0 overflow-x-auto">
      {/* Sidebar toggle */}
      <ToolBtn label="Toggle sidebar" onClick={toggleSidebar}>
        <PanelLeftOpen size={16} />
      </ToolBtn>

      <Divider />

      {/* Open / Save */}
      <ToolBtn label="Open file (⌘O)" onClick={onOpenFile}>
        <FolderOpen size={16} />
      </ToolBtn>
      <ToolBtn label="Save (⌘S)" onClick={onSaveFile}>
        <Save size={16} />
      </ToolBtn>

      <Divider />

      {/* Heading dropdown */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="titlebar-no-drag inline-flex items-center gap-1 px-2 h-8 rounded text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors min-w-[3rem]">
            {headingLabel}
            <ChevronDown size={12} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[140px]"
            sideOffset={4}
          >
            {[
              { label: 'Paragraph', action: () => editor.chain().focus().setParagraph().run() },
              { label: 'Heading 1', action: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
              { label: 'Heading 2', action: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
              { label: 'Heading 3', action: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
              { label: 'Heading 4', action: () => editor.chain().focus().toggleHeading({ level: 4 }).run() }
            ].map(({ label, action }) => (
              <DropdownMenu.Item
                key={label}
                className="px-4 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer outline-none"
                onSelect={action}
              >
                {label}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <Divider />

      {/* Formatting */}
      <ToolBtn label="Bold (⌘B)" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold size={15} />
      </ToolBtn>
      <ToolBtn label="Italic (⌘I)" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic size={15} />
      </ToolBtn>
      <ToolBtn label="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough size={15} />
      </ToolBtn>
      <ToolBtn label="Inline code" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}>
        <Code size={15} />
      </ToolBtn>

      <Divider />

      {/* Lists */}
      <ToolBtn label="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List size={16} />
      </ToolBtn>
      <ToolBtn label="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered size={16} />
      </ToolBtn>
      <ToolBtn label="Task list" active={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()}>
        <ListTodo size={16} />
      </ToolBtn>

      <Divider />

      {/* Blockquote / Code block */}
      <ToolBtn label="Blockquote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote size={16} />
      </ToolBtn>
      <ToolBtn label="Code block" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
        <Code2 size={16} />
      </ToolBtn>

      <Divider />

      {/* Link */}
      <ToolBtn
        label="Insert / edit link (⌘K)"
        active={editor.isActive('link')}
        onClick={() => setLinkDialogOpen(true)}
      >
        <Link2 size={16} />
      </ToolBtn>

      <Divider />

      {/* Table */}
      <TableWizard editor={editor}>
        <button
          className="titlebar-no-drag inline-flex items-center justify-center w-8 h-8 rounded text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Insert table"
        >
          <Table size={16} />
        </button>
      </TableWizard>

      {/* Image */}
      <ToolBtn label="Insert image" onClick={onInsertImage}>
        <Image size={16} />
      </ToolBtn>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings */}
      <ToolBtn label="Settings" onClick={() => setSettingsOpen(true)}>
        <Settings size={16} />
      </ToolBtn>
    </div>
  )
}
