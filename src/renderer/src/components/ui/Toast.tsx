import { useEffect, useRef } from 'react'
import { useAppStore } from '../../store/appStore'

export function Toast(): JSX.Element | null {
  const toast = useAppStore((s) => s.toast)
  const dismissToast = useAppStore((s) => s.dismissToast)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!toast) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => dismissToast(), 3000)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [toast, dismissToast])

  if (!toast) return null

  const isSuccess = toast.type === 'success'

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 32,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 18px',
        borderRadius: 10,
        background: isSuccess
          ? 'rgba(22, 163, 74, 0.10)'
          : 'rgba(220, 38, 38, 0.10)',
        border: `1px solid ${isSuccess ? 'rgba(22, 163, 74, 0.30)' : 'rgba(220, 38, 38, 0.30)'}`,
        color: 'var(--lm-ink)',
        fontSize: 13,
        fontWeight: 500,
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        backdropFilter: 'blur(8px)',
        whiteSpace: 'nowrap',
        animation: 'lm-toast-in 180ms ease forwards',
        pointerEvents: 'none',
      }}
    >
      {/* Dot indicator */}
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          flexShrink: 0,
          background: isSuccess ? '#16a34a' : '#dc2626',
        }}
      />
      {toast.message}
    </div>
  )
}
