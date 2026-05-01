import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Bold, Italic, Strikethrough, Code, Link2 } from 'lucide-react'
import type { Editor } from '@tiptap/react'
import { useAppStore } from '../../store/appStore'

interface Rect {
  top: number
  left: number
  width: number
}

interface BubbleToolbarProps {
  editor: Editor
  contextMenuOpen: boolean
}

function BubbleBtn({
  label,
  active,
  onClick,
  children
}: {
  label: string
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}): JSX.Element {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      title={label}
      className={`inline-flex items-center justify-center w-7 h-7 rounded text-sm transition-colors ${
        active
          ? 'bg-white/20 text-white'
          : 'text-gray-200 hover:bg-white/15 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

export function BubbleToolbar({ editor, contextMenuOpen }: BubbleToolbarProps): JSX.Element | null {
  const [rect, setRect] = useState<Rect | null>(null)
  const setLinkDialogOpen = useAppStore((s) => s.setLinkDialogOpen)

  const updatePosition = useCallback(() => {
    const { empty } = editor.state.selection
    if (empty) {
      setRect(null)
      return
    }
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) {
      setRect(null)
      return
    }
    const range = sel.getRangeAt(0)
    const domRect = range.getBoundingClientRect()
    if (!domRect.width) {
      setRect(null)
      return
    }
    setRect({ top: domRect.top, left: domRect.left, width: domRect.width })
  }, [editor])

  useEffect(() => {
    editor.on('selectionUpdate', updatePosition)
    editor.on('blur', () => setRect(null))
    // Close when link dialog opens (selection would be captured already)
    return () => {
      editor.off('selectionUpdate', updatePosition)
    }
  }, [editor, updatePosition])

  if (!rect || contextMenuOpen) return null

  const TOOLBAR_WIDTH = 220
  const left = Math.max(8, Math.min(rect.left + rect.width / 2 - TOOLBAR_WIDTH / 2, window.innerWidth - TOOLBAR_WIDTH - 8))
  const top = rect.top - 44 // 44px above the selection

  return createPortal(
    <div
      className="fixed z-40 flex items-center gap-0.5 px-1.5 py-1 bg-gray-800 dark:bg-gray-700 rounded-lg shadow-xl border border-gray-700 dark:border-gray-600"
      style={{ top, left, width: TOOLBAR_WIDTH }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <BubbleBtn label="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold size={13} />
      </BubbleBtn>
      <BubbleBtn label="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic size={13} />
      </BubbleBtn>
      <BubbleBtn label="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough size={13} />
      </BubbleBtn>
      <BubbleBtn label="Inline code" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}>
        <Code size={13} />
      </BubbleBtn>
      <div className="w-px h-4 bg-gray-600 dark:bg-gray-500 mx-0.5" />
      <BubbleBtn
        label="Link (⌘K)"
        active={editor.isActive('link')}
        onClick={() => setLinkDialogOpen(true)}
      >
        <Link2 size={13} />
      </BubbleBtn>
      <div className="w-px h-4 bg-gray-600 dark:bg-gray-500 mx-0.5" />
      <BubbleBtn label="Clear formatting" onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}>
        <span className="text-[11px] font-medium leading-none">A×</span>
      </BubbleBtn>
    </div>,
    document.body
  )
}
