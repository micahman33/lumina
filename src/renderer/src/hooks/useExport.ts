import { useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import { useAppStore } from '../store/appStore'
import { buildHtmlExport, getExportTitle, EXPORT_STYLES } from '../utils/exportUtils'
import { unresolveRelativeImagePaths } from '../utils/markdownUtils'

// ── tiny cross-platform path helpers ──────────────────────────────────────────

function stripExt(filePath: string): string {
  const base = filePath.replace(/\\/g, '/').split('/').pop() ?? filePath
  const dot = base.lastIndexOf('.')
  if (dot <= 0) return base
  return base.slice(0, dot)
}

function replaceExt(filePath: string | null, newExt: string): string {
  if (!filePath) return `untitled${newExt}`
  const normalized = filePath.replace(/\\/g, '/')
  const dir = normalized.split('/').slice(0, -1).join('/')
  const name = stripExt(normalized)
  return dir ? `${dir}/${name}${newExt}` : `${name}${newExt}`
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useExport(editor: Editor | null): {
  exportHtml: () => Promise<void>
  exportPdf: () => Promise<void>
} {
  const showToast = useAppStore((s) => s.showToast)
  const filePath = useAppStore((s) => s.file.path)

  const exportHtml = useCallback(async () => {
    if (!editor) return
    const title = getExportTitle(filePath)
    // Get HTML from editor and strip media:// prefixes back to relative paths
    let bodyHtml = editor.getHTML()
    if (filePath) {
      bodyHtml = unresolveRelativeImagePaths(bodyHtml, filePath)
    }
    const fullHtml = buildHtmlExport(title, bodyHtml, EXPORT_STYLES)
    const defaultPath = replaceExt(filePath, '.html')

    try {
      const result = await window.api.exportHtml({ defaultPath, content: fullHtml })
      if (!result) return  // user cancelled
      const name = result.path.replace(/\\/g, '/').split('/').pop() ?? result.path
      showToast(`Exported to ${name}`, 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Export failed', 'error')
    }
  }, [editor, filePath, showToast])

  const exportPdf = useCallback(async () => {
    if (!editor) return
    const defaultPath = replaceExt(filePath, '.pdf')

    try {
      const result = await window.api.exportPdf({ defaultPath })
      if (!result) return  // user cancelled
      const name = result.path.replace(/\\/g, '/').split('/').pop() ?? result.path
      showToast(`Exported to ${name}`, 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'PDF export failed', 'error')
    }
  }, [editor, filePath, showToast])

  return { exportHtml, exportPdf }
}
