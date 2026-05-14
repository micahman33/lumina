<p align="center">
  <img src="build/icon.png" width="96" alt="Lumina icon" />
</p>

<h1 align="center">Lumina</h1>

<p align="center"><em>A lightweight, elegant editor for the documents you actually want to read.</em></p>

<p align="center">
  <a href="https://luminaeditor.com"><strong>luminaeditor.com</strong></a>
</p>

<p align="center">
  <a href="https://github.com/micahman33/lumina/releases/latest">
    <img src="https://img.shields.io/github/v/release/micahman33/lumina?style=flat-square&color=5b6ee8" alt="Latest Release" />
  </a>
  <a href="https://github.com/micahman33/lumina/releases/latest">
    <img src="https://img.shields.io/github/downloads/micahman33/lumina/total?style=flat-square&color=5b6ee8" alt="Downloads" />
  </a>
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey?style=flat-square" alt="Platform" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License" />
</p>

---

<p align="center">
  <img src="assets/screenshot.png" width="860" alt="Lumina editor screenshot" />
</p>

---

**Just write.**

Lumina is a WYSIWYG editor for Markdown and plain text files on macOS and Windows. Format what you mean — the Markdown is written for you, behind the glass.

Open any `.md` or `.txt` file and it just works. The cursor sits where you see it. Headings look like headings.

*The best tool is the one you forget you're using.*

---

## Download

