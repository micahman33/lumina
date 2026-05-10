import { useCallback, useState, useEffect } from 'react'
import { EditorContent } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import type { MutableRefObject } from 'react'
import { useAppStore } from '../../store/appStore'
import { EditorContextMenu, type ContextMenuState } from './EditorContextMenu'
import { BubbleToolbar } from './BubbleToolbar'
import { LinkDialog } from './LinkDialog'

interface EditorCoreProps {
  editor: Editor
  insertImageRef: MutableRefObject<() => void>
  focusMode?: boolean
}

export function EditorCore({ editor, insertImageRef, focusMode }: EditorCoreProps): JSX.Element {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ x: 0, y: 0, visible: false })
  const fileType = useAppStore((s) => s.file.fileType)

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      const files = e.dataTransfer.files
      if (!files.length) return
      const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'))
      if (!imageFiles.length) return

      e.preventDefault()
      e.stopPropagation()

      for (const file of imageFiles) {
        const filePath = (file as File & { path?: string }).path
        if (!filePath) {
          const reader = new FileReader()
          reader.onload = () =>
            editor.chain().focus().setImage({ src: reader.result as string }).run()
          reader.readAsDataURL(file)
          continue
        }
        const docPath = useAppStore.getState().file.path
        if (!docPath) {
          const reader = new FileReader()
          reader.onload = () =>
            editor.chain().focus().setImage({ src: reader.result as string }).run()
          reader.readAsDataURL(file)
          continue
        }
        const mediaUrl = await window.api.copyImageToDoc({ sourcePath: filePath, documentPath: docPath })
        editor.chain().focus().setImage({ src: mediaUrl, alt: file.name }).run()
      }
    },
    [editor]
  )

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent<HTMLDivElement>) => {
      const items = e.clipboardData?.items
      if (!items) return
      const imageItem = Array.from(items).find((item) => item.type.startsWith('image/'))
      if (!imageItem) return

      e.preventDefault()
      const file = imageItem.getAsFile()
      if (!file) return

      const mimeType = imageItem.type
      const documentPath = useAppStore.getState().file.path

      const ab = await file.arrayBuffer()
      const buffer = Array.from(new Uint8Array(ab))
      const mediaUrl = await window.api.pasteImage({ buffer, mimeType, documentPath })
      editor.chain().focus().setImage({ src: mediaUrl }).run()
    },
    [editor]
  )

  // Define handleInsertImage BEFORE useEffect that references it
  const handleInsertImage = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const filePath = (file as File & { path?: string }).path
      if (!filePath) return
      const docPath = useAppStore.getState().file.path
      if (!docPath) {
        const reader = new FileReader()
        reader.onload = () =>
          editor.chain().focus().setImage({ src: reader.result as string }).run()
        reader.readAsDataURL(file)
        return
      }
      const mediaUrl = await window.api.copyImageToDoc({ sourcePath: filePath, documentPath: docPath })
      editor.chain().focus().setImage({ src: mediaUrl, alt: file.name }).run()
    }
    input.click()
  }, [editor])

  // Expose image insert handler to parent via ref (must come after handleInsertImage)
  useEffect(() => {
    insertImageRef.current = handleInsertImage
  }, [insertImageRef, handleInsertImage])

  const handleContextMenu = useCallback(async (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    // Fetch OS spell-check data captured by the main process on the same right-click event.
    // The native context-menu event fires before the renderer's onContextMenu, so by the
    // time this async call resolves the main process already has the latest spell data.
    const spell = await window.api.getSpellSuggestions()
    setContextMenu({ x: e.clientX, y: e.clientY, visible: true, spell })
  }, [])

  return (
    <div
      className={`flex-1 overflow-y-auto lm-bg${fileType === 'txt' ? ' txt-mode' : ''}${focusMode ? ' focus-mode-editor' : ''}`}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onPaste={handlePaste}
      onContextMenu={handleContextMenu}
    >
      <EditorContent editor={editor} className="h-full" />

      <EditorContextMenu
        editor={editor}
        menuState={contextMenu}
        onClose={() => setContextMenu({ x: 0, y: 0, visible: false })}
        onInsertImage={handleInsertImage}
      />

      <BubbleToolbar editor={editor} contextMenuOpen={contextMenu.visible} />

      <LinkDialog editor={editor} />
    </div>
  )
}
