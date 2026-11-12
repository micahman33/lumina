import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronUp, Plus, X } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { registerSurface } from '../../surfaces'
import {
  parseCsv, serializeCsv, detectDelimiter, columnCount,
  setCell, insertRow, deleteRow, insertColumn, deleteColumn, sortRows,
  type CsvRow,
} from '../../utils/csv'
import { SimpleMenu, type MenuItem } from '../ui/SimpleMenu'

const ROW_H = 32
const COL_W = 168
const GUTTER_W = 52
const HISTORY_LIMIT = 200

interface Pos { r: number; c: number }

export default function CsvTableView(): JSX.Element {
  const loadId = useAppStore((s) => s.file.loadId)
  const readOnly = useAppStore((s) => s.file.meta.readOnly)

  const [rows, setRows] = useState<CsvRow[]>([])
  const [sel, setSel] = useState<Pos>({ r: 0, c: 0 })
  const [editing, setEditing] = useState<(Pos & { value: string }) | null>(null)
  const [sort, setSort] = useState<{ c: number; dir: 'asc' | 'desc' } | null>(null)
  const [menu, setMenu] = useState<(Pos & { x: number; y: number }) | null>(null)
  const [findOpen, setFindOpen] = useState(false)
  const [query, setQuery] = useState('')

  const scroller = useRef<HTMLDivElement>(null)
  const findInput = useRef<HTMLInputElement>(null)
  const rowsRef = useRef<CsvRow[]>(rows)
  const format = useRef({ delimiter: ',', finalTerm: '' })
  const undoStack = useRef<CsvRow[][]>([])
  const redoStack = useRef<CsvRow[][]>([])
  const editingRef = useRef(editing)
  editingRef.current = editing
  const selRef = useRef(sel)
  selRef.current = sel

  const cols = useMemo(() => Math.max(columnCount(rows), 1), [rows])

  const show = useCallback((next: CsvRow[]) => {
    rowsRef.current = next
    setRows(next)
  }, [])

  /** Apply an edit: remembered for undo and flags the file unsaved. */
  const commit = useCallback((next: CsvRow[]) => {
    if (next === rowsRef.current) return
    undoStack.current.push(rowsRef.current)
    if (undoStack.current.length > HISTORY_LIMIT) undoStack.current.shift()
    redoStack.current = []
    show(next)
    useAppStore.getState().markDirty(true)
  }, [show])

  const stepHistory = useCallback((from: CsvRow[][], to: CsvRow[][]) => {
    const previous = from.pop()
    if (!previous) return
    to.push(rowsRef.current)
    show(previous)
    setSort(null)
    useAppStore.getState().markDirty(true)
  }, [show])

  // (Re)load whenever a file is opened, reloaded, or switched back from text view
  useEffect(() => {
    const { content, path } = useAppStore.getState().file
    const delimiter = detectDelimiter(content, path)
    const doc = parseCsv(content, delimiter)
    format.current = { delimiter, finalTerm: doc.finalTerm }
    // An empty file still needs one (empty) header cell to click into; it serialises to ''
    show(doc.rows.length ? doc.rows : [{ cells: [''], raw: '', term: '' }])
    undoStack.current = []
    redoStack.current = []
    setSel({ r: 0, c: 0 })
    setEditing(null)
    setSort(null)
    if (scroller.current) { scroller.current.scrollTop = 0; scroller.current.scrollLeft = 0 }
    scroller.current?.focus()
  }, [loadId, show])

  useEffect(() => {
    useAppStore.getState().setViewStatus({ rows: Math.max(rows.length - 1, 0), cols })
  }, [rows.length, cols])

  // ── Selection and editing ───────────────────────────────────────────────

  const reveal = useCallback((pos: Pos) => {
    const el = scroller.current
    if (!el) return
    const top = pos.r * ROW_H
    if (pos.r > 0) {
      if (top < el.scrollTop + ROW_H) el.scrollTop = top - ROW_H
      else if (top + ROW_H > el.scrollTop + el.clientHeight) el.scrollTop = top + ROW_H - el.clientHeight
    }
    const left = GUTTER_W + pos.c * COL_W
    if (left < el.scrollLeft + GUTTER_W) el.scrollLeft = left - GUTTER_W
    else if (left + COL_W > el.scrollLeft + el.clientWidth) el.scrollLeft = left + COL_W - el.clientWidth
  }, [])

  const select = useCallback((pos: Pos) => {
    const r = Math.max(0, Math.min(pos.r, rowsRef.current.length - 1))
    const c = Math.max(0, Math.min(pos.c, Math.max(columnCount(rowsRef.current), 1) - 1))
    setSel({ r, c })
    reveal({ r, c })
  }, [reveal])

  const startEdit = useCallback((pos: Pos, initial?: string) => {
    if (readOnly) return
    setSel(pos)
    setEditing({ ...pos, value: initial ?? rowsRef.current[pos.r]?.cells[pos.c] ?? '' })
  }, [readOnly])

  /** Finish the open edit, if any. Safe to call when nothing is being edited. */
  const finishEdit = useCallback((save = true) => {
    const e = editingRef.current
    if (!e) return
    editingRef.current = null
    setEditing(null)
    if (save) commit(setCell(rowsRef.current, e.r, e.c, e.value))
    scroller.current?.focus()
  }, [commit])

  // ── The document surface ────────────────────────────────────────────────

  const addRow = useCallback(() => {
    finishEdit()
    const at = selRef.current.r + 1
    commit(insertRow(rowsRef.current, at, columnCount(rowsRef.current)))
    setSort(null)
    select({ r: at, c: selRef.current.c })
  }, [commit, finishEdit, select])

  const addColumn = useCallback(() => {
    finishEdit()
    const at = selRef.current.c + 1
    commit(insertColumn(rowsRef.current, at))
    select({ r: selRef.current.r, c: at })
  }, [commit, finishEdit, select])

  const openFind = useCallback(() => {
    setFindOpen(true)
    setTimeout(() => { findInput.current?.focus(); findInput.current?.select() }, 0)
  }, [])

  useEffect(() => {
    return registerSurface('table', {
      getContent: () => {
        // Include a cell that is still being typed, so nothing is lost if the save is the
        // last thing that happens (closing the window, switching to text view)
        const e = editingRef.current
        const current = e ? setCell(rowsRef.current, e.r, e.c, e.value) : rowsRef.current
        return serializeCsv({ rows: current, ...format.current })
      },
      snapshot: () => ({ rows: rowsRef.current, typing: editingRef.current?.value }),
      isUnchangedSince: (snapshot) => {
        const s = snapshot as { rows: CsvRow[]; typing: string | undefined }
        return rowsRef.current === s.rows && editingRef.current?.value === s.typing
      },
      focus: () => scroller.current?.focus(),
      commands: { addRow, addColumn, find: openFind },
    })
  }, [addRow, addColumn, openFind])

  // ── Find ────────────────────────────────────────────────────────────────

  const needle = query.trim().toLowerCase()
  const matches = useMemo(() => {
    if (!findOpen || !needle) return []
    const found: Pos[] = []
    rows.forEach((row, r) => row.cells.forEach((cell, c) => {
      if (cell.toLowerCase().includes(needle)) found.push({ r, c })
    }))
    return found
  }, [rows, needle, findOpen])
  const matchIndex = matches.findIndex((m) => m.r === sel.r && m.c === sel.c)

  const gotoMatch = useCallback((step: 1 | -1) => {
    if (!matches.length) return
    const { r, c } = selRef.current
    let next: number
    if (step === 1) {
      next = matches.findIndex((m) => m.r > r || (m.r === r && m.c > c))
      if (next === -1) next = 0
    } else {
      next = -1
      for (let i = matches.length - 1; i >= 0; i--) {
        if (matches[i].r < r || (matches[i].r === r && matches[i].c < c)) { next = i; break }
      }
      if (next === -1) next = matches.length - 1
    }
    select(matches[next])
  }, [matches, select])

  const closeFind = useCallback(() => {
    setFindOpen(false)
    scroller.current?.focus()
  }, [])

  // ── Keyboard ────────────────────────────────────────────────────────────

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (editing || e.target !== scroller.current) return
    const mod = e.metaKey || e.ctrlKey
    const { r, c } = sel
    const handled = (): void => { e.preventDefault(); e.stopPropagation() }

    if (mod) {
      const key = e.key.toLowerCase()
      if (key === 'z') { handled(); e.shiftKey ? stepHistory(redoStack.current, undoStack.current) : stepHistory(undoStack.current, redoStack.current) }
      else if (key === 'y') { handled(); stepHistory(redoStack.current, undoStack.current) }
      else if (key === 'f') { handled(); openFind() }
      else if (key === 'p' && e.shiftKey) { handled(); useAppStore.getState().setCommandPaletteOpen(true) }
      else if (key === 'c') { handled(); navigator.clipboard.writeText(rows[r]?.cells[c] ?? '') }
      else if (key === 'v' && !readOnly) {
        handled()
        navigator.clipboard.readText().then((text) => commit(setCell(rowsRef.current, r, c, text.replace(/\r?\n$/, ''))))
      }
      return
    }

    switch (e.key) {
      case 'ArrowUp': handled(); select({ r: r - 1, c }); break
      case 'ArrowDown': handled(); select({ r: r + 1, c }); break
      case 'ArrowLeft': handled(); select({ r, c: c - 1 }); break
      case 'ArrowRight': handled(); select({ r, c: c + 1 }); break
      case 'Tab': handled(); select({ r, c: c + (e.shiftKey ? -1 : 1) }); break
      case 'Enter':
      case 'F2': handled(); startEdit(sel); break
      case 'Backspace':
      case 'Delete': if (!readOnly) { handled(); commit(setCell(rowsRef.current, r, c, '')) } break
      case 'Escape': if (findOpen) { handled(); closeFind() } break
      default:
        // Typing on a selected cell replaces its contents, as in a spreadsheet
        if (e.key.length === 1 && !e.altKey) { handled(); startEdit(sel, e.key) }
    }
  }

  const onEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    e.stopPropagation()
    const { r, c } = sel
    if (e.key === 'Enter') { e.preventDefault(); finishEdit(); select({ r: r + (e.shiftKey ? -1 : 1), c }) }
    else if (e.key === 'Tab') { e.preventDefault(); finishEdit(); select({ r, c: c + (e.shiftKey ? -1 : 1) }) }
    else if (e.key === 'Escape') { e.preventDefault(); finishEdit(false) }
  }

  // ── Menus and sorting ───────────────────────────────────────────────────

  const toggleSort = (c: number): void => {
    finishEdit()
    const dir = sort?.c === c && sort.dir === 'asc' ? 'desc' : 'asc'
    commit(sortRows(rowsRef.current, c, dir))
    setSort({ c, dir })
  }

  const menuItems = (pos: Pos): MenuItem[] => {
    const structural = (next: CsvRow[], after: Pos): void => { commit(next); setSort(null); select(after) }
    const width = columnCount(rowsRef.current)
    return [
      { label: 'Insert row above', disabled: readOnly || pos.r === 0, action: () => structural(insertRow(rowsRef.current, pos.r, width), pos) },
      { label: 'Insert row below', disabled: readOnly, action: () => structural(insertRow(rowsRef.current, pos.r + 1, width), { r: pos.r + 1, c: pos.c }) },
      { label: 'Delete row', disabled: readOnly || rowsRef.current.length <= 1, action: () => structural(deleteRow(rowsRef.current, pos.r), pos) },
      'separator',
      { label: 'Insert column left', disabled: readOnly, action: () => structural(insertColumn(rowsRef.current, pos.c), pos) },
      { label: 'Insert column right', disabled: readOnly, action: () => structural(insertColumn(rowsRef.current, pos.c + 1), { r: pos.r, c: pos.c + 1 }) },
      { label: 'Delete column', disabled: readOnly || width <= 1, action: () => structural(deleteColumn(rowsRef.current, pos.c), pos) },
      'separator',
      { label: 'Sort ascending', disabled: readOnly, action: () => { commit(sortRows(rowsRef.current, pos.c, 'asc')); setSort({ c: pos.c, dir: 'asc' }) } },
      { label: 'Sort descending', disabled: readOnly, action: () => { commit(sortRows(rowsRef.current, pos.c, 'desc')); setSort({ c: pos.c, dir: 'desc' }) } },
    ]
  }

  // ── Rendering ───────────────────────────────────────────────────────────

  const virtualizer = useVirtualizer({
    count: Math.max(rows.length - 1, 0),
    getScrollElement: () => scroller.current,
    estimateSize: () => ROW_H,
    overscan: 12,
    // The pinned header row sits above the virtual list inside the same scroller
    scrollMargin: ROW_H,
  })
  const totalWidth = GUTTER_W + cols * COL_W
  const colIndexes = useMemo(() => Array.from({ length: cols }, (_, i) => i), [cols])

  const cell = (r: number, c: number): JSX.Element => {
    const value = rows[r]?.cells[c] ?? ''
    const isSel = sel.r === r && sel.c === c
    const isEditing = editing && editing.r === r && editing.c === c
    const isMatch = !!needle && findOpen && value.toLowerCase().includes(needle)
    const header = r === 0
    return (
      <div
        key={c}
        className={`csv-cell${header ? ' csv-header' : ''}${isSel ? ' csv-selected' : ''}${isMatch ? ' csv-match' : ''}`}
        style={{ width: COL_W, position: 'relative', paddingRight: header ? 26 : undefined }}
        title={value.length > 20 ? value : undefined}
        onMouseDown={(e) => {
          if (e.button !== 0 || isEditing) return
          finishEdit()
          setSel({ r, c })
        }}
        onDoubleClick={() => startEdit({ r, c })}
        onContextMenu={(e) => {
          e.preventDefault()
          finishEdit()
          setSel({ r, c })
          setMenu({ r, c, x: e.clientX, y: e.clientY })
        }}
      >
        {isEditing ? (
          <input
            autoFocus
            value={editing.value}
            spellCheck={false}
            onChange={(e) => {
              setEditing({ r, c, value: e.target.value })
              // Unsaved from the first keystroke, so closing the window mid-edit still prompts
              useAppStore.getState().markDirty(true)
            }}
            onKeyDown={onEditKeyDown}
            onBlur={() => finishEdit()}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%', boxSizing: 'border-box',
              padding: '0 9px', font: 'inherit', fontWeight: header ? 600 : 400, color: 'var(--lm-ink)',
              background: 'var(--lm-chrome)', border: '2px solid #5B6CFF', outline: 'none',
            }}
          />
        ) : (
          value.replace(/\n/g, '↵')
        )}
        {header && !isEditing && (
          <button
            title="Sort by this column"
            disabled={readOnly}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
            onClick={(e) => { e.stopPropagation(); toggleSort(c) }}
            onDoubleClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', right: 4, top: 6, width: 20, height: 20, borderRadius: 4,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', background: 'transparent', cursor: readOnly ? 'default' : 'pointer',
              color: sort?.c === c ? '#5B6CFF' : 'var(--lm-ink-faint)',
            }}
          >
            {sort?.c === c
              ? sort.dir === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />
              : <ArrowUpDown size={12} />}
          </button>
        )}
      </div>
    )
  }

  const row = (r: number, style: React.CSSProperties): JSX.Element => (
    <div key={r} className="csv-row" style={{ display: 'flex', width: totalWidth, ...style }}>
      <div className={`csv-cell csv-gutter${r === 0 ? ' csv-header' : ''}`}>{r === 0 ? '' : r}</div>
      {colIndexes.map((c) => cell(r, c))}
    </div>
  )

  const iconButton: React.CSSProperties = {
    width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', background: 'transparent', color: 'var(--lm-ink-soft)', borderRadius: 4, cursor: 'pointer',
  }

  return (
    <div className="flex-1 min-h-0 relative lm-bg">
      <div
        ref={scroller}
        tabIndex={0}
        onKeyDown={onKeyDown}
        style={{ position: 'absolute', inset: 0, overflow: 'auto', outline: 'none' }}
      >
        {/* Header: the file's first row, pinned to the top */}
        {rows.length > 0 && row(0, { position: 'sticky', top: 0, zIndex: 2 })}

        <div style={{ position: 'relative', height: Math.max(rows.length - 1, 0) * ROW_H, width: totalWidth }}>
          {virtualizer.getVirtualItems().map((item) =>
            row(item.index + 1, { position: 'absolute', top: 0, left: 0, transform: `translateY(${item.start - ROW_H}px)` })
          )}
        </div>

        {!readOnly && (
          <button
            onClick={() => {
              finishEdit()
              const at = rowsRef.current.length
              commit(insertRow(rowsRef.current, at, columnCount(rowsRef.current)))
              setSort(null)
              select({ r: at, c: 0 })
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, height: ROW_H, padding: '0 14px',
              position: 'sticky', left: 0, border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: 12, color: 'var(--lm-ink-faint)',
            }}
          >
            <Plus size={13} /> Add row
          </button>
        )}
      </div>

      {findOpen && (
        <div
          className="flex items-center"
          style={{
            position: 'absolute', top: 10, right: 22, zIndex: 5, gap: 4, padding: '5px 6px 5px 10px',
            background: 'var(--lm-chrome)', border: '1px solid var(--lm-border)', borderRadius: 8,
            boxShadow: '0 6px 18px rgba(0,0,0,0.14)',
          }}
        >
          <input
            ref={findInput}
            value={query}
            placeholder="Find in table"
            spellCheck={false}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === 'Enter') { e.preventDefault(); gotoMatch(e.shiftKey ? -1 : 1) }
              if (e.key === 'Escape') { e.preventDefault(); closeFind() }
            }}
            style={{ width: 170, fontSize: 13, border: 'none', outline: 'none', background: 'transparent', color: 'var(--lm-ink)' }}
          />
          <span style={{ fontSize: 11, color: 'var(--lm-ink-faint)', minWidth: 54, textAlign: 'right', fontFamily: 'ui-monospace, monospace' }}>
            {needle ? (matches.length ? `${matchIndex >= 0 ? matchIndex + 1 : '–'} of ${matches.length}` : 'No results') : ''}
          </span>
          <button style={iconButton} title="Previous" onClick={() => gotoMatch(-1)}><ChevronUp size={14} /></button>
          <button style={iconButton} title="Next" onClick={() => gotoMatch(1)}><ChevronDown size={14} /></button>
          <button style={iconButton} title="Close" onClick={closeFind}><X size={14} /></button>
        </div>
      )}

      {menu && (
        <SimpleMenu x={menu.x} y={menu.y} items={menuItems(menu)} onClose={() => setMenu(null)} />
      )}
    </div>
  )
}
