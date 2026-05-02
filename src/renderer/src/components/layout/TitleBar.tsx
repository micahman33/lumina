import { useAppStore } from '../../store/appStore'

function LuminaMark({ size = 14 }: { size?: number }): JSX.Element {
  const r = size * 0.2237
  return (
    <svg viewBox="0 0 1024 1024" width={size} height={size}
         style={{ borderRadius: r, display: 'block', flexShrink: 0 }}>
      <defs>
        <linearGradient id="lm-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5B6CFF" />
          <stop offset="1" stopColor="#3B4BD8" />
        </linearGradient>
      </defs>
      <rect width="1024" height="1024" rx="228" fill="url(#lm-grad)" />
      <g transform="rotate(-8 512 512)">
        <rect x="240" y="200" width="500" height="640" rx="42" fill="rgba(255,255,255,0.62)" />
      </g>
      <g transform="rotate(4 512 512)">
        <rect x="280" y="220" width="500" height="640" rx="42" fill="#ffffff" />
      </g>
    </svg>
  )
}

export function TitleBar(): JSX.Element {
  const filePath = useAppStore((s) => s.file.path)
  const isDirty = useAppStore((s) => s.file.isDirty)
  const isMac = navigator.platform.toLowerCase().includes('mac')

  const fileName = filePath
    ? (filePath.split(/[/\\]/).pop() ?? 'Untitled')
    : 'Untitled'

  return (
    <div
      className="titlebar-drag relative flex items-center shrink-0 select-none"
      style={{ height: 36, background: 'var(--lm-titlebar)', borderBottom: '1px solid var(--lm-border)' }}
    >
      {/* Centered content — absolutely positioned so it's truly centred even with traffic lights */}
      <div className="absolute inset-0 flex items-center justify-center gap-1.5 pointer-events-none">
        <LuminaMark size={14} />
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--lm-ink)', letterSpacing: 0.1 }}>
          {fileName}{isDirty ? ' •' : ''}
        </span>
        <span style={{ fontSize: 12, color: 'var(--lm-ink-faint)' }}>· Lumina</span>
      </div>

      {/* On Windows, add right-side padding so traffic controls don't overlap — macOS handles itself */}
      {!isMac && <div style={{ width: 120, marginLeft: 'auto' }} />}
    </div>
  )
}
