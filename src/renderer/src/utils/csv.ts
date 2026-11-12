/**
 * CSV reading and writing that never damages what it didn't change.
 *
 * Every row remembers its original text (`raw`) and line ending (`term`). A row the user has
 * not edited is written back character for character — original quoting, spacing and all.
 * Editing a cell clears that row's `raw`, and only then is the row re-written from its cells.
 */

export interface CsvRow {
  cells: string[]
  /** The row's original text, or null once it has been edited. */
  raw: string | null
  /** The line ending that followed this row in the file: '\n', '\r\n', or '' for none. */
  term: string
}

export interface CsvDoc {
  rows: CsvRow[]
  delimiter: string
  /** What followed the last row in the file ('' when there was no final newline). */
  finalTerm: string
}

/** Split CSV text into rows (RFC 4180 quoting; quoted fields may contain newlines). */
export function parseCsv(text: string, delimiter: string): CsvDoc {
  const rows: CsvRow[] = []
  let cells: string[] = []
  let field = ''
  let rowStart = 0
  let i = 0
  const n = text.length

  const endRow = (end: number, term: string): void => {
    cells.push(field)
    rows.push({ cells, raw: text.slice(rowStart, end), term })
    cells = []
    field = ''
    rowStart = end + term.length
  }

  while (i < n) {
    const ch = text[i]
    if (ch === '"' && field === '') {
      // Quoted field: runs to the closing quote; "" is an escaped quote
      i++
      while (i < n) {
        if (text[i] === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue }
          i++
          break
        }
        field += text[i++]
      }
      // Anything between the closing quote and the next separator is kept as-is
      while (i < n && text[i] !== delimiter && text[i] !== '\n' && !(text[i] === '\r' && text[i + 1] === '\n')) {
        field += text[i++]
      }
      continue
    }
    if (ch === delimiter) { cells.push(field); field = ''; i++; continue }
    if (ch === '\n') { endRow(i, '\n'); i++; continue }
    if (ch === '\r' && text[i + 1] === '\n') { endRow(i, '\r\n'); i += 2; continue }
    field += ch
    i++
  }
  // Text after the last line ending is a final row with no terminator
  if (rowStart < n) endRow(n, '')

  const finalTerm = rows.length ? rows[rows.length - 1].term : ''
  return { rows, delimiter, finalTerm }
}

function quoteField(value: string, delimiter: string): string {
  const needsQuotes =
    value.includes(delimiter) || value.includes('"') || value.includes('\n') || value.includes('\r')
  return needsQuotes ? `"${value.replace(/"/g, '""')}"` : value
}

export function serializeCsv(doc: CsvDoc): string {
  // The line ending for rows that don't have one of their own (new rows, a moved last row)
  const fallback = doc.rows.find((r) => r.term)?.term ?? (doc.finalTerm || '\n')
  let out = ''
  doc.rows.forEach((row, i) => {
    out += row.raw ?? row.cells.map((c) => quoteField(c, doc.delimiter)).join(doc.delimiter)
    out += i === doc.rows.length - 1 ? doc.finalTerm : row.term || fallback
  })
  return out
}

/** `.tsv` is tab; otherwise whichever of , ; tab splits the first rows most consistently. */
export function detectDelimiter(text: string, path: string | null): string {
  if (path?.toLowerCase().endsWith('.tsv')) return '\t'
  const sample = text.split('\n').slice(0, 20).join('\n')
  let best = ','
  let bestScore = 0
  for (const candidate of [',', ';', '\t']) {
    const counts = parseCsv(sample, candidate).rows.map((r) => r.cells.length)
    if (!counts.length) continue
    const width = counts[0]
    if (width < 2) continue
    const consistent = counts.filter((c) => c === width).length / counts.length
    const score = consistent * 1000 + width
    if (score > bestScore) { best = candidate; bestScore = score }
  }
  return best
}

export function columnCount(rows: CsvRow[]): number {
  let max = 0
  for (const r of rows) if (r.cells.length > max) max = r.cells.length
  return max
}

// ── Editing. Every operation returns a new array; rows are never mutated, so an earlier
//    array is a valid undo snapshot. ─────────────────────────────────────────────────────

const edited = (cells: string[], term: string): CsvRow => ({ cells, raw: null, term })

export function setCell(rows: CsvRow[], r: number, c: number, value: string): CsvRow[] {
  const row = rows[r]
  if (!row || (row.cells[c] ?? '') === value) return rows
  const cells = row.cells.slice()
  while (cells.length <= c) cells.push('')
  cells[c] = value
  const next = rows.slice()
  next[r] = edited(cells, row.term)
  return next
}

export function insertRow(rows: CsvRow[], at: number, width: number): CsvRow[] {
  const next = rows.slice()
  next.splice(at, 0, edited(Array.from({ length: Math.max(width, 1) }, () => ''), ''))
  return next
}

export function deleteRow(rows: CsvRow[], r: number): CsvRow[] {
  return rows.filter((_, i) => i !== r)
}

export function insertColumn(rows: CsvRow[], at: number): CsvRow[] {
  return rows.map((row) => {
    const cells = row.cells.slice()
    while (cells.length < at) cells.push('')
    cells.splice(at, 0, '')
    return edited(cells, row.term)
  })
}

export function deleteColumn(rows: CsvRow[], c: number): CsvRow[] {
  return rows.map((row) => (c < row.cells.length ? edited(row.cells.filter((_, i) => i !== c), row.term) : row))
}

/**
 * Sort by a column. The header (row 0) stays put. Numeric when every non-empty cell in the
 * column is a number, otherwise text; empty cells go last either way. Stable.
 */
export function sortRows(rows: CsvRow[], c: number, dir: 'asc' | 'desc'): CsvRow[] {
  if (rows.length < 3) return rows
  const body = rows.slice(1)
  const value = (row: CsvRow): string => (row.cells[c] ?? '').trim()
  const filled = body.map(value).filter((v) => v !== '')
  const numeric = filled.length > 0 && filled.every((v) => Number.isFinite(Number(v)))
  const sign = dir === 'asc' ? 1 : -1
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
  const sorted = body
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const av = value(a.row)
      const bv = value(b.row)
      if (av === '' || bv === '') return av === bv ? a.index - b.index : av === '' ? 1 : -1
      const cmp = numeric ? Number(av) - Number(bv) : collator.compare(av, bv)
      return cmp !== 0 ? cmp * sign : a.index - b.index
    })
    .map((x) => x.row)
  return [rows[0], ...sorted]
}
