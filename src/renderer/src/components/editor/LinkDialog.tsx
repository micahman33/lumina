import { useState, useEffect, useRef } from 'react'
import { Link2, ExternalLink, Trash2 } from 'lucide-react'
import type { Editor } from '@tiptap/react'
import { useAppStore } from '../../store/appStore'

interface LinkDialogProps {
  editor: Editor
}

export function LinkDialog({ editor }: LinkDialogProps): JSX.Element | null {
  const open = useAppStore((s) => s.linkDialogOpen)
  const setOpen = useAppStore((s) => s.setLinkDialogOpen)
  const [url, setUrl] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Pre-fill with existing link when opening
  useEffect(() => {
    if (!open) return
    const attrs = editor.getAttributes('link')
    setUrl(attrs.href ?? '')
    setTimeout(() => inputRef.current?.select(), 50)
  }, [open, editor])

  if (!open) return null

  const isEditing = !!editor.getAttributes('link').href

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) {
      editor.chain().focus().unsetLink().run()
      setOpen(false)
      return
    }
    // Prepend https:// if no protocol given
    const href = /^https?:\/\/|^mailto:|^#/.test(trimmed) ? trimmed : `https://${trimmed}`
    editor.chain().focus().setLink({ href }).run()
    setOpen(false)
  }

  const handleRemove = (): void => {
    editor.chain().focus().unsetLink().run()
    setOpen(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false)
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <Link2 size={16} className="text-blue-500" />
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">
            {isEditing ? 'Edit link' : 'Insert link'}
          </h2>
          <button
            onClick={() => setOpen(false)}
            className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            URL
          </label>
          <input
            ref={inputRef}
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com or #anchor"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
            autoFocus
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
            Paste a URL, or type <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">#heading-name</code> for an in-document anchor.
          </p>

          <div className="flex items-center gap-2 mt-4">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <ExternalLink size={14} />
              {isEditing ? 'Update' : 'Insert'}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={handleRemove}
                className="flex items-center gap-1.5 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium rounded-lg transition-colors"
              >
                <Trash2 size={14} />
                Remove link
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="ml-auto px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
