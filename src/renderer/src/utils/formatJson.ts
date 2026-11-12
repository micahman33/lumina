import { applyEdits, format, parse, printParseErrorCode, type ParseError } from 'jsonc-parser'

export interface TextProblem {
  from: number
  to: number
  message: string
}

const MESSAGES: Record<string, string> = {
  InvalidSymbol: 'Unexpected character',
  InvalidNumberFormat: 'Invalid number',
  PropertyNameExpected: 'Property name expected (in double quotes)',
  ValueExpected: 'Value expected',
  ColonExpected: 'Colon expected',
  CommaExpected: 'Comma expected',
  CloseBraceExpected: 'Closing } expected',
  CloseBracketExpected: 'Closing ] expected',
  EndOfFileExpected: 'Unexpected content after the end of the document',
  InvalidCommentToken: 'Comments are not allowed in JSON',
  UnexpectedEndOfComment: 'Unterminated comment',
  UnexpectedEndOfString: 'Unterminated string',
  UnexpectedEndOfNumber: 'Unterminated number',
  InvalidUnicode: 'Invalid unicode escape',
  InvalidEscapeCharacter: 'Invalid escape character',
  InvalidCharacter: 'Invalid character in string',
}

/** Every syntax problem in a JSON document (strict JSON: no comments, no trailing commas). */
export function lintJson(text: string): TextProblem[] {
  if (!text.trim()) return []
  const errors: ParseError[] = []
  parse(text, errors, { allowTrailingComma: false, disallowComments: true })
  return errors.map((e) => {
    const code = printParseErrorCode(e.error)
    return {
      from: Math.min(e.offset, text.length),
      to: Math.min(e.offset + Math.max(e.length, 1), text.length),
      message: MESSAGES[code] ?? code,
    }
  })
}

/**
 * Pretty-print JSON with a two-space indent, or return null if it isn't valid.
 * Only whitespace between tokens is touched, so numbers, key order, duplicate keys and
 * string escapes come through exactly as written (JSON.parse + stringify would alter them).
 */
export function formatJson(text: string): string | null {
  if (!text.trim() || lintJson(text).length) return null
  const edits = format(text, undefined, {
    insertSpaces: true,
    tabSize: 2,
    eol: '\n',
    insertFinalNewline: true,
  })
  return applyEdits(text, edits)
}

/**
 * Where a cursor at `pos` in `before` belongs in `after`, when the two differ only in
 * whitespace: just past the same count of non-whitespace characters.
 */
export function mapCursor(before: string, after: string, pos: number): number {
  let count = 0
  for (let i = 0; i < pos && i < before.length; i++) if (!/\s/.test(before[i])) count++
  if (count === 0) return 0
  for (let i = 0; i < after.length; i++) {
    if (!/\s/.test(after[i]) && --count === 0) return i + 1
  }
  return after.length
}
