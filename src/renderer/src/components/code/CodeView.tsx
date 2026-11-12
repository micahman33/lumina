import { useCallback, useEffect, useRef, useState } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { Annotation, Compartment, EditorState } from '@codemirror/state'
import { keymap } from '@codemirror/view'
import { indentWithTab, selectAll } from '@codemirror/commands'
import { json } from '@codemirror/lang-json'
import { xml } from '@codemirror/lang-xml'
import { linter, lintGutter, nextDiagnostic } from '@codemirror/lint'
import { LanguageDescription } from '@codemirror/language'
import { languages } from '@codemirror/language-data'
import { openSearchPanel, search } from '@codemirror/search'
import { useAppStore } from '../../store/appStore'
import { registerSurface } from '../../surfaces'
import { formatJson, lintJson, mapCursor, type TextProblem } from '../../utils/formatJson'
import { formatXml, lintXml } from '../../utils/xmlTools'
import { SimpleMenu } from '../ui/SimpleMenu'
import { codeTheme } from './codeTheme'

/** Above this size, formatting and error checking are skipped to keep typing responsive. */
const CHECK_LIMIT_BYTES = 5 * 1024 * 1024

/** Marks changes Lumina made itself (format-on-save), which must not flag the file unsaved. */
const programmatic = Annotation.define<boolean>()

interface Tools {
  format: ((text: string) => string | null) | null
  lint: ((text: string) => TextProblem[]) | null
}

function toolsFor(fileType: string, size: number): Tools {
  if (size > CHECK_LIMIT_BYTES) return { format: null, lint: null }
  if (fileType === 'json') return { format: formatJson, lint: lintJson }
  if (fileType === 'xml') return { format: formatXml, lint: lintXml }
  return { format: null, lint: null }
}

