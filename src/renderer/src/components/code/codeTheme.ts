import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

// Colours come from CSS variables (see globals.css), so one theme follows light and dark.
const chrome = EditorView.theme({
  '&': { height: '100%', fontSize: '13px', color: 'var(--lm-ink)', backgroundColor: 'var(--lm-bg)' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': {
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    lineHeight: '1.6',
  },
  '.cm-content': { caretColor: '#5B6CFF', padding: '12px 0' },
  '.cm-line': { padding: '0 16px 0 6px' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#5B6CFF' },
  '.cm-gutters': { backgroundColor: 'var(--lm-bg)', color: 'var(--lm-ink-faint)', border: 'none' },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 8px 0 16px' },
  '.cm-activeLine': { backgroundColor: 'rgba(91,108,255,0.06)' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--lm-ink-soft)' },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground': {
    backgroundColor: 'rgba(91,108,255,0.22)',
  },
  '.cm-matchingBracket, &.cm-focused .cm-matchingBracket': {
    backgroundColor: 'rgba(91,108,255,0.18)', outline: 'none',
  },
  '.cm-searchMatch': { backgroundColor: 'rgba(245,158,11,0.3)' },
  '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: 'rgba(245,158,11,0.65)' },
  '.cm-foldPlaceholder': {
    backgroundColor: 'transparent', border: '1px solid var(--lm-border)', color: 'var(--lm-ink-soft)',
    padding: '0 6px', borderRadius: '4px',
  },
  '.cm-panels': { backgroundColor: 'var(--lm-chrome)', color: 'var(--lm-ink)' },
  '.cm-panels.cm-panels-top': { borderBottom: '1px solid var(--lm-border)' },
  '.cm-panel.cm-search': { padding: '8px 12px', fontSize: '12px' },
  '.cm-panel.cm-search label': { fontSize: '12px', color: 'var(--lm-ink-soft)' },
  '.cm-textfield': {
    backgroundColor: 'var(--lm-bg)', border: '1px solid var(--lm-border)', borderRadius: '5px',
    color: 'var(--lm-ink)', padding: '3px 7px', fontSize: '12px',
  },
  '.cm-button': {
    backgroundColor: 'var(--lm-bg)', backgroundImage: 'none', border: '1px solid var(--lm-border)',
    borderRadius: '5px', color: 'var(--lm-ink)', padding: '3px 9px', fontSize: '12px',
  },
  '.cm-tooltip': {
    backgroundColor: 'var(--lm-chrome)', border: '1px solid var(--lm-border)', color: 'var(--lm-ink)',
    borderRadius: '6px', boxShadow: '0 6px 18px rgba(0,0,0,0.14)',
  },
  '.cm-diagnostic': { padding: '5px 10px', fontSize: '12px', fontFamily: 'system-ui, sans-serif' },
  '.cm-diagnostic-error': { borderLeft: '3px solid #E5484D' },
  '.cm-lintRange-error': {
    backgroundImage: 'none', textDecoration: 'underline wavy #E5484D', textDecorationSkipInk: 'none',
    backgroundColor: 'rgba(229,72,77,0.10)',
  },
})

const syntax = HighlightStyle.define([
  { tag: [t.comment, t.meta, t.processingInstruction, t.documentMeta], color: 'var(--cm-comment)' },
  { tag: [t.propertyName, t.attributeName], color: 'var(--cm-property)' },
  { tag: [t.string, t.special(t.string), t.attributeValue], color: 'var(--cm-string)' },
  { tag: [t.number, t.bool, t.null, t.atom], color: 'var(--cm-number)' },
  { tag: [t.keyword, t.operatorKeyword, t.modifier], color: 'var(--cm-keyword)' },
  { tag: [t.tagName, t.typeName, t.className], color: 'var(--cm-tag)' },
  { tag: [t.function(t.variableName), t.definition(t.variableName)], color: 'var(--cm-function)' },
  { tag: [t.punctuation, t.bracket, t.angleBracket, t.separator], color: 'var(--cm-punct)' },
  { tag: t.heading, fontWeight: '600' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strong, fontWeight: '600' },
  { tag: t.link, textDecoration: 'underline' },
  { tag: t.invalid, color: '#E5484D' },
])

export const codeTheme = [chrome, syntaxHighlighting(syntax)]
