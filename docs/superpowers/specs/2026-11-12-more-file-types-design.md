# More file types: JSON, XML, CSV, logs and other text

Status: awaiting approval · Target release: v1.7.0 · Branch: `more-file-types`

## Why

Lumina only opens Markdown and `.txt`. Micah is about to publish it more widely and wants it
to be the app people reach for when they double-click any everyday text file — a config
file, a data export, a log — and to show each one in the form that is easiest to read and
safe to edit.

## What the user sees

Items marked **(decided)** came from Micah. Everything else is a default chosen while
writing this up and is open to change.

### JSON and XML

- **(decided)** Opening a JSON or XML file always shows it pretty-printed, in a code-viewer
  style with syntax colours.
- **(decided)** Saving writes the pretty-printed form to disk.
- **(decided)** Problems are flagged in place: breaking characters, missing or mismatched
  closing tags, and the like.
- It is an editor, not a read-only viewer: line numbers, code folding, bracket matching,
  find and replace.
- Opening a file never changes it on disk. A minified file is displayed formatted and stays
  "saved"; the formatted text is written only after the user makes an edit (auto-save or
  Save).
- On every save, a valid document is re-formatted first, so what is on disk is always
  pretty-printed. The cursor stays where it was.
- A document with errors cannot be formatted. It is shown exactly as it is on disk, with
  errors underlined in red, the message on hover, and an error count in the status bar that
  jumps to the first error when clicked. Saving is still allowed and writes the text as
  typed.
- Formatting changes whitespace only. Two-space indent. It must never change a value:
  no re-ordering of keys, no rewriting `1.0` as `1`, no loss of large numbers, no change
  inside XML text, comments, CDATA or processing instructions.

### CSV (and TSV)

- **(decided)** Opens as a basic, editable table: read it, change cells, add and remove rows
  and columns. Saving writes CSV.
- The first row is the header, shown as bold column titles, and is editable.
- Click a cell to edit. Tab / Shift+Tab move across, Enter / Shift+Enter move down and up,
  arrow keys move when not editing, Escape cancels an edit.
- Right-click a row or column to insert before/after or delete. An "add row" control sits
  under the last row.
- Each column title has a small sort arrow; clicking the arrow sorts by that column
  (ascending, then descending). Clicking the title text itself edits it, like any cell.
  **(decided)** Sorting really reorders the rows, so it is saved, and undo reverses it. Numbers sort numerically when every non-empty cell in the column
  is a number; otherwise text order.
- Undo and redo cover cell edits, structural changes and sorts.
- Saving keeps the file's separator (comma, semicolon or tab), line endings and
  byte-order mark. Cell text is never re-interpreted: `007`, `1e5` and dates stay exactly
  as typed.
- Rows the user did not change are written back character for character, including their
  original quoting and spacing. Only rows that were edited, or every row when a column is
  added or removed, are re-written, with quotes added only where needed.
- A "View as text" toggle switches the same file to the code editor and back.
- Not a spreadsheet: no formulas, no cell formatting, no column types.

### Everything else (`.log`, `.yaml`, `.ini`, source code, files with no extension…)

- **(decided)** Lumina does its best to display it.
- Any file that is text opens in the code editor as plain text, with syntax colours when
  the extension is one CodeMirror knows. No formatting and no error checking.
- A file that is not text (image, archive, executable) shows a "Lumina can't display this
  file" panel with a "Reveal in Finder/Explorer" button. Nothing is loaded into an editor.
- UTF-16 files that start with a byte-order mark (common from Windows tools) open and save
  normally in their own encoding.
- Any other text file that is not valid UTF-8 (typically Windows-1252, such as Excel's
  default CSV export with accented characters) is displayed using Windows-1252 and opens
  read-only with a notice, because Lumina cannot be sure how to write it back.
- These guards apply to Markdown and `.txt` as well. Today a non-UTF-8 Markdown file is
  silently corrupted on save.

### Shared behaviour

- Auto-save, the unsaved-changes prompt, the recent-files sidebar (including search
  snippets) and Open With work for every type exactly as they do for Markdown.
- Dropping a file onto the window opens it. The README already promises this, but it was
  never built: today only images dropped on the editor do anything. A dropped image is
  inserted when a Markdown document is open (as now) and ignored otherwise; any other
  dropped file is opened through the same path as File → Open.
- If a file has changed on disk since Lumina loaded or last saved it (a log still being
  written, a config edited elsewhere), Lumina does not overwrite it. With no unsaved edits
  it reloads the file quietly the next time the window gains focus. With unsaved edits, the
  save is held and the user is asked: Overwrite, Reload from disk, or Cancel. This applies
  to every file type.
- The Markdown toolbar controls, the outline panel, Focus Mode and export (PDF / HTML /
  Word) apply to Markdown only and are hidden or disabled for other types. The command
  palette lists only the commands that apply to the open file.
