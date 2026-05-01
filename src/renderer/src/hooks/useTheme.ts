import { useEffect } from 'react'
import { useAppStore } from '../store/appStore'

function applyTheme(theme: 'system' | 'light' | 'dark'): void {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else if (theme === 'light') {
    root.classList.remove('dark')
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', prefersDark)
  }
}

export function useTheme(): void {
  const theme = useAppStore((s) => s.theme)
  const setTheme = useAppStore((s) => s.setTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (): void => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  useEffect(() => {
    const unsub = window.api.onThemeChange((osTheme) => {
      if (useAppStore.getState().theme === 'system') {
        const root = document.documentElement
        root.classList.toggle('dark', osTheme === 'dark')
      }
    })
    return unsub
  }, [])

  useEffect(() => {
    window.api.getSettings().then((settings) => {
      setTheme(settings.theme)
    })
  }, [setTheme])
}
