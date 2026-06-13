# Changelog

All notable changes to Lumina are documented here.

---

## v1.6.6

- Mermaid diagrams in code blocks now render inline — fenced ```` ```mermaid ```` blocks show the flowchart, sequence diagram, etc., with a Source/Preview toggle to view or edit the syntax

## v1.6.5

- Unsaved draft / scratchpad — switching away from an unsaved new file now preserves content in memory; a dashed "Unsaved draft" entry appears in the sidebar to return to it
- Help → About Lumina opens the native about panel with version and GitHub link
- Added Help → View on GitHub and Help → Report an Issue
- Removed all "EasyMarkEditor" branding references

## v1.6.4

- Export as Word (.docx) added to the Export menu and Command Palette

## v1.6.3

- Sidebar now fills the full window height
- Right-click context menu no longer renders behind file rows or at wrong coordinates (fixed via React portal)
- Rename added to right-click context menu — inline edit, Enter to confirm, Escape to cancel
- Fixed File → Save As… silently doing nothing (was firing regular Save instead)
- Fixed build error from duplicate variable name in image handler

## v1.6.2

- Fixed duplicate `normalized` variable causing esbuild error on production build

## v1.6.1

- Fixed File → Save As… menu item sending the wrong IPC event (acted as Save instead of opening dialog)

## v1.6.0

- Export as HTML — self-contained styled document via OS save dialog
- Export as PDF — print-quality via Electron's print engine
- Clipboard image paste — Cmd/Ctrl+V with an image saves to `images/` and inserts inline
- Command Palette (Cmd+Shift+P) — fuzzy-search all commands and recent files
- Outline Panel (Cmd+Shift+O) — live heading tree with smooth-scroll navigation
- Focus Mode (Cmd+Shift+Enter) — narrow canvas, hidden chrome
- Toast notifications for export feedback

## v1.5.0

- Outline Panel with real-time heading list
- Focus Mode for distraction-free writing
- Keyboard shortcut for Command Palette changed from Cmd+P to Cmd+Shift+P

## v1.4.0

- Command Palette (Cmd+Shift+P) with fuzzy search across all editor actions and recent files

## v1.3.6

- Local image loading via custom `media://` protocol (fixes ERR_UNEXPECTED on file:// URLs)
- Inline badge/image rows render correctly on a single line
- `align="center"` on paragraphs and headings now centers content correctly
- Drag-and-drop images copy to `images/` folder and insert as relative Markdown paths

## v1.3.0 — v1.3.5

- Find & Replace panel (Cmd+F) with match counter and step-through
- Auto-save 2 seconds after last edit with status bar indicator
- Right-click recent files: Pin, Reveal in Finder/Explorer, Remove
- Sidebar height and context menu portal fixes

## v1.2.0

- Table Wizard hover-grid in toolbar
- Resizable table columns
- Right-click table actions (add/remove rows and columns)

## v1.1.0

- Plain text (.txt) file support — open, edit, save without Markdown injection
- Auto-detect bullet and numbered lists in .txt files
- Toolbar hides Markdown-only controls in plain text mode
- `~/Documents/Lumina/` default folder created on first launch
- Welcome guide on first launch
- Redesigned toolbar with Format dropdown, Undo/Redo, real-time cursor sync
- Code blocks with language picker and syntax highlighting (25 languages)
- Sidebar content search with text excerpts
- Status bar with line/column, encoding, saved indicator
- Auto-reopen most recent file on launch

## v1.0.0

- Initial release
- WYSIWYG Markdown editing with TipTap / ProseMirror
- Auto Markdown input rules (# → H1, ** → bold, - → list, etc.)
- Dark / Light / System theme
- Recent files sidebar
- Open With support (macOS and Windows)
- Unsaved changes guard on close
