# More File Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open, display and safely edit JSON, XML, CSV/TSV, logs and any other text file in Lumina.

**Architecture:** File type picks one of three views: the existing TipTap "rich" view, a new CodeMirror 6 "code" view, and a new windowed "table" view. `useFile` stops talking to TipTap directly and talks to the active view through a small surface registry. The main process reads bytes, detects encoding/binary, and guards saves with a modification-time check.

**Tech Stack:** Electron 41, React 18, Zustand, TipTap 3 (existing); CodeMirror 6, `jsonc-parser`, `@lezer/xml`, `@tanstack/react-virtual` (new); Vitest.

**Spec:** `docs/superpowers/specs/2026-11-12-more-file-types-design.md`

## Global Constraints

- Opening a file never writes to disk.
- Formatting changes whitespace only; two-space indent; never `JSON.parse`/`stringify`.
- Untouched CSV rows are written back character for character.
- Encoding, BOM and line endings found on load are restored on save.
- Linting and formatting are skipped above 5 MB; files above 50 MB ask before opening.
- CodeMirror and the two new views load via dynamic `import()`.
- macOS file associations for new types use `"rank": "Alternate"`; Windows registers none
  for new types (electron-builder's NSIS template would claim the default).
- `npm test`, `npm run build` and `npm run build:web` pass after every task.
- In-app checks use a scratch folder and a scratch `--user-data-dir`, never `~/Documents/Lumina`.

## Review Focus

1. Empty file of each type (0 bytes): opens, shows an empty view, saving unchanged writes 0 bytes. → Tasks 1, 3, 4.
2. CSV with a quoted field containing a newline and the separator: one row, cell shows both; untouched → byte-identical. → Task 4.
3. JSON that becomes valid mid-typing: auto-save formats it without moving the cursor to a different token. → Task 3.
4. A file deleted or made unwritable while open: save fails with a message, document stays dirty. → Task 1.
5. Switching CSV → "View as text" → back with unsaved edits: edits and dirty flag survive. → Task 4.

---

### Task 1: Byte-level reading, encodings, save guard, any-file opening

**Files:**
- Create: `src/main/textFile.ts`, `src/main/openDialog.ts`, `src/main/__tests__/textFile.test.ts`
- Modify: `src/renderer/src/types/file.ts`, `src/renderer/src/types/ipc.ts`, `src/main/ipc/fileHandlers.ts`, `src/main/menu.ts`, `src/main/pendingOpen.ts`, `src/preload/index.ts`, `src/renderer/src/utils/txtUtils.ts`, `src/renderer/src/web-api-mock.ts`, `src/test/setup.ts`

**Interfaces (produced):**

```ts
// types/file.ts
type FileType = 'md' | 'txt' | 'json' | 'xml' | 'csv' | 'text'
type ViewKind = 'rich' | 'code' | 'table'
type TextEncoding = 'utf8' | 'utf16le' | 'utf16be' | 'windows-1252'
interface FileMeta { encoding: TextEncoding; hasBom: boolean; eol: '\n' | '\r\n'; mtimeMs: number | null; readOnly: boolean }
interface OpenFileResult extends FileMeta { path: string; content: string; kind: 'text' | 'binary'; size: number }
type SaveResult = { ok: true; mtimeMs: number } | { ok: false; reason: 'conflict' | 'error' }
interface SaveAsResult { path: string; mtimeMs: number }
function viewKindFor(fileType: FileType, viewAsText: boolean): ViewKind   // utils/txtUtils.ts

// main/textFile.ts (pure)
function decodeBuffer(buf: Buffer): Omit<OpenFileResult, 'path' | 'size' | 'mtimeMs'>
function encodeText(content: string, meta: Pick<FileMeta, 'encoding' | 'hasBom' | 'eol'>): Buffer

// preload
saveFile(path, content, meta: FileMeta, force?: boolean): Promise<SaveResult>
saveFileAs(content, currentPath: string | undefined, meta: FileMeta): Promise<SaveAsResult | null>
statFile(path): Promise<number | null>                        // mtimeMs
confirmConflict(name): Promise<'overwrite' | 'reload' | 'cancel'>
```

- `decodeBuffer`: UTF-16 BOM checked first; then NUL in first 8 KB → `kind: 'binary'`, `content: ''`; fatal UTF-8 decode, falling back to `windows-1252` + `readOnly`. `eol` is `'\r\n'` only when every `\n` is preceded by `\r`, and only then is content normalised to `\n`.
- `FILE_SAVE` refuses with `conflict` when disk mtime is more than 1 ms newer than `meta.mtimeMs` and `force` is not set.
- One `openPath(path)` in `fileHandlers.ts` serves FILE_OPEN, FILE_OPEN_PATH and FILE_READ_INITIAL, including the 50 MB confirmation.
- `detectFileType`: `md|markdown`→md, `txt`→txt, `json|geojson|webmanifest`→json, `xml|svg|xsd|xsl|xslt|plist|rss|atom|xhtml`→xml, `csv|tsv`→csv, everything else→text.
- `findFileArg(argv)`: first arg not starting with `-` that is an existing regular file.

**Tests (`textFile.test.ts`, plus additions to `detectFileType.test.ts`):** UTF-8 with/without BOM round-trips byte-identically; UTF-16 LE and BE with BOM round-trip; CRLF file round-trips; mixed-EOL file round-trips untouched with `eol: '\n'`; PNG header → binary; `0xE9` alone → windows-1252 + readOnly; empty buffer → text, `''`; each extension group above.

- [ ] Write tests, see them fail, implement, see them pass, commit.

### Task 2: Surface registry, store, `useFile` rewrite, plain code view, shell

**Files:**
- Create: `src/renderer/src/surfaces.ts`, `src/renderer/src/components/code/CodeView.tsx`, `src/renderer/src/components/code/codeTheme.ts`, `src/renderer/src/components/editor/SimpleToolbar.tsx`, `src/renderer/src/components/editor/FileNotices.tsx`
- Modify: `store/appStore.ts`, `hooks/useFile.ts`, `components/editor/EditorPane.tsx`, `components/editor/StatusBar.tsx`, `components/editor/CommandPalette.tsx`, `styles/globals.css`

**Interfaces (produced):**

```ts
// surfaces.ts
interface DocumentSurface {
  getContent(): string
  snapshot(): unknown
  isUnchangedSince(snapshot: unknown): boolean
  focus(): void
  commands?: { format?(): void; addRow?(): void; addColumn?(): void; find?(): void }
}
function registerSurface(kind: ViewKind, s: DocumentSurface): () => void
function getSurface(kind: ViewKind): DocumentSurface | undefined

// store: FileState gains
meta: FileMeta; kind: 'text' | 'binary'; viewAsText: boolean; loadId: number; size: number
status: { errors?: number; rows?: number; cols?: number; line?: number; col?: number; note?: string }
saveBlocked: boolean
```

- Code and table views are declarative: they (re)initialise from `file.content` whenever `file.loadId` changes and never mark the document dirty while doing so.
- `useFile.getContent()` uses the active surface, falling back to `file.content` while a lazy view is still loading.
- `writeCurrentFile` calls `getContent()` *before* `snapshot()` (formatting on save changes the document), handles `conflict` through `confirmConflict`, and sets `saveBlocked` on Cancel so auto-save stops until a manual save.
- On window focus with a clean document, `statFile`; if newer, reload.
- A window-level drop handler opens any dropped non-image file through `openFilePath`.
- Non-rich views hide: Markdown toolbar, outline, Focus Mode, export, Find & Replace panel; the command palette filters those commands out.
- Read-only and binary notices render above the view; binary shows only the notice and a Reveal button.

**In-app check:** open a `.log`, type, wait for auto-save, compare bytes; open a PNG; open a CRLF file, edit, confirm CRLF kept; modify a file externally while dirty and confirm the prompt.

- [ ] Implement, check in app, commit.

### Task 3: JSON and XML formatting and linting

**Files:**
- Create: `src/renderer/src/utils/formatJson.ts`, `src/renderer/src/utils/xmlTools.ts`, `src/renderer/src/utils/__tests__/formatJson.test.ts`, `src/renderer/src/utils/__tests__/xmlTools.test.ts`
- Modify: `components/code/CodeView.tsx`

**Interfaces (produced):**

```ts
function formatJson(text: string): string | null          // null when invalid
interface XmlProblem { from: number; to: number; message: string }
function lintXml(text: string): XmlProblem[]
function formatXml(text: string): string | null           // null when lintXml finds anything
function mapCursor(before: string, after: string, pos: number): number   // by count of non-whitespace chars
```

- `formatXml` rule: an element is re-indented only if its content is nothing but child elements, comments and processing instructions separated by whitespace. Any element containing non-whitespace text, an entity or character reference, CDATA, or carrying `xml:space="preserve"` is emitted verbatim, as are tags themselves, comments, doctype and declaration.
- `lintXml`: Lezer error nodes, missing and mismatched close tags, and more or fewer than one root element.

**Tests:** minified → 2-space; `{"a":1.0,"b":12345678901234567890,"2":0,"1":0}` keeps every literal and key order; duplicate keys kept; `é` escape kept; trailing comma and comment → null; empty → null. XML: nested elements indented; `<p>a <b>b</b> c</p>` verbatim; CDATA, comment, declaration verbatim; `<a><b></a>` reports a mismatch; `<a>` reports missing close; two roots reported; `formatXml(formatXml(x)) === formatXml(x)`; `mapCursor` lands after the same token.

- [ ] Write tests, see them fail, implement, wire into CodeView (format on load, on save, Format button, linter, error count), check in app, commit.

### Task 4: CSV table view

**Files:**
- Create: `src/renderer/src/utils/csv.ts`, `src/renderer/src/utils/__tests__/csv.test.ts`, `src/renderer/src/components/table/CsvTableView.tsx`, `src/renderer/src/components/table/useCsvTable.ts`
- Modify: `components/editor/EditorPane.tsx`, `components/editor/SimpleToolbar.tsx`

**Interfaces (produced):**

```ts
interface CsvRow { cells: string[]; raw: string | null; term: string }   // term: '\n' | '\r\n' | ''
interface CsvDoc { rows: CsvRow[]; delimiter: string; finalTerm: string }
function detectDelimiter(text: string, path: string | null): string
function parseCsv(text: string, delimiter: string): CsvDoc
function serializeCsv(doc: CsvDoc): string
function setCell(rows, r, c, value): CsvRow[]
function insertRow(rows, at, width): CsvRow[]
function deleteRow(rows, r): CsvRow[]
function insertColumn(rows, at): CsvRow[]
function deleteColumn(rows, c): CsvRow[]
function sortRows(rows, c, dir: 'asc' | 'desc'): CsvRow[]   // row 0 stays; numeric when every non-empty cell is a number; empties last
```

- Row operations return new arrays and never mutate; undo/redo is a stack of `rows` arrays (cap 200).
- Fixed row height 32 px, windowed with `@tanstack/react-virtual`.

**Tests:** byte-identical round-trip for comma, semicolon, tab; all-quoted, mixed quoting, ragged rows, CRLF terms, no final newline, empty file, quoted newline + separator in one field; `setCell` changes only that row's bytes; `insertColumn` re-serialises all rows with minimal quoting; numeric vs text sort; header stays first; delimiter detection.

**In-app check:** open, edit a cell, auto-save, diff shows one changed line; sort, undo; add/delete row and column; View as text and back while dirty; 50,000-row file scrolls.

- [ ] Write tests, see them fail, implement, check in app, commit.

### Task 5: Associations, docs, release

**Files:** `package.json` (`build.mac.fileAssociations`), `README.md`, `CHANGELOG.md`, `src/main/welcome.ts`

- [ ] Add mac associations for `json xml csv tsv log yaml yml ini toml conf` with `"rank": "Alternate"`.
- [ ] README features + What's New, CHANGELOG v1.7.0.
- [ ] `npm version minor`, `npm run build:mac`, `npm run build:win`, verify signature, push, `gh release create v1.7.0`.
