import { FileQuestion, Lock } from 'lucide-react'
import { useAppStore } from '../../store/appStore'

/** Banner above a document that opened read-only because of its text encoding. */
export function ReadOnlyNotice(): JSX.Element | null {
  const readOnly = useAppStore((s) => s.file.meta.readOnly)
  const kind = useAppStore((s) => s.file.kind)
  if (!readOnly || kind === 'binary') return null
  return (
    <div
      className="flex items-center shrink-0"
      style={{
        gap: 8, padding: '7px 16px', fontSize: 12, color: 'var(--lm-ink-soft)',
        background: 'rgba(245,158,11,0.10)', borderBottom: '1px solid var(--lm-border)',
      }}
    >
      <Lock size={13} strokeWidth={1.8} />
      <span>
        Read-only: this file isn't saved as UTF-8, so Lumina can't safely write changes back to it.
        Use Save As to make an editable UTF-8 copy.
      </span>
    </div>
  )
}

/** Shown instead of an editor for files that aren't text. */
export function BinaryNotice(): JSX.Element {
  const path = useAppStore((s) => s.file.path)
  const name = path?.split(/[/\\]/).pop() ?? 'This file'
  const reveal = navigator.platform.toLowerCase().includes('mac') ? 'Reveal in Finder' : 'Show in Explorer'
  return (
    <div className="flex-1 flex flex-col items-center justify-center lm-bg" style={{ gap: 10, padding: 32, textAlign: 'center' }}>
      <FileQuestion size={36} strokeWidth={1.2} style={{ color: 'var(--lm-ink-faint)' }} />
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--lm-ink)' }}>Lumina can't display this file</div>
      <div style={{ fontSize: 13, color: 'var(--lm-ink-soft)', maxWidth: 380 }}>
        {name} isn't a text file. Lumina opens Markdown, JSON, XML, CSV, logs and other plain text.
      </div>
      {path && (
        <button
          onClick={() => window.api.revealFile(path)}
          style={{
            marginTop: 8, padding: '6px 14px', fontSize: 13, borderRadius: 6, cursor: 'pointer',
            border: '1px solid var(--lm-border)', background: 'var(--lm-chrome)', color: 'var(--lm-ink)',
          }}
        >
          {reveal}
        </button>
      )}
    </div>
  )
}
