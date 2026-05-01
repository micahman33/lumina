export const WELCOME_CONTENT = `# Welcome to Lumina ✦

Lumina is a **WYSIWYG Markdown editor** — what you type is what you get, and every document is a plain \`.md\` file you can open anywhere.

Every feature in this document can be created two ways: **by typing Markdown syntax directly**, or **through the UI** — toolbar buttons, keyboard shortcuts, and the right-click menu. Both paths produce identical output. Use whichever feels natural.

---

## Opening & Saving Files

**From the UI:** Use the **Open** (folder icon) and **Save** (disk icon) buttons in the toolbar, or the File menu.

**Keyboard shortcuts:**

| Action | Mac | Windows |
| --- | --- | --- |
| Open file | ⌘O | Ctrl+O |
| Save | ⌘S | Ctrl+S |
| Save As | ⌘⇧S | Ctrl+Shift+S |

> **Tip:** Lumina registers itself as the default editor for \`.md\` files. Double-click any Markdown file in Finder or Explorer to open it here directly.

The **Recent Files** panel on the left shows your last 20 documents. Click the panel icon in the toolbar to toggle it.

---

## Headings

**By typing:** Start a line with \`#\` and a space. More \`#\` signs = smaller heading.

**From the UI:** Use the **P / H1 / H2 …** dropdown in the toolbar, or right-click and choose **Format**.

# Heading 1
## Heading 2
### Heading 3
#### Heading 4

---

## Text Formatting

**By typing:** Wrap text in symbols — \`**bold**\`, \`*italic*\`, \`~~strikethrough~~\`, \`\`inline code\`\`

**From the UI:** Select any text, then:
- Use the **floating toolbar** that appears just above your selection
- Or use the **toolbar buttons** at the top (B, I, S, \`<>\`)
- Or right-click → **Format selection**
- Or use keyboard shortcuts: **⌘B** bold, **⌘I** italic

You can make text **bold**, *italic*, or ***bold and italic at once***. ~~Strikethrough~~ works too. Inline \`code\` is formatted with backticks.

---

## Links

**By typing:** \`[link text](https://example.com)\`

**From the UI:** Select text, then press **⌘K** (Mac) / **Ctrl+K** (Windows), or click the **link icon** in the toolbar. A dialog lets you paste the URL and confirm.

**To edit or remove a link:** Right-click it → Edit link or Remove link. You can also open it in your browser from the right-click menu.

Links can point to [external websites](https://daringfireball.net/projects/markdown/) or jump to a [heading within this document](#tables).

---

## Lists

### Bullet Lists

**By typing:** Start a line with \`-\` or \`*\` followed by a space.

**From the UI:** Click the **bullet list icon** in the toolbar, or right-click → Insert → Bullet list.

- Apples
- Oranges
- Bananas
  - Cavendish
  - Plantain

### Numbered Lists

**By typing:** Start a line with \`1.\` followed by a space — numbers increment automatically.

**From the UI:** Click the **numbered list icon** in the toolbar.

1. Open a file with ⌘O
2. Write something great
3. Save with ⌘S

### Task Lists

**By typing:** \`- [ ]\` for unchecked, \`- [x]\` for checked.

**From the UI:** Click the **checkbox list icon** in the toolbar. Click any checkbox to toggle it.

- [x] Install Lumina
- [x] Open this welcome file
- [ ] Write your first note
- [ ] Try inserting a table

---

## Blockquotes

**By typing:** Start a line with \`>\` followed by a space.

**From the UI:** Click the **quote icon** in the toolbar, or right-click → Format → (select Blockquote from the right-click Format submenu — note: Blockquote is in the toolbar dropdown, not the right-click Format submenu which covers headings).

> "The best writing tool is the one that gets out of your way."

Blockquotes can be nested:

> Outer quote
> > Nested quote inside it

---

## Code

### Inline Code

**By typing:** Wrap text in single backticks: \`code\`

**From the UI:** Select text, then click the **\`<>\`** inline code button in the toolbar or floating toolbar.

### Code Blocks

**By typing:** Type three backticks (\`\`\`) and press Enter. Optionally add the language name right after the backticks: \`\`\`javascript

**From the UI:** Click the **code block icon** (double brackets) in the toolbar.

**Setting the language:** Once a code block exists, click the **language pill** in the top-right corner of the block to open a language picker. The language label also appears on the pill when viewing the document.

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

**By typing:** Use pipe characters: \`| Col 1 | Col 2 |\` with a separator row \`| --- | --- |\`

**From the UI:** Click the **table icon** in the toolbar to open the **Table Wizard** — hover over the grid to preview the size, then click to insert. Drag column borders to resize.

**Table actions:** Right-click inside any table to add/remove rows and columns, or delete the entire table.

| Feature | Keyboard | Toolbar | Right-click |
| --- | --- | --- | --- |
| Bold | ⌘B | ✓ | ✓ |
| Italic | ⌘I | ✓ | ✓ |
| Link | ⌘K | ✓ | ✓ |
| Heading | — | ✓ dropdown | ✓ Format |
| Lists | — | ✓ | ✓ Insert |
| Table | — | ✓ wizard | ✓ row/col |
| Image | — | ✓ | ✓ Insert |

---

## Images

**By typing:** \`![alt text](path/to/image.png)\`

**From the UI:**
- **Drag and drop** any image file from Finder or Explorer directly onto the editor
- Or click the **image icon** in the toolbar to pick a file via the system dialog

Either way, Lumina automatically copies the image into an \`images/\` folder next to your document and inserts a relative path — keeping your document fully self-contained and portable.

---

## The Right-Click Menu

Right-clicking anywhere in the editor opens a context-sensitive menu. What you see depends on where you click:

| Context | Actions available |
| --- | --- |
| **Selected text** | Bold, italic, strikethrough, code, link, Format submenu, cut/copy, clear formatting |
| **On a link** | Open in browser, edit link, remove link |
| **Inside a table** | Add/delete rows and columns, delete table |
| **Elsewhere** | Insert list, table, image; change block Format |

The **Format** submenu (Paragraph, H1–H4) in the right-click menu lets you change the block type of the current line without touching the toolbar.

---

## Dark Mode

**From the UI:** Click the **⚙** settings icon (far right of the toolbar) to choose between **System** (follows your OS), **Light**, or **Dark** mode. Your preference is saved automatically.

---

*This file lives at \`~/Documents/Welcome to Lumina.md\` — feel free to edit or delete it. Happy writing!*
`
