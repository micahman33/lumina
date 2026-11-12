import { describe, it, expect } from 'vitest'
import { decodeBuffer, encodeText } from '../textFile'

function roundTrip(buf: Buffer): Buffer {
  const d = decodeBuffer(buf)
  return encodeText(d.content, d)
}

describe('decodeBuffer / encodeText', () => {
  it('round-trips plain UTF-8', () => {
    const buf = Buffer.from('héllo\nwörld\n', 'utf8')
    const d = decodeBuffer(buf)
    expect(d).toMatchObject({ kind: 'text', encoding: 'utf8', hasBom: false, eol: '\n', readOnly: false })
    expect(d.content).toBe('héllo\nwörld\n')
    expect(roundTrip(buf).equals(buf)).toBe(true)
  })

  it('keeps a UTF-8 byte-order mark', () => {
    const buf = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('a,b\n')])
    const d = decodeBuffer(buf)
    expect(d.hasBom).toBe(true)
    expect(d.content).toBe('a,b\n')
    expect(roundTrip(buf).equals(buf)).toBe(true)
  })

  it('round-trips UTF-16 LE and BE', () => {
    const le = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('hi é\r\n', 'utf16le')])
    const be = Buffer.from(le)
    be.swap16()
    expect(decodeBuffer(le)).toMatchObject({ kind: 'text', encoding: 'utf16le', content: 'hi é\n', eol: '\r\n' })
    expect(decodeBuffer(be)).toMatchObject({ kind: 'text', encoding: 'utf16be', content: 'hi é\n' })
    expect(roundTrip(le).equals(le)).toBe(true)
    expect(roundTrip(be).equals(be)).toBe(true)
  })

  it('normalises and restores consistent CRLF', () => {
    const buf = Buffer.from('a\r\nb\r\n')
    const d = decodeBuffer(buf)
    expect(d.eol).toBe('\r\n')
    expect(d.content).toBe('a\nb\n')
    expect(roundTrip(buf).equals(buf)).toBe(true)
    // new lines typed in the editor come back as CRLF too
    expect(encodeText('a\nb\nc\n', d).toString()).toBe('a\r\nb\r\nc\r\n')
  })

  it('leaves mixed line endings untouched', () => {
    const buf = Buffer.from('a\r\nb\nc\r\n')
    const d = decodeBuffer(buf)
    expect(d.eol).toBe('\n')
    expect(d.content).toBe('a\r\nb\nc\r\n')
    expect(roundTrip(buf).equals(buf)).toBe(true)
  })

  it('flags binary content', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d])
    expect(decodeBuffer(png)).toMatchObject({ kind: 'binary', content: '', readOnly: true })
  })

  it('opens non-UTF-8 text read-only as Windows-1252', () => {
    const d = decodeBuffer(Buffer.from([0x63, 0x61, 0x66, 0xe9]))
    expect(d).toMatchObject({ kind: 'text', encoding: 'windows-1252', readOnly: true, content: 'café' })
  })

  it('handles an empty file', () => {
    const d = decodeBuffer(Buffer.alloc(0))
    expect(d).toMatchObject({ kind: 'text', content: '', readOnly: false })
    expect(encodeText('', d).length).toBe(0)
  })
})
