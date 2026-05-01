import { useEffect, useRef } from 'react'
import type { Editor } from '@tiptap/react'

interface ContextMenuState {
  x: number
  y: number
  visible: boolean
}

interface TableContextMenuProps {
  editor: Editor
  menuState: ContextMenuState
  onClose: () => void
}

export function TableContextMenu({ editor, menuState, onClose }: TableContextMenuProps): JSX.Element | null {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  if (!menuState.visible) return null

  const btn = (label: string, action: () => void): JSX.Element => (
    <button
      key={label}
      className="w-full text-left px-4 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      onClick={() => {
        action()
        onClose()
      }}
    >
      {label}
    </button>
  )

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[180px]"
      style={{ left: menuState.x, top: menuState.y }}
    >
      {btn('Add row above', () => editor.chain().focus().addRowBefore().run())}
      {btn('Add row below', () => editor.chain().focus().addRowAfter().run())}
      {btn('Delete row', () => editor.chain().focus().deleteRow().run())}
      <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
      {btn('Add column before', () => editor.chain().focus().addColumnBefore().run())}
      {btn('Add column after', () => editor.chain().focus().addColumnAfter().run())}
      {btn('Delete column', () => editor.chain().focus().deleteColumn().run())}
      <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
      {btn('Delete table', () => editor.chain().focus().deleteTable().run())}
    </div>
  )
}
