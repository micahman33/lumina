import { describe, it, expect } from 'vitest'
import { formatJson, lintJson, mapCursor } from '../formatJson'

describe('formatJson', () => {
  it('pretty-prints minified JSON with two spaces', () => {
    expect(formatJson('{"a":[1,2,{"b":null}],"c":"x"}')).toBe(
      '{\n  "a": [\n    1,\n    2,\n    {\n      "b": null\n    }\n  ],\n  "c": "x"\n}\n'
    )
  })

  it('never changes a value, key order or duplicate key', () => {
    const src = '{"z":1.0,"big":12345678901234567890,"2":0,"1":0,"e":1E5,"dup":1,"dup":2,"u":"\\u00e9  x"}'
    const out = formatJson(src)!
    expect(out.replace(/\s+(?=(?:[^"]*"[^"]*")*[^"]*$)/g, '')).toBe(src)
    expect(out.indexOf('"2"')).toBeLessThan(out.indexOf('"1"'))
  })

  it('is idempotent', () => {
    const once = formatJson('[{"a":1},{"b":[]}]')!
    expect(formatJson(once)).toBe(once)
  })

  it('returns null for invalid or empty input', () => {
    expect(formatJson('{"a":1,}')).toBeNull()
    expect(formatJson('{"a":1} // note')).toBeNull()
    expect(formatJson('{"a":')).toBeNull()
    expect(formatJson('')).toBeNull()
    expect(formatJson('   \n')).toBeNull()
  })

  it('reports where the problem is', () => {
    const problems = lintJson('{"a": 1,\n "b": }')
    expect(problems.length).toBeGreaterThan(0)
    expect(problems[0].from).toBeGreaterThanOrEqual(13)
    expect(problems[0].message).toBe('Value expected')
    expect(lintJson('{"a":1}')).toEqual([])
    expect(lintJson('')).toEqual([])
  })
})

describe('mapCursor', () => {
  it('keeps the cursor after the same token', () => {
    const before = '{"a":1,"b":2}'
    const after = formatJson(before)!
    const pos = before.indexOf(',') + 1
    expect(after.slice(0, mapCursor(before, after, pos)).trimEnd().endsWith('1,')).toBe(true)
    expect(mapCursor(before, after, 0)).toBe(0)
    expect(mapCursor(before, after, before.length)).toBe(after.trimEnd().length)
  })
})
