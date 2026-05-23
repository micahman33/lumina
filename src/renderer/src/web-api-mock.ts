/**
 * Browser-compatible stub for window.api (Electron IPC).
 * Used by the standalone web build embedded in the landing page.
 * All file operations are in-memory; dialogs are no-ops.
 */
import type { AppSettings, OpenFileResult, RecentFile } from './types/file'

const DEMO = [
  {
    path: '/demo/README.md',
    name: 'README.md',
    content: `# Welcome to Lumina

A lightweight, elegant editor for **Markdown** and TXT files.

Open any \`.md\` file and it just works — no configuration, no plugins, no friction.

> The best tool is the one you forget you're using.`,
  },
  {
    path: '/demo/ai-product-brief.md',
    name: 'ai-product-brief.md',
    content: `# AI Product Brief

## Overview

This document outlines the product direction for Lumina's upcoming AI writing features.

## Goals

- Reduce friction in everyday writing workflows
- Keep the interface **distraction-free** by default
- Native Markdown support throughout

## Non-goals

This is not a replacement for a full IDE. The focus is clear writing, not code.`,
  },
  {
    path: '/demo/design-review-notes.md',
    name: 'design-review-notes.md',
    content: `# Design Review Notes

## Typography

Inter Tight is working well for headings. Consider increasing line-height on body text for longer reading sessions.

## Color system

The indigo accent at \`#5B6CFF\` is strong and distinctive. Dark mode contrast passes WCAG AA.

## Feedback

> The sidebar feels too heavy. Can we reduce the visual weight of file list items?`,
  },
  {
    path: '/demo/todo-weekly-sprint.md',
    name: 'todo-weekly-sprint.md',
    content: `# Weekly Sprint

## To Do

- [ ] Finish onboarding flow
- [ ] Review accessibility audit
- [ ] Update changelog

## In Progress

- [ ] Landing page interactive demo

## Done

- [x] Dark mode polish
- [x] Windows installer signing`,
  },
  {
    path: '/demo/assignment-outline.md',
    name: 'assignment-outline.md',
    content: `# Assignment Outline

## Introduction

Brief overview of the topic and main argument.

## Section 1: Background

Context and historical perspective.

## Section 2: Analysis

Core argument with supporting evidence.

## Conclusion

Summary and next steps.`,
  },
  {
    path: '/demo/prompt-library.txt',
    name: 'prompt-library.txt',
    content: `Summarize the following in three bullet points:

Rewrite this in a more formal tone:

Generate five headline variations for:

Explain this concept as if I'm a beginner:

List pros and cons of:`,
  },
]

const fileStore = new Map<string, string>(DEMO.map((f) => [f.path, f.content]))

let recentFiles: RecentFile[] = DEMO.map((f, i) => ({
  path: f.path,
  name: f.name,
  lastOpened: new Date(Date.now() - i * 25 * 60 * 1000).toISOString(),
  snippet: f.content.slice(0, 200).replace(/[#*`>\-\[\]]/g, '').trim(),
}))

const noop = (): void => {}
const noopUnsub = (): (() => void) => () => {}

export const webApiMock = {
  // File open/save — no dialogs in web, use in-memory store
  openFile: (): Promise<OpenFileResult | null> => Promise.resolve(null),

  openFilePath: async (path: string): Promise<OpenFileResult | null> => {
    const content = fileStore.get(path)
    return content !== undefined ? { path, content } : null
  },

  saveFile: async (path: string, content: string): Promise<boolean> => {
    fileStore.set(path, content)
    return true
  },

  saveFileAs: (): Promise<null> => Promise.resolve(null),

  readInitialFile: async (): Promise<OpenFileResult | null> => ({
    path: DEMO[0].path,
    content: DEMO[0].content,
  }),

  // Recents — in-memory
  getRecentFiles: async (): Promise<RecentFile[]> => recentFiles,

  addRecentFile: async (path: string, snippet?: string): Promise<void> => {
    const name = path.split('/').pop() ?? path
    recentFiles = [
      { path, name, lastOpened: new Date().toISOString(), snippet },
      ...recentFiles.filter((f) => f.path !== path),
    ].slice(0, 20)
  },

  removeRecentFile: async (path: string): Promise<void> => {
    recentFiles = recentFiles.filter((f) => f.path !== path)
  },

  pinRecentFile: async (path: string): Promise<RecentFile[]> => {
    recentFiles = recentFiles.map((f) =>
      f.path === path ? { ...f, pinned: !f.pinned } : f,
    )
    return recentFiles
  },

  revealFile: (): Promise<void> => Promise.resolve(),

  renameFile: async (
    oldPath: string,
    newName: string,
  ): Promise<{ newPath: string } | null> => {
    const content = fileStore.get(oldPath)
    if (content === undefined) return null
    const dir = oldPath.split('/').slice(0, -1).join('/')
    const newPath = `${dir}/${newName}`
    fileStore.delete(oldPath)
    fileStore.set(newPath, content)
    recentFiles = recentFiles.map((f) =>
      f.path === oldPath ? { ...f, path: newPath, name: newName } : f,
    )
    return { newPath }
  },

  // Settings
  getSettings: async (): Promise<AppSettings> => ({
    theme: 'system',
    sidebarOpen: true,
  }),
  setSettings: async (): Promise<void> => {},

  // IPC event stubs — return no-op unsubscribers
  onOpenFile: noopUnsub,
  onMenuSave: noopUnsub,
  onMenuSaveAs: noopUnsub,
  onThemeChange: noopUnsub,

  // Shell
  openExternal: async (url: string): Promise<void> => {
    window.open(url, '_blank', 'noopener,noreferrer')
  },

  platform: 'darwin' as NodeJS.Platform,

  // Export — no-op in web demo
  exportHtml: (): Promise<null> => Promise.resolve(null),
  exportPdf: (): Promise<null> => Promise.resolve(null),
  exportDocx: (): Promise<null> => Promise.resolve(null),

  // Images — paste works via blob URLs
  copyImageToDoc: async (): Promise<string> => '',

  pasteImage: async ({
    buffer,
    mimeType,
  }: {
    buffer: number[]
    mimeType: string
    documentPath: string | null
  }): Promise<string> => {
    const blob = new Blob([new Uint8Array(buffer)], { type: mimeType })
    return URL.createObjectURL(blob)
  },

  // Spell check — no-op
  getSpellSuggestions: async () => ({ misspelledWord: '', suggestions: [] as string[] }),
  replaceMisspelling: noop,
}
