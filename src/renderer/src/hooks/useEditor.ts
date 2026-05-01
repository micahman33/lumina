import { useEditor as useTiptapEditor } from '@tiptap/react'
import { Extension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Image } from '@tiptap/extension-image'
import { Link } from '@tiptap/extension-link'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { Typography } from '@tiptap/extension-typography'
import { Markdown } from 'tiptap-markdown'
import { useAppStore } from '../store/appStore'

const LinkShortcut = Extension.create({
  name: 'linkShortcut',
  addKeyboardShortcuts() {
    return {
      'Mod-k': () => {
        useAppStore.getState().setLinkDialogOpen(true)
        return true
      }
    }
  }
})

export function useEditor() {
  const markDirty = useAppStore((s) => s.markDirty)

  const editor = useTiptapEditor({
    extensions: [
      StarterKit.configure({
        // Disable history here; it's included but we want default undo/redo
      }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: false
      }),
      Typography,
      Image.configure({
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full rounded'
        }
      }),
      Link.configure({
        autolink: true,
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-500 underline cursor-pointer'
        }
      }),
      Table.configure({
        resizable: true
      }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      TaskItem.configure({
        nested: true
      }),
      LinkShortcut
    ],
    content: '',
    onUpdate: ({ editor: e }) => {
      // Update word count storage
      const text = e.getText()
      const words = text.trim() ? text.trim().split(/\s+/).length : 0
      e.storage.wordCount = words
      markDirty(true)
      ;(window as Window & { __lumina_isDirty__?: boolean }).__lumina_isDirty__ = true
    },
    editorProps: {
      attributes: {
        class: 'prose prose-neutral dark:prose-invert max-w-none focus:outline-none'
      },
      handleClick(view, _pos, event) {
        const target = event.target as HTMLElement
        const link = target.closest('a')
        if (!link) return false

        const href = link.getAttribute('href')
        if (!href) return false

        event.preventDefault()

        if (href.startsWith('#')) {
          // Anchor link — find heading whose text slugifies to this anchor
          const anchor = href.slice(1)
          // Try by id first, then by slugified heading text
          let el = document.getElementById(anchor)
          if (!el) {
            const headings = view.dom.querySelectorAll('h1,h2,h3,h4,h5,h6')
            for (const h of Array.from(headings)) {
              const slug = h.textContent
                ?.toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .trim()
                .replace(/\s+/g, '-')
              if (slug === anchor) {
                el = h as HTMLElement
                break
              }
            }
          }
          el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          return true
        }

        if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')) {
          window.api.openExternal(href)
          return true
        }

        return false
      }
    }
  })

  return editor
}