export default function CodeView(): JSX.Element {
  const host = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const toolsRef = useRef<Tools>({ format: null, lint: null })
  const statusRef = useRef<{ line: number; col: number; errors?: number; note?: string }>({ line: 1, col: 1 })
  const loadId = useAppStore((s) => s.file.loadId)
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)

  const pushStatus = useCallback(() => {
    useAppStore.getState().setViewStatus({ ...statusRef.current })
  }, [])

  /** Replace the document with its formatted form, keeping the cursor on the same token. */
  const applyFormat = useCallback((asUserEdit: boolean): 'done' | 'unchanged' | 'invalid' | 'none' => {
    const view = viewRef.current
    const format = toolsRef.current.format
    if (!view || !format) return 'none'
    const text = view.state.doc.toString()
    const formatted = format(text)
    if (formatted === null) return 'invalid'
    if (formatted === text) return 'unchanged'
    view.dispatch({
      changes: { from: 0, to: text.length, insert: formatted },
      selection: { anchor: mapCursor(text, formatted, view.state.selection.main.head) },
      annotations: asUserEdit ? undefined : programmatic.of(true),
    })
    return 'done'
  }, [])

  // Create the editor once and register it as the document surface for code files
  useEffect(() => {
    const view = new EditorView({ parent: host.current!, state: EditorState.create({ doc: '' }) })
    viewRef.current = view
    const unregister = registerSurface('code', {
      getContent: () => {
        // Format-on-save, so the file on disk is always pretty-printed. Skipped while the
        // cursor sits on a blank line: the user has just made room to type something, and
        // auto-save must not snatch the line away mid-thought.
        const { state } = view
        const line = state.doc.lineAt(state.selection.main.head)
        if (line.text.trim() !== '' || !view.hasFocus) applyFormat(false)
        return view.state.doc.toString()
      },
      snapshot: () => view.state.doc,
      isUnchangedSince: (doc) => view.state.doc.eq(doc as typeof view.state.doc),
      focus: () => view.focus(),
      commands: {
        format: () => {
          const result = applyFormat(true)
          if (result === 'invalid') {
            useAppStore.getState().showToast('Fix the errors before formatting', 'error')
            nextDiagnostic(view)
          }
          view.focus()
        },
        find: () => openSearchPanel(view),
        gotoError: () => { nextDiagnostic(view); view.focus() },
      },
    })
    return () => {
      unregister()
      view.destroy()
      viewRef.current = null
    }
  }, [applyFormat])

  // (Re)load whenever a file is opened, reloaded, or a CSV is switched to text
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const { content, fileType, path, meta, size, viewAsText } = useAppStore.getState().file
    const tools = toolsFor(fileType, size)
    toolsRef.current = tools
    const language = new Compartment()
    // Shown pretty-printed from the start. This does not mark the file unsaved: opening a
    // file must never rewrite it. The formatted text reaches disk with the user's first edit.
    const doc = tools.format?.(content) ?? content

    statusRef.current = {
      line: 1,
      col: 1,
      errors: tools.lint ? tools.lint(doc).length : undefined,
      note:
        size > CHECK_LIMIT_BYTES && (fileType === 'json' || fileType === 'xml')
          ? 'Large file: formatting and error checking are off'
          : undefined,
    }

    view.setState(
      EditorState.create({
        doc,
        extensions: [
          basicSetup,
          search({ top: true }),
          keymap.of([
            indentWithTab,
            { key: 'Mod-Shift-p', run: () => { useAppStore.getState().setCommandPaletteOpen(true); return true } },
          ]),
          EditorView.lineWrapping,
          EditorState.readOnly.of(meta.readOnly),
          EditorView.editable.of(!meta.readOnly),
          EditorView.contentAttributes.of({ spellcheck: 'false', autocorrect: 'off', autocapitalize: 'off' }),
          language.of(fileType === 'json' ? json() : fileType === 'xml' ? xml() : []),
          tools.lint
            ? [
                lintGutter(),
                linter(
                  (v) => {
                    const problems = tools.lint!(v.state.doc.toString())
                    statusRef.current.errors = problems.length
                    pushStatus()
                    return problems.map((p) => ({ ...p, severity: 'error' as const }))
                  },
                  { delay: 350 }
                ),
              ]
            : [],
          codeTheme,
          EditorView.updateListener.of((u) => {
            if (u.docChanged && !u.transactions.some((tr) => tr.annotation(programmatic))) {
              useAppStore.getState().markDirty(true)
            }
            if (u.docChanged || u.selectionSet) {
              const head = u.state.selection.main.head
              const line = u.state.doc.lineAt(head)
              const next = { line: line.number, col: head - line.from + 1 }
              if (next.line !== statusRef.current.line || next.col !== statusRef.current.col) {
                Object.assign(statusRef.current, next)
                pushStatus()
              }
            }
          }),
        ],
      })
    )
    view.scrollDOM.scrollTop = 0
    pushStatus()
    view.focus()

    // Syntax colours for everything else CodeMirror knows (YAML, INI, source code…)
    if (path && fileType === 'text' && !viewAsText) {
      const name = path.split(/[/\\]/).pop() ?? ''
      const description = LanguageDescription.matchFilename(languages, name)
      description?.load().then((support) => {
        if (viewRef.current === view && useAppStore.getState().file.loadId === loadId) {
          view.dispatch({ effects: language.reconfigure(support) })
        }
      }).catch(() => {/* plain text is a fine fallback */})
    }
  }, [loadId, pushStatus])

  const clipboardItems = (): Parameters<typeof SimpleMenu>[0]['items'] => {
    const view = viewRef.current!
    const { from, to } = view.state.selection.main
    const selected = view.state.sliceDoc(from, to)
    const readOnly = view.state.readOnly
    return [
      {
        label: 'Cut',
        disabled: !selected || readOnly,
        action: () => {
          navigator.clipboard.writeText(selected)
          view.dispatch(view.state.replaceSelection(''))
          view.focus()
        },
      },
      { label: 'Copy', disabled: !selected, action: () => { navigator.clipboard.writeText(selected); view.focus() } },
      {
        label: 'Paste',
        disabled: readOnly,
        action: () => {
          navigator.clipboard.readText().then((text) => {
            view.dispatch(view.state.replaceSelection(text), { scrollIntoView: true })
            view.focus()
          })
        },
      },
      'separator',
      { label: 'Select All', action: () => { selectAll(view); view.focus() } },
    ]
  }

  return (
    <div
      className="flex-1 min-h-0 lm-bg"
      onContextMenu={(e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY }) }}
    >
      <div ref={host} className="code-view-host" />
      {menu && <SimpleMenu x={menu.x} y={menu.y} items={clipboardItems()} onClose={() => setMenu(null)} />}
    </div>
  )
}