| Platform | Installer | Notes |
|---|---|---|
| macOS (Apple Silicon) | [Lumina-1.6.4-arm64.dmg](https://github.com/micahman33/lumina/releases/download/v1.6.4/Lumina-1.6.4-arm64.dmg) | M1/M2/M3/M4 Macs |
| Windows (x64) | [Lumina Setup 1.6.4.exe](https://github.com/micahman33/lumina/releases/download/v1.6.4/Lumina.Setup.1.6.4.exe) | Windows 10/11 |

### macOS Installation

1. Download the `.dmg` file
2. Open it and drag **Lumina** into your `/Applications` folder
3. On first launch, if macOS shows an "unverified developer" warning, right-click the app and choose **Open**

> Lumina is not currently notarized with Apple. This only affects the first launch.

### Windows Installation

1. Download and run `Lumina.Setup.1.6.4.exe`
2. Follow the installer — Lumina will be added to your Start Menu and Desktop

---

## What's New

### v1.6.3

**Bug Fixes**
- Sidebar now fills the full window height correctly
- Right-click context menu rendered via portal — no longer clipped behind file rows or offset from click position
- **Rename** added to the right-click context menu — click to edit the filename inline, press Enter to confirm or Escape to cancel; renames on disk and updates the title bar if the file is open
- Fixed **File → Save As…** doing nothing (was incorrectly firing the regular Save action)
- Fixed build error from duplicate variable name in image handler

---

### v1.6.0

**Export**
- **File → Export → HTML** — saves a self-contained, styled HTML document via the OS save dialog
- **File → Export → PDF** — writes a print-quality PDF via Electron's print engine

**Clipboard Image Paste**
- Paste an image (Cmd+V / Ctrl+V) directly into the editor — Lumina saves it to the document's `images/` folder and inserts it inline

**Command Palette** (`⌘⇧P` / `Ctrl+Shift+P`)
- Fuzzy-search across all editor commands, formatting options, and recent files from one keyboard-driven panel

**Outline Panel** (`⌘⇧O` / `Ctrl+Shift+O`)
- Live heading tree in a right sidebar; click any heading to smooth-scroll to it

**Focus Mode** (`⌘⇧↩` / `Ctrl+Shift+Enter`)
- Collapses the toolbar and sidebar; narrows the canvas to 65 characters for distraction-free writing

---

### v1.4.0 — v1.5.0

**Find & Replace** (`⌘F` / `Ctrl+F`)
- Full find-and-replace panel with match counter and step-through navigation

**Auto-save**
- Changes are silently saved 2 seconds after you stop typing — the status bar shows a dot indicator

**Sidebar improvements**
- Pin files to keep them at the top of the list
- Right-click → Reveal in Finder / Show in Explorer
- Right-click → Remove from recents

---

### v1.1.0

**Plain Text (.txt) Support**
- Open, edit, and save `.txt` files natively — no Markdown injection, no hidden formatting
- Lumina detects numbered lists (`1. item`) and bullet lists (`- item`) in plain text files and renders them beautifully, while keeping the file on disk as clean plain text
- Toolbar automatically hides Markdown-only controls (headings, code blocks, tables) when editing a plain text file
- Status bar shows "Plain Text" vs "Markdown" based on the active file
- Floating selection toolbar is suppressed in plain text mode

**Lumina Documents Folder**
- All new files default to `~/Documents/Lumina/` — no more lost files in random directories
- Welcome guide now lives at `~/Documents/Lumina/Welcome to Lumina.md` and is created automatically on first launch
- File open/save dialogs open to the Lumina folder by default

**Save As — Format-Aware**
- The Save As dialog now shows the filename *without* an extension, so macOS automatically appends the correct extension (`.md` or `.txt`) based on the Format dropdown you choose — no more `test.md.txt` confusion

**Default App Setup**
- Settings → Default App section with step-by-step instructions for making Lumina your default `.txt` editor on macOS (via Finder Get Info) and Windows

**UI & Design**
- Redesigned toolbar with logical clusters, Undo/Redo buttons, and a Format dropdown (Paragraph, H1–H4) that reflects whatever your cursor is on
- Toolbar formatting buttons (Bold, Italic, lists, blocks) now stay in sync with cursor position in real time
- Refined typography: Inter Tight font, wider content column, indigo accent color throughout, improved heading scale
- Code blocks are now theme-aware — light gray background in light mode, dark in dark mode
- Status bar shows live line/column position, file encoding, and a color-coded saved/unsaved indicator

**Code Blocks**
- Language picker pill in the top-right corner of every code block — click to choose from 25 languages
- Full syntax highlighting powered by lowlight/highlight.js (GitHub-style light theme, GitHub Dark in dark mode)
- Plain Text mode correctly disables all highlighting (no more auto-detection coloring)

**Sidebar**
- Search now searches document *content*, not just filenames — shows a text excerpt around the match
- Recent files list no longer reorders while the app is open; order only updates on next launch
- New File button, relative timestamps ("2 hours ago"), active file indicator, and current folder footer

**File Handling**
- On launch, Lumina automatically reopens your most recently edited file
- If no previous files exist, the welcome guide opens instead
- Opening a file from Finder/Explorer always takes priority

**Bug Fixes**
- External images in Markdown files (shields.io badges, hosted diagrams) now render correctly
- Word count now reflects the correct count immediately on file open (was showing 0 until first edit)
- Fixed Windows title bar showing full file path instead of filename
- Sidebar search index is populated on first open, so files are searchable immediately
- Fixed crash when opening certain `.txt` files via double-click while Lumina was already running

---

## Features

### Editor

- **WYSIWYG editing** — formatted text as you type, no Markdown syntax cluttering your view
- **Auto Markdown input rules** — type `# ` for Heading 1, `**` for bold, `- ` for bullet lists, `> ` for blockquotes, ` ``` ` for code blocks, and more
- **Floating selection toolbar** — appears above any selected text with quick-access formatting buttons
- **Right-click context menu** — context-sensitive actions depending on what you click: selected text, links, tables, or blank space

### Formatting

| Element | Keyboard Shortcut | Toolbar |
|---|---|---|
| Bold | `⌘B` / `Ctrl+B` | ✓ |
| Italic | `⌘I` / `Ctrl+I` | ✓ |
| Strikethrough | — | ✓ |
| Inline Code | — | ✓ |
| Link | `⌘K` / `Ctrl+K` | ✓ |
| Heading 1–4 | `#` + Space | ✓ Dropdown |
| Bullet List | `- ` + Space | ✓ |
| Numbered List | `1.` + Space | ✓ |
| Task List | `- [ ]` + Space | ✓ |
| Blockquote | `> ` + Space | ✓ |
| Code Block | ` ``` ` + Enter | ✓ |

### Tables

- **Table Wizard** — hover over a grid in the toolbar to choose any size table, click to insert
- **Resizable columns** — drag column borders to resize
- **Right-click table actions** — add row above/below, add column before/after, delete row, delete column, delete table

### Images

- **Drag and drop** — drag any image from Finder or Explorer directly into the editor
- **Auto-organized** — images are automatically copied into an `images/` folder next to your document
- **Portable paths** — Markdown uses relative paths, so the document stays self-contained and moveable
- **Toolbar insert** — click the Image button to pick a file via the system dialog

### Links

- **Insert / edit** — press `⌘K` / `Ctrl+K` with text selected, or use the toolbar button
- **Auto-protocol** — `https://` is prepended automatically if you omit it
- **Open in browser** — `Cmd+Click` or right-click → Open in browser
- **Anchor links** — links to `#headings` scroll to the correct section within the document

### File Management

- **Open** — `⌘O` / `Ctrl+O`, File menu, or drag a `.md` file onto the app
- **Save** — `⌘S` / `Ctrl+S`
- **Save As** — `⌘⇧S` / `Ctrl+Shift+S`
- **Recent Files sidebar** — quick-access panel showing your last 20 documents
- **Open With** — set Lumina as your default `.md` editor; double-clicking any Markdown file opens it directly
- **Unsaved changes guard** — closing with unsaved work prompts Save / Don't Save / Cancel

### Appearance

- **Dark mode** — full dark theme support
- **Light mode** — clean, minimal light theme
- **System mode** — automatically follows your OS appearance setting
- **Persistent preference** — your choice is saved across sessions

---

## Keyboard Shortcuts

| Action | macOS | Windows |
|---|---|---|
| New file | `⌘N` | `Ctrl+N` |
| Open file | `⌘O` | `Ctrl+O` |
| Save | `⌘S` | `Ctrl+S` |
| Save As | `⌘⇧S` | `Ctrl+Shift+S` |
| Bold | `⌘B` | `Ctrl+B` |
| Italic | `⌘I` | `Ctrl+I` |
| Insert / edit link | `⌘K` | `Ctrl+K` |
| Undo | `⌘Z` | `Ctrl+Z` |
| Redo | `⌘⇧Z` | `Ctrl+Y` |
| Toggle sidebar | Click sidebar icon | Click sidebar icon |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | [Electron 33](https://electronjs.org) |
| Build tool | [electron-vite 5](https://electron-vite.org) |
| UI framework | [React 18](https://react.dev) + TypeScript |
| Editor engine | [TipTap v3](https://tiptap.dev) (ProseMirror) |
| Syntax highlighting | [lowlight](https://github.com/wooorm/lowlight) (highlight.js tokens) |
| Markdown I/O | [tiptap-markdown](https://github.com/aguingand/tiptap-markdown) |
| Styling | [Tailwind CSS v3](https://tailwindcss.com) + [@tailwindcss/typography](https://tailwindcss.com/docs/typography-plugin) |
| State management | [Zustand 5](https://zustand-demo.pmnd.rs) |
| Settings persistence | [electron-store v8](https://github.com/sindresorhus/electron-store) |
| UI primitives | [Radix UI](https://www.radix-ui.com) (Popover, Dropdown, Tooltip) |
| Icons | [Lucide React](https://lucide.dev) |

---

## Project Structure

```
lumina/
├── build/                    # App icons (icns, ico, png, svg)
├── src/
│   ├── main/                 # Electron main process
│   │   ├── index.ts          # BrowserWindow, open-with, close guard
│   │   ├── menu.ts           # Native app menu
│   │   ├── store.ts          # electron-store (settings, recent files)
│   │   ├── welcome.ts        # First-launch welcome document content
│   │   ├── windowState.ts    # Persist/restore window size & position
│   │   └── ipc/
│   │       ├── fileHandlers.ts   # File open/save/recent IPC handlers
│   │       ├── imageHandlers.ts  # Image copy + media:// protocol
│   │       └── index.ts          # Registers all handlers
│   ├── preload/
│   │   └── index.ts          # contextBridge → window.api surface
│   └── renderer/
│       └── src/
│           ├── App.tsx
│           ├── components/
│           │   ├── editor/
│           │   │   ├── Toolbar.tsx           # Formatting toolbar
│           │   │   ├── EditorCore.tsx        # Editor wrapper + drop handling
│           │   │   ├── EditorPane.tsx        # Toolbar + Editor + StatusBar
│           │   │   ├── BubbleToolbar.tsx     # Floating selection toolbar
│           │   │   ├── EditorContextMenu.tsx # Right-click context menu
│           │   │   ├── LinkDialog.tsx        # Link insert/edit modal
│           │   │   └── StatusBar.tsx         # Word count + file path
│           │   ├── layout/
│           │   │   ├── AppShell.tsx          # Root layout
│           │   │   ├── Sidebar.tsx           # Recent files panel
│           │   │   └── TitleBar.tsx          # Custom macOS title bar
│           │   ├── table/
│           │   │   └── TableWizard.tsx       # Hover-grid table inserter
│           │   └── settings/
│           │       └── SettingsModal.tsx     # Theme toggle
│           ├── hooks/
│           │   ├── useEditor.ts             # TipTap instance + extensions
│           │   ├── useFile.ts               # File open/save/dirty state
│           │   ├── useRecentFiles.ts        # Recent files IPC bridge
│           │   └── useTheme.ts              # OS theme detection
│           ├── store/
│           │   └── appStore.ts             # Zustand global store
│           └── styles/
│               └── globals.css             # Tailwind + TipTap prose overrides
├── package.json
├── electron.vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## Development

### Prerequisites

- [Node.js](https://nodejs.org) 18 or later
- npm 9 or later

### Getting Started

```bash
# Clone the repository
git clone https://github.com/micahman33/lumina.git
cd lumina

# Install dependencies
npm install

# Start in development mode (with HMR)
npm run dev
```

### Building

```bash
# Compile TypeScript + Vite (output to out/)
npm run build

# Package for macOS (produces DMG in dist/)
npm run build:mac

# Package for Windows (produces NSIS installer in dist/)
npm run build:win
```

> **Note:** macOS builds must be run on macOS. Windows builds must be run on Windows (or a Windows CI runner).

---

## How Images Work

When you drop an image (or use the toolbar to insert one), Lumina:

1. Copies the image file into an `images/` subfolder next to your document
2. Deduplicates filenames automatically (`photo.png`, `photo_1.png`, `photo_2.png`, …)
3. Inserts a relative Markdown image reference: `![filename](images/filename.png)`
4. Serves local images via a `media://` custom protocol so they render correctly in the editor

This means your document folder is fully self-contained — move it anywhere and all images come with it.

---

## License

MIT © Micah Smith
