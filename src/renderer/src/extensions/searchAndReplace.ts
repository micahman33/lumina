/**
 * searchAndReplace.ts
 *
 * Custom TipTap extension implementing Find & Replace using ProseMirror
 * decorations. No external package required — built directly on @tiptap/pm.
 *
 * Commands exposed:
 *   setSearchTerm(term, caseSensitive?)
 *   setReplaceTerm(term)
 *   nextSearchResult()
 *   prevSearchResult()
 *   replaceCurrentResult()
 *   replaceAllResults()
 *   clearSearch()
 *
 * Storage (read-only from outside):
 *   editor.storage.searchAndReplace.results   — { from, to }[]
 *   editor.storage.searchAndReplace.resultIndex
 */

import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Node as PmNode } from '@tiptap/pm/model'

export interface SearchResult {
  from: number
  to: number
}

export interface SearchStorage {
  searchTerm: string
  replaceTerm: string
  caseSensitive: boolean
  results: SearchResult[]
  resultIndex: number
}

const searchKey = new PluginKey<DecorationSet>('searchAndReplace')

// ── Helpers ───────────────────────────────────────────────────────────────────

export function findAll(doc: PmNode, term: string, caseSensitive: boolean): SearchResult[] {
  if (!term) return []
  const results: SearchResult[] = []
  const flags = caseSensitive ? 'g' : 'gi'
  // Escape regex special chars
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  let re: RegExp
  try {
    re = new RegExp(escaped, flags)
  } catch {
    return []
  }

  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return
    re.lastIndex = 0
    let m
    while ((m = re.exec(node.text)) !== null) {
      results.push({ from: pos + m.index, to: pos + m.index + m[0].length })
    }
  })
  return results
}

function buildDecos(doc: PmNode, storage: SearchStorage): DecorationSet {
  const { results, resultIndex } = storage
  if (!results.length) return DecorationSet.empty
  const decos = results.map((r, i) =>
    Decoration.inline(r.from, r.to, {
      class: i === resultIndex ? 'search-result-current' : 'search-result',
    })
  )
  return DecorationSet.create(doc, decos)
}

// ── Extension ─────────────────────────────────────────────────────────────────

export const SearchAndReplace = Extension.create<never, SearchStorage>({
  name: 'searchAndReplace',

  addStorage(): SearchStorage {
    return {
      searchTerm: '',
      replaceTerm: '',
      caseSensitive: false,
      results: [],
      resultIndex: 0,
    }
  },

  addCommands() {
    const refresh = (
      { editor, tr, dispatch }: Parameters<Parameters<typeof this.addCommands>[0]>[0]
    ): boolean => {
      if (dispatch) {
        tr.setMeta(searchKey, true)
        dispatch(tr)
      }
      return true
    }

    return {
      setSearchTerm:
        (term: string, caseSensitive?: boolean) =>
        (props) => {
          const s = this.editor.storage.searchAndReplace as SearchStorage
          s.searchTerm = term
          if (caseSensitive !== undefined) s.caseSensitive = caseSensitive
          s.results = findAll(this.editor.state.doc, s.searchTerm, s.caseSensitive)
          s.resultIndex = 0
          return refresh(props)
        },

      setReplaceTerm:
        (term: string) =>
        () => {
          ;(this.editor.storage.searchAndReplace as SearchStorage).replaceTerm = term
          return true
        },

      setCaseSensitive:
        (caseSensitive: boolean) =>
        (props) => {
          const s = this.editor.storage.searchAndReplace as SearchStorage
          s.caseSensitive = caseSensitive
          s.results = findAll(this.editor.state.doc, s.searchTerm, s.caseSensitive)
          s.resultIndex = 0
          return refresh(props)
        },

      clearSearch:
        () =>
        (props) => {
          const s = this.editor.storage.searchAndReplace as SearchStorage
          s.searchTerm = ''
          s.results = []
          s.resultIndex = 0
          return refresh(props)
        },

      nextSearchResult:
        () =>
        (props) => {
          const s = this.editor.storage.searchAndReplace as SearchStorage
          if (!s.results.length) return false
          s.resultIndex = (s.resultIndex + 1) % s.results.length
          scrollCurrentIntoView(this.editor.view, s)
          return refresh(props)
        },

      prevSearchResult:
        () =>
        (props) => {
          const s = this.editor.storage.searchAndReplace as SearchStorage
          if (!s.results.length) return false
          s.resultIndex = (s.resultIndex - 1 + s.results.length) % s.results.length
          scrollCurrentIntoView(this.editor.view, s)
          return refresh(props)
        },

      replaceCurrentResult:
        () =>
        ({ editor, tr, dispatch }) => {
          const s = editor.storage.searchAndReplace as SearchStorage
          const result = s.results[s.resultIndex]
          if (!result) return false
          if (dispatch) {
            const replacement = s.replaceTerm
              ? editor.schema.text(s.replaceTerm)
              : null
            tr.replaceWith(result.from, result.to, replacement ? [replacement] : [])
            // Results will be recalculated in plugin's apply()
            dispatch(tr)
          }
          return true
        },

      replaceAllResults:
        () =>
        ({ editor, tr, dispatch }) => {
          const s = editor.storage.searchAndReplace as SearchStorage
          if (!s.results.length) return false
          if (dispatch) {
            // Replace in reverse order so positions stay valid
            const sorted = [...s.results].sort((a, b) => b.from - a.from)
            for (const r of sorted) {
              const replacement = s.replaceTerm
                ? editor.schema.text(s.replaceTerm)
                : null
              tr.replaceWith(r.from, r.to, replacement ? [replacement] : [])
            }
            dispatch(tr)
          }
          return true
        },
    }
  },

  addProseMirrorPlugins() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const ext = this
    return [
      new Plugin({
        key: searchKey,
        state: {
          init(_config, state) {
            const s = ext.storage as SearchStorage
            return buildDecos(state.doc, s)
          },
          apply(tr, _old, _prev, newState) {
            const s = ext.storage as SearchStorage
            if (tr.docChanged && s.searchTerm) {
              // Recompute results after every content change
              s.results = findAll(newState.doc, s.searchTerm, s.caseSensitive)
              if (s.resultIndex >= s.results.length) {
                s.resultIndex = Math.max(0, s.results.length - 1)
              }
            }
            if (tr.docChanged || tr.getMeta(searchKey)) {
              return buildDecos(newState.doc, s)
            }
            return _old
          },
        },
        props: {
          decorations(state) {
            return searchKey.getState(state)
          },
        },
      }),
    ]
  },
})

// ── Scroll helper ──────────────────────────────────────────────────────────────

function scrollCurrentIntoView(
  view: { domAtPos(pos: number): { node: Node; offset: number } } | undefined,
  s: SearchStorage
): void {
  if (!view) return
  const result = s.results[s.resultIndex]
  if (!result) return
  try {
    const { node, offset } = view.domAtPos(result.from)
    const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement)
    if (el instanceof HTMLElement) {
      // Find the actual decoration span if present, otherwise use the parent
      const target =
        el.querySelector('.search-result-current') ??
        el.closest('.search-result-current') ??
        el
      ;(target as HTMLElement).scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
    }
    void offset // suppress unused-var lint
  } catch {
    // Non-fatal — view may not be attached yet
  }
}