- Toolbar for code files: Open, Save, and for JSON/XML a "Format" button. For CSV: Open,
  Save, add row, add column, View as text.
- Status bar: line and column for code files, plus the error count for JSON/XML;
  rows × columns for CSV.
- Light and dark themes apply to both new views, using the existing `--lm-*` colours.
- Spell-check is off in the code editor and the table.
- Files above 50 MB ask for confirmation before opening.
- File → New still creates a Markdown document. Save As offers the current file's own type
  first.

## Goals

1. Any text file a user is likely to double-click opens and is readable.
2. JSON and XML are always shown and saved pretty-printed, with errors pointed out.
3. CSV is editable as a table without a spreadsheet's risks.
4. Saving never damages a file.

## Non-goals

- Schema validation (JSON Schema, XSD, DTD). Only well-formedness is checked.
- JSON with comments or trailing commas (`.jsonc`, JSON5). These show as errors in a `.json`
  file.
- Excel files, multi-sheet anything, formulas.
- Converting between formats.
- Editing binary files.
- Tabs or multiple windows.

## Anti-goals

These would make the feature a failure even if it "works":

- Opening a file and having it silently rewritten on disk.
- Formatting or a CSV round-trip changing data: a number, a key order, a leading zero, a
  cell that was not touched.
- Markdown editing getting slower to start or behaving differently.
- Lumina taking over as the default app for `.json`, `.csv` etc. on install.

## How it is built

The choices here are Claude's, not Micah's, except where noted. The codebase is Electron +
React + TipTap + Zustand; build on what is there.

### Three views, chosen by file type

| View  | Engine                     | File types                                  |
|-------|----------------------------|---------------------------------------------|
| Rich  | TipTap (existing)          | `md`, `markdown`, `txt`                     |
| Code  | CodeMirror 6 (new)         | `json`, `xml`, and any other text file      |
| Table | Custom React grid (new)    | `csv`, `tsv`                                |

`FileType` in `src/renderer/src/types/file.ts` grows from `'md' | 'txt'` to include
`'json' | 'xml' | 'csv' | 'text'`. `detectFileType` maps by extension; unknown extensions
and extension-less files become `'text'`. Known XML-family extensions (`xml`, `svg`,
`xsd`, `xsl`, `plist`, `rss`, `atom`) map to `'xml'`. `tsv` maps to `'csv'` with a tab
separator.

`.txt` stays in the Rich view, as today.

### Decoupling file handling from TipTap

Today `useFile` reads and writes the TipTap editor directly. Introduce a small
"document surface" contract that each view implements, and have `useFile` talk to whichever
surface is active:

- `load(raw: string, path: string | null): void`
- `getContent(): string` — the text to write to disk
- `snapshot(): unknown` and `isUnchangedSince(snapshot): boolean` — used by save to avoid
  marking a document clean when the user typed during the write (see `writeCurrentFile`)
- `focus(): void`

Each surface calls `markDirty(true)` on user edits, as TipTap's `onUpdate` does now.
Loading must leave the document clean. `EditorPane` renders the surface for the current
file type; the TipTap instance stays mounted so switching back to Markdown is instant.

### Reading and writing files (main process)

- Read as bytes, not as a UTF-8 string. Sniff the first 8 KB: a NUL byte means binary.
  Decode with a fatal UTF-8 decoder; failure means "not UTF-8" (read-only).
- A UTF-16 LE/BE byte-order mark is checked before the NUL sniff and selects that encoding.
  Text that fails UTF-8 decoding is decoded as Windows-1252 for display and marked
  read-only.
- `OpenFileResult` gains `kind: 'text' | 'binary'`, `readOnly`, `encoding`, `hasBom`, `eol`
  (`'\n' | '\r\n'`), `size` and `mtimeMs`. Saves pass the encoding, BOM and line ending
  back so the file is written as it was found. For the Rich view the BOM and encoding are
  restored too; its line-ending behaviour stays as it is today.
- `FILE_SAVE` takes the `mtimeMs` the renderer last saw and refuses to write if the file on
  disk is newer, returning a conflict result; it returns the new `mtimeMs` on success. No
  file watching: the check happens on save and on window focus.
- The two copies of the Open dialog (File menu in `menu.ts`, toolbar in `fileHandlers.ts`)
  become one shared function, with filters: All Supported, Markdown, Data (JSON, XML, CSV),
  All Files.
- `findFileArg` in `src/main/pendingOpen.ts` accepts any existing file path rather than a
  fixed extension list.

### Code view

- New packages (plus `@tanstack/react-virtual` for the table): `codemirror`, `@codemirror/lang-json`, `@codemirror/lang-xml`,
  `@codemirror/lint`, `@codemirror/search`, `@codemirror/language-data` (lazy language
  loading for other extensions).
