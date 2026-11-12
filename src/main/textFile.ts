/**
 * Pure helpers for turning a file's bytes into editor text and back without damaging it:
 * the encoding, byte-order mark and line endings found on load are restored on save.
 */
import type { FileMeta, OpenFileResult } from '../renderer/src/types/file'

type Decoded = Omit<OpenFileResult, 'path' | 'size' | 'mtimeMs'>

const SNIFF_BYTES = 8192

/** `\r\n` only when the file uses it consistently — then it is safe to normalise and restore. */
function splitEol(text: string): { content: string; eol: FileMeta['eol'] } {
  if (!text.includes('\r\n')) return { content: text, eol: '\n' }
  const crlf = text.split('\r\n').length - 1
  const lf = text.split('\n').length - 1
  if (crlf !== lf) return { content: text, eol: '\n' } // mixed endings: leave untouched
  return { content: text.replace(/\r\n/g, '\n'), eol: '\r\n' }
}

function text(
  raw: string,
  encoding: FileMeta['encoding'],
  hasBom: boolean,
  readOnly = false
): Decoded {
  return { kind: 'text', ...splitEol(raw), encoding, hasBom, readOnly }
}

export function decodeBuffer(buf: Buffer): Decoded {
  // UTF-16 is full of NUL bytes, so its byte-order mark has to be checked before the sniff
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return text(buf.subarray(2).toString('utf16le'), 'utf16le', true)
  }
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    const swapped = Buffer.from(buf.subarray(2, 2 + ((buf.length - 2) & ~1)))
    swapped.swap16()
    return text(swapped.toString('utf16le'), 'utf16be', true)
  }

  if (buf.subarray(0, SNIFF_BYTES).includes(0)) {
    return { kind: 'binary', content: '', encoding: 'utf8', hasBom: false, eol: '\n', readOnly: true }
  }

  const hasBom = buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf
  const body = hasBom ? buf.subarray(3) : buf
  try {
    return text(new TextDecoder('utf-8', { fatal: true }).decode(body), 'utf8', hasBom)
  } catch {
    // Not UTF-8. Windows-1252 can display any byte sequence, but we can't be sure it is
    // right, so the file is read-only rather than risk writing it back wrong.
    return text(new TextDecoder('windows-1252').decode(body), 'windows-1252', false, true)
  }
}

export function encodeText(
  content: string,
  meta: Pick<FileMeta, 'encoding' | 'hasBom' | 'eol'>
): Buffer {
  const out = meta.eol === '\r\n' ? content.replace(/\r?\n/g, '\r\n') : content
  switch (meta.encoding) {
    case 'utf16le':
      return Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(out, 'utf16le')])
    case 'utf16be': {
      const body = Buffer.from(out, 'utf16le')
      body.swap16()
      return Buffer.concat([Buffer.from([0xfe, 0xff]), body])
    }
    default: {
      const body = Buffer.from(out, 'utf8')
      return meta.hasBom ? Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), body]) : body
    }
  }
}
