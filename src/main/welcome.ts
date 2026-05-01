export const WELCOME_CONTENT = `# Welcome to Lumina ✦

Lumina is a **WYSIWYG Markdown editor** — what you type is what you get, and every document is a plain \`.md\` file you can open anywhere. This document is your welcome guide *and* a live demo of everything Markdown can do.

---

## Getting Started

### Opening & Saving Files

- **⌘O** (Mac) / **Ctrl+O** (Windows) — open any \`.md\` file
- **⌘S** / **Ctrl+S** — save the current file
- **⌘Shift+S** / **Ctrl+Shift+S** — save as a new file
- The **Recent Files** panel on the left shows your last 20 documents

> **Tip:** Lumina registers itself as the default editor for \`.md\` files — double-click any Markdown file in Finder or Explorer to open it here.

### Formatting Shortcuts

| Format | Mac | Windows |
| --- | --- | --- |
| Bold | ⌘B | Ctrl+B |
| Italic | ⌘I | Ctrl+I |
| Link | ⌘K | Ctrl+K |
| Undo | ⌘Z | Ctrl+Z |
| Redo | ⌘⇧Z | Ctrl+Y |

---

## Writing in Markdown

Lumina auto-converts Markdown syntax as you type — no need to learn commands, but the shortcuts are always there if you want them.

### Headings

Start a line with \`#\` and a space to create a heading. Keep adding \`#\` for smaller headings:

# Heading 1
## Heading 2
### Heading 3
#### Heading 4

### Text Formatting

You can make text **bold**, *italic*, or ***both at once***. ~~Strikethrough~~ works too. Inline \`code\` is wrapped in backticks.

Try selecting any of the text above and using the floating toolbar that appears — or right-click for more options.

### Links

Links can point to [external websites](https://daringfireball.net/projects/markdown/) or jump to a [heading within this document](#tables). Press **⌘K** with text selected to add or edit a link.

---

## Lists

### Bullet Lists

Type \`-\` or \`*\` followed by a space to start a bullet list:

- Apples
- Oranges
- Bananas
  - Cavendish
  - Plantain

### Numbered Lists

Type \`1.\` followed by a space — the numbers increment automatically:

1. Open a file with ⌘O
2. Write something great
3. Save with ⌘S

### Task Lists

Type \`- [ ]\` for an unchecked task, \`- [x]\` for a checked one:

- [x] Install Lumina
- [x] Open this welcome file
- [ ] Write your first note
- [ ] Try the Table Wizard in the toolbar

---

## Blockquotes

Start a line with \`>\` to create a blockquote — great for callouts, tips, and cited text:

> "The best writing tool is the one that gets out of your way."

Blockquotes can be nested:

> This is the outer quote.
> > This is a nested quote inside it.

---

## Code

Inline code uses backticks: \`const greeting = "hello"\`

Code blocks use triple backticks. You can specify a language for syntax highlighting:

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`
}

console.log(greet("World"))
\`\`\`

\`\`\`python
def greet(name):
    return f"Hello, {name}!"

print(greet("World"))
\`\`\`

---

## Tables

Click the **Table** button in the toolbar to open the Table Wizard — hover over the grid to choose dimensions, then click to insert. Right-click inside any table to add or remove rows and columns.

| Feature | Supported | Notes |
| --- | --- | --- |
| WYSIWYG editing | ✓ | No raw Markdown view needed |
| Auto-save format | ✓ | Standard \`.md\` — opens anywhere |
| Image drag & drop | ✓ | Auto-copied to \`./images/\` folder |
| Tables | ✓ | Resizable columns |
| Task lists | ✓ | Click checkboxes to toggle |
| Dark mode | ✓ | Follows OS or set manually |

---

## Images

Drag any image file from Finder or Explorer directly into the editor. Lumina automatically copies it into an \`images/\` folder next to your document and inserts the correct relative path — so your Markdown file stays portable.

You can also click the **Image** button in the toolbar to pick a file.

---

## The Right-Click Menu

Right-click anywhere in the editor for a context-sensitive menu:

- **On selected text** — bold, italic, strikethrough, inline code, add link, change format
- **On a link** — open in browser, edit, or remove
- **Inside a table** — add/delete rows and columns
- **Elsewhere** — insert a list, table, image, or change the block format

The **Format** submenu lets you change any paragraph to a heading (or back) without touching the toolbar.

---

## Dark Mode

Click the **⚙** settings icon in the toolbar to switch between **System** (follows your OS), **Light**, and **Dark** mode. Your preference is saved automatically.

---

*This file lives at \`~/Documents/Welcome to Lumina.md\` — feel free to edit or delete it. Happy writing!*
`