- JSON formatting: `jsonc-parser`'s `format`, which edits whitespace only and so cannot
  alter values. Do not use `JSON.parse` + `JSON.stringify`: it reorders integer-like keys,
  rewrites numbers and loses precision.
- JSON errors: `jsonParseLinter` from `@codemirror/lang-json`.
- XML errors: must report unclosed and mismatched tags with a line and column. Suggested:
  walk the Lezer XML syntax tree for error nodes and mismatched close tags, which reports
  every problem rather than only the first. The builder may choose another approach that
  meets the requirement.
- XML formatting: whitespace between tags only. An element that contains any non-whitespace
  text keeps its content exactly as is. Preserve the XML declaration, comments, CDATA,
  processing instructions, attribute order and quoting, and honour `xml:space="preserve"`.
  Library or hand-written is the builder's choice.
- Format-on-open: if the document is valid and the formatted text differs from the file,
  show the formatted text and leave the document clean. Format-on-save: if valid, format,
  then write.
- Linting is debounced. Above 5 MB, linting and formatting are skipped and the status bar
  says so.
- Cmd/Ctrl+F opens CodeMirror's search panel, styled to match the existing Find & Replace
  panel.
- Right-click shows a small menu: Cut, Copy, Paste, Select All.

### Table view

- A small hand-written CSV tokenizer (RFC 4180 quoting, embedded newlines) rather than a
  library, because each row must keep its original raw text. Separator detection: `.tsv`
  is tab; otherwise the candidate (`,` `;` tab) that gives the most consistent column count
  over the first 20 rows.
- Model: rows of `{ cells: string[], raw: string | null }` plus `{ delimiter, eol, encoding,
  hasBom, finalNewline }`. `raw` is the row's original text and is written back verbatim;
  editing a cell in a row, or adding/removing a column, sets that row's `raw` to null and it
  is then serialised from `cells` with minimal quoting. Sorting moves rows without touching
  `raw`.
- Rows shorter than the widest row are padded with empty cells for display only; an
  untouched ragged row is still written back verbatim.
- Rendering is windowed (`@tanstack/react-virtual`) so only visible rows are in the DOM.
  Target: a 50,000-row file scrolls smoothly.
- Undo/redo is a simple history stack of operations owned by the table view.
- Cmd/Ctrl+F offers find (next / previous, highlights the cell). Replace is available by
  switching to "View as text".
- "View as text" serialises the table, loads the Code surface with the same file, and
  re-parses when switching back. If the text no longer parses as a table, stay in text view
  and say why.

### Bundle size and startup

CodeMirror, papaparse and the two new views load with dynamic `import()` the first time a
non-Markdown file is opened. Markdown start-up time must not regress.

### File associations

`build.fileAssociations` in `package.json` adds `json`, `xml`, `csv`, `tsv`, `log`, `yaml`,
`yml`, `ini`, `toml`, `conf`. On macOS each new entry uses `"rank": "Alternate"` so Lumina
appears under Open With but does not become the default. On Windows the installer must not
claim the default either (electron-builder's NSIS registers under OpenWithProgids; verify).

### The web demo build

`npm run build:web` (with `web-api-mock.ts`) must keep building. The mock gains whatever
new API fields are added.

## Order of work

Each step leaves the app releasable.

1. Plumbing: file types, document-surface contract, byte-level reading with binary and
   encoding guards, changed-on-disk check, drop-to-open, shared Open dialog, plain-text
   Code view. After this, `.log` and other
   text files open.
2. JSON: colours, formatting on open and save, error flagging.
3. XML: the same.
4. CSV table view.
5. File associations, README, CHANGELOG, welcome document, release v1.7.0 (macOS and
   Windows installers).

## Testing

- Unit tests (Vitest, as now) for: type detection; binary and encoding sniffing; JSON
  formatting leaves values untouched (large integers, `1.0`, duplicate keys, key order,
  unicode escapes); XML formatting leaves mixed content, CDATA and comments untouched;
  CSV parse → serialise is byte-identical for an unedited file across separators, quoting
  styles (including mixed), ragged rows, line endings, BOM and missing final newline;
  editing one cell changes only that row's bytes; sort and structural edits;
  the save-conflict check; UTF-16 round-trip.
- In-app check on macOS through the DevTools protocol for each type: open, edit, auto-save,
  reopen, and confirm the bytes on disk. Use a scratch folder, never the user's documents.
- Windows is built but not exercised by Claude; Micah checks it before release.

## Left to the builder

- Component and file layout, naming, and the exact shape of the document-surface contract.
- Visual details of the code and table views, within the existing design language.
- XML formatter and linter implementation, within the constraints above.
- Whether table undo stores snapshots or operations.
