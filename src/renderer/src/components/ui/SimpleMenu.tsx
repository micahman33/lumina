import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export type MenuItem = { label: string; action: () => void; disabled?: boolean } | 'separator'

interface SimpleMenuProps {
  x: number
  y: number
  items: MenuItem[]
  onClose: () => void
}

/** A small right-click menu in Lumina's style, used by the code and table views. */
export function SimpleMenu({ x, y, items, onClose }: SimpleMenuProps): JSX.Element {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', onDown, true)
    document.addEventListener('keydown', onKey, true)
    window.addEventListener('blur', onClose)
    return () => {
      document.removeEventListener('mousedown', onDown, true)
      document.removeEventListener('keydown', onKey, true)
      window.removeEventListener('blur', onClose)
    }
  }, [onClose])

  // Keep the menu inside the window
  const height = items.reduce((h, i) => h + (i === 'separator' ? 9 : 30), 10)
  const left = Math.min(x, window.innerWidth - 200)
  const top = Math.min(y, window.innerHeight - height - 4)

  return createPortal(
    <div
      ref={ref}
      // Keep focus (and the selection) in the editor while the menu is used
      onMouseDown={(e) => e.preventDefault()}
      style={{
        position: 'fixed', left, top, zIndex: 1000, minWidth: 180, padding: '5px 0',
        background: 'var(--lm-chrome)', border: '1px solid var(--lm-border)',
        borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.16)',
      }}
    >
      {items.map((item, i) =>
        item === 'separator' ? (
          <div key={i} style={{ height: 1, background: 'var(--lm-border)', margin: '4px 0' }} />
        ) : (
          <button
            key={i}
            disabled={item.disabled}
            onClick={() => { onClose(); item.action() }}
            style={{
              display: 'block', width: '100%', textAlign: 'left', padding: '6px 14px',
              fontSize: 13, border: 'none', background: 'transparent',
              color: 'var(--lm-ink)', opacity: item.disabled ? 0.4 : 1,
              cursor: item.disabled ? 'default' : 'pointer',
            }}
            onMouseEnter={(e) => { if (!item.disabled) e.currentTarget.style.background = 'rgba(91,108,255,0.08)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            {item.label}
          </button>
        )
      )}
    </div>,
    document.body
  )
}
