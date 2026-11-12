import { describe, it, expect } from 'vitest'
import { formatXml, lintXml } from '../xmlTools'

describe('formatXml', () => {
  it('indents nested elements with two spaces', () => {
    expect(formatXml('<a><b><c/></b><d x="1"></d></a>')).toBe(
      '<a>\n  <b>\n    <c/>\n  </b>\n  <d x="1"></d>\n</a>\n'
    )
  })

  it('keeps the declaration, doctype, comments and processing instructions', () => {
    const out = formatXml('<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE a><!-- top --><a><!-- in --><?pi x?><b/></a>')
    expect(out).toBe(
      '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE a>\n<!-- top -->\n<a>\n  <!-- in -->\n  <?pi x?>\n  <b/>\n</a>\n'
    )
  })

  it('copies mixed content verbatim', () => {
    expect(formatXml('<r><p>a <b>b</b>  c</p></r>')).toBe('<r>\n  <p>a <b>b</b>  c</p>\n</r>\n')
  })

  it('never touches text, entities, CDATA or xml:space="preserve"', () => {
    const cases = [
      '<a>  two  spaces  </a>',
      '<a>&amp;<b/></a>',
      '<a><![CDATA[ <x>  ]]><b/></a>',
      '<a xml:space="preserve"> <b/> </a>',
      '<a>   </a>',
    ]
    for (const c of cases) expect(formatXml(`<r>${c}</r>`)).toBe(`<r>\n  ${c}\n</r>\n`)
  })

  it('keeps attribute order, quoting and spacing inside tags', () => {
    expect(formatXml(`<a  z='1'   a="2"><b/></a>`)).toBe(`<a  z='1'   a="2">\n  <b/>\n</a>\n`)
  })

  it('is idempotent', () => {
    const once = formatXml('<a><b><c>t</c></b><!-- x --></a>')!
    expect(formatXml(once)).toBe(once)
  })

  it('returns null when the document is not well-formed or empty', () => {
    expect(formatXml('<a><b></a>')).toBeNull()
    expect(formatXml('<a>')).toBeNull()
    expect(formatXml('')).toBeNull()
  })
})

describe('lintXml', () => {
  it('accepts well-formed documents', () => {
    expect(lintXml('<?xml version="1.0"?>\n<a><b x="1">t &amp; u</b><c/></a>\n')).toEqual([])
  })

  it('reports a tag that is never closed', () => {
    const p = lintXml('<a><b>text</a>')
    expect(p.length).toBeGreaterThan(0)
    expect(p.some((x) => /<b>/.test(x.message) || /<\/a>/.test(x.message))).toBe(true)
  })

  it('reports a missing final close tag', () => {
    const p = lintXml('<root><item/>')
    expect(p.some((x) => x.message === '<root> is never closed')).toBe(true)
  })

  it('reports a mismatched close tag with its position', () => {
    const src = '<a>\n  <b></c>\n</a>'
    const p = lintXml(src)
    expect(p.length).toBeGreaterThan(0)
    expect(p[0].from).toBeGreaterThanOrEqual(src.indexOf('<b>'))
  })

  it('reports more than one root and stray text', () => {
    expect(lintXml('<a/><b/>').some((x) => x.message === 'Only one root element is allowed')).toBe(true)
    expect(lintXml('hello <a/>').some((x) => /outside the root/.test(x.message))).toBe(true)
    expect(lintXml('just text').length).toBeGreaterThan(0)
  })

  it('reports broken syntax', () => {
    expect(lintXml('<a b=></a>').length).toBeGreaterThan(0)
    expect(lintXml('<a><</a>').length).toBeGreaterThan(0)
  })
})
