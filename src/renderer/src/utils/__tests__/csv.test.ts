import { describe, it, expect } from 'vitest'
import {
  parseCsv, serializeCsv, detectDelimiter, columnCount,
  setCell, insertRow, deleteRow, insertColumn, deleteColumn, sortRows,
  type CsvDoc,
} from '../csv'

const roundTrip = (text: string, delimiter = ','): string => serializeCsv(parseCsv(text, delimiter))
const withRows = (doc: CsvDoc, rows: CsvDoc['rows']): CsvDoc => ({ ...doc, rows })

describe('parseCsv / serializeCsv', () => {
  it('reads cells', () => {
    const doc = parseCsv('a,b,c\n1,2,3\n', ',')
    expect(doc.rows.map((r) => r.cells)).toEqual([['a', 'b', 'c'], ['1', '2', '3']])
    expect(doc.finalTerm).toBe('\n')
  })

  it('reads quoted fields with separators, quotes and newlines', () => {
    const doc = parseCsv('id,note\n1,"said ""hi"", then\nleft"\n2,x\n', ',')
    expect(doc.rows).toHaveLength(3)
    expect(doc.rows[1].cells).toEqual(['1', 'said "hi", then\nleft'])
  })

  const untouched: Record<string, [string, string?]> = {
    'plain': ['a,b\n1,2\n'],
    'semicolons': ['a;b\n1;2\n', ';'],
    'tabs': ['a\tb\n1\t2\n', '\t'],
    'every field quoted': ['"a","b"\n"1","2"\n'],
    'mixed quoting': ['a,"b"\n"1",2\n 3 ,"x,y"\n'],
    'ragged rows': ['a,b,c\n1\n1,2,3,4\n'],
    'CRLF': ['a,b\r\n1,2\r\n'],
    'mixed line endings': ['a,b\r\n1,2\n3,4\r\n'],
    'no final newline': ['a,b\n1,2'],
    'blank lines': ['a,b\n\n1,2\n\n'],
    'quoted newline and separator': ['a,b\n"x,\ny",2\n'],
    'empty file': [''],
    'only a newline': ['\n'],
    'unterminated quote': ['a,b\n"oops,2\n3,4\n'],
    'trailing separator': ['a,b,\n1,2,\n'],
  }
  for (const [name, [text, delimiter]] of Object.entries(untouched)) {
    it(`writes an unedited file back byte for byte: ${name}`, () => {
      expect(roundTrip(text, delimiter)).toBe(text)
    })
  }

  it('editing one cell changes only that row', () => {
    const text = '"a","b"\n"1", 2\n"3","4"\n'
    const doc = parseCsv(text, ',')
    const out = serializeCsv(withRows(doc, setCell(doc.rows, 1, 0, 'x,y')))
    expect(out).toBe('"a","b"\n"x,y", 2\n"3","4"\n')
  })

  it('setting a cell to its current value changes nothing', () => {
    const doc = parseCsv('"a","b"\n', ',')
    expect(setCell(doc.rows, 0, 0, 'a')).toBe(doc.rows)
  })

  it('quotes only what needs it', () => {
    const doc = parseCsv('a\n', ',')
    let rows = setCell(doc.rows, 0, 0, 'plain')
    rows = setCell(rows, 0, 1, 'has "quote"')
    rows = setCell(rows, 0, 2, ' padded ')
    rows = setCell(rows, 0, 3, 'line\nbreak')
    expect(serializeCsv(withRows(doc, rows))).toBe('plain,"has ""quote""", padded ,"line\nbreak"\n')
  })

  it('pads a short row when a cell beyond its end is edited', () => {
    const doc = parseCsv('a,b,c\n1\n', ',')
    expect(serializeCsv(withRows(doc, setCell(doc.rows, 1, 2, 'z')))).toBe('a,b,c\n1,,z\n')
  })

  it('adds and removes rows, keeping the file\'s line ending and final newline', () => {
    const crlf = parseCsv('a,b\r\n1,2\r\n', ',')
    expect(serializeCsv(withRows(crlf, insertRow(crlf.rows, 2, 2)))).toBe('a,b\r\n1,2\r\n,\r\n')
    const bare = parseCsv('a,b\n1,2', ',')
    expect(serializeCsv(withRows(bare, insertRow(bare.rows, 2, 2)))).toBe('a,b\n1,2\n,')
    expect(serializeCsv(withRows(bare, deleteRow(bare.rows, 1)))).toBe('a,b')
    expect(serializeCsv(withRows(crlf, insertRow(crlf.rows, 1, 2)))).toBe('a,b\r\n,\r\n1,2\r\n')
  })

  it('adds and removes columns', () => {
    const doc = parseCsv('"a","b"\n1,2\n', ',')
    expect(serializeCsv(withRows(doc, insertColumn(doc.rows, 1)))).toBe('a,,b\n1,,2\n')
    expect(serializeCsv(withRows(doc, deleteColumn(doc.rows, 0)))).toBe('b\n2\n')
    expect(columnCount(parseCsv('a\n1,2,3\n', ',').rows)).toBe(3)
  })
})

describe('sortRows', () => {
  const cells = (text: string, c: number, dir: 'asc' | 'desc'): string[] => {
    const doc = parseCsv(text, ',')
    return sortRows(doc.rows, c, dir).map((r) => r.cells[c] ?? '')
  }

  it('keeps the header first and sorts numbers numerically', () => {
    expect(cells('n\n10\n9\n100\n', 0, 'asc')).toEqual(['n', '9', '10', '100'])
    expect(cells('n\n10\n9\n100\n', 0, 'desc')).toEqual(['n', '100', '10', '9'])
  })

  it('sorts text when any cell is not a number, empties last', () => {
    expect(cells('n\nbeta\n\nAlpha\n10\n', 0, 'asc')).toEqual(['n', '10', 'Alpha', 'beta', ''])
    expect(cells('n\nbeta\n\nAlpha\n', 0, 'desc')).toEqual(['n', 'beta', 'Alpha', ''])
  })

  it('moves rows without rewriting them', () => {
    const doc = parseCsv('"k","v"\n"b", 2\n"a", 1', ',')
    expect(serializeCsv({ ...doc, rows: sortRows(doc.rows, 0, 'asc') })).toBe('"k","v"\n"a", 1\n"b", 2')
  })
})

describe('detectDelimiter', () => {
  it('picks the separator that splits consistently', () => {
    expect(detectDelimiter('a,b,c\n1,2,3\n', '/x.csv')).toBe(',')
    expect(detectDelimiter('a;b;c\n1,5;2;3\n', '/x.csv')).toBe(';')
    expect(detectDelimiter('a\tb\n1\t2\n', '/x.csv')).toBe('\t')
    expect(detectDelimiter('a,b\n1,2\n', '/x.tsv')).toBe('\t')
    expect(detectDelimiter('single\ncolumn\n', '/x.csv')).toBe(',')
    expect(detectDelimiter('', null)).toBe(',')
  })
})
