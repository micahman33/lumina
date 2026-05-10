/**
 * exportUtils.ts
 *
 * Pure utility functions for exporting editor content to HTML and PDF.
 */

// ── Export CSS ─────────────────────────────────────────────────────────────────

export const EXPORT_STYLES = `
  *, *::before, *::after { box-sizing: border-box; }

  body {
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 16px;
    line-height: 1.7;
    color: #1F1F23;
    background: #FFFFFF;
    margin: 0;
    padding: 2rem 1rem;
  }

  article.prose {
    max-width: 760px;
    margin: 0 auto;
    padding: 0 1rem;
  }

  h1, h2, h3, h4, h5, h6 {
    font-weight: 700;
    line-height: 1.2;
    margin-top: 1.75rem;
    margin-bottom: 0.5rem;
    color: #111111;
  }
  h1 { font-size: 2rem; letter-spacing: -0.5px; }
  h2 { font-size: 1.4rem; letter-spacing: -0.3px; font-weight: 600; }
  h3 { font-size: 1.15rem; font-weight: 600; }
  h4 { font-size: 1rem; font-weight: 600; }

  p {
    margin-top: 0;
    margin-bottom: 1rem;
  }

  a {
    color: #5B6CFF;
    text-decoration: none;
    font-weight: 500;
  }
  a:hover { text-decoration: underline; }

  strong { font-weight: 700; }
  em { font-style: italic; }
  del { text-decoration: line-through; color: #6B6B70; }

  code {
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
    font-size: 0.875em;
    padding: 1px 6px;
    border-radius: 4px;
    background: #F3F3F0;
    color: #1F1F23;
  }

  pre {
    background: #F3F3F0;
    border-radius: 8px;
    padding: 1rem 1.25rem;
    overflow-x: auto;
    margin: 1.25rem 0;
  }
  pre code {
    background: none;
    padding: 0;
    font-size: 0.875rem;
    border-radius: 0;
  }

  blockquote {
    border-left: 3px solid #5B6CFF;
    margin: 1.25rem 0;
    padding: 0.1rem 0 0.1rem 1.1rem;
    color: #6B6B70;
    font-style: italic;
  }

  hr {
    border: none;
    border-top: 1px solid #E8E6E0;
    margin: 2rem 0;
  }

  ul, ol {
    margin: 0.75rem 0 1rem;
    padding-left: 1.5rem;
  }
  li { margin-bottom: 0.25rem; }
  li > p { margin-bottom: 0.25rem; }

  /* Task list */
  ul[data-type="taskList"] {
    list-style: none;
    padding-left: 0;
  }
  ul[data-type="taskList"] li {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }
  ul[data-type="taskList"] li input[type="checkbox"] {
    flex-shrink: 0;
    accent-color: #5B6CFF;
  }

  table {
    border-collapse: collapse;
    width: 100%;
    margin: 1rem 0;
    font-size: 0.9rem;
  }
  th, td {
    border: 1px solid #D1D5DB;
    padding: 8px 12px;
    text-align: left;
    vertical-align: middle;
  }
  th {
    background: #F9FAFB;
    font-weight: 600;
  }
  tr:nth-child(even) td { background: #FAFAF7; }

  img {
    max-width: 100%;
    border-radius: 4px;
    height: auto;
  }
`

// ── Pure functions ─────────────────────────────────────────────────────────────

/**
 * Build a complete, self-contained HTML document string.
 */
export function buildHtmlExport(title: string, bodyHtml: string, styles: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtmlAttr(title)}</title>
  <style>
${styles}
  </style>
</head>
<body>
  <article class="prose">
    ${bodyHtml}
  </article>
</body>
</html>`
}

/**
 * Extract the document title from a file path (filename without extension),
 * or return "Untitled" if path is null.
 */
export function getExportTitle(filePath: string | null): string {
  if (!filePath) return 'Untitled'
  // Normalise Windows backslashes
  const normalized = filePath.replace(/\\/g, '/')
  const filename = normalized.split('/').pop() ?? ''
  if (!filename) return 'Untitled'
  // Strip only the last extension (handles "my.notes.md" → "my.notes")
  const dotIdx = filename.lastIndexOf('.')
  if (dotIdx <= 0) return filename  // no extension, or hidden file
  return filename.slice(0, dotIdx)
}

/** Escape a string for use inside an HTML attribute value. */
function escapeHtmlAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
