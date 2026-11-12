import type { ViewKind } from './types/file'

/**
 * What file handling needs from whichever editor is showing the document. `useFile` talks
 * to this instead of to TipTap, so the code and table views plug in the same way.
 */
export interface DocumentSurface {
  /** The text to write to disk. May tidy the document first (format-on-save). */
  getContent(): string
  /** An opaque marker of the current document state… */
  snapshot(): unknown
  /** …used to tell whether the user typed while a save was being written. */
  isUnchangedSince(snapshot: unknown): boolean
  focus(): void
  commands?: {
    format?: () => void
    addRow?: () => void
    addColumn?: () => void
    find?: () => void
    gotoError?: () => void
  }
}

const surfaces = new Map<ViewKind, DocumentSurface>()

/** Called by a view when it mounts; returns the function that unregisters it. */
export function registerSurface(kind: ViewKind, surface: DocumentSurface): () => void {
  surfaces.set(kind, surface)
  return () => {
    if (surfaces.get(kind) === surface) surfaces.delete(kind)
  }
}

export function getSurface(kind: ViewKind): DocumentSurface | undefined {
  return surfaces.get(kind)
}
