import { useEffect } from 'react'
import { useAppStore } from '../store/appStore'

export function useRecentFiles(): void {
  const setRecentFiles = useAppStore((s) => s.setRecentFiles)

  useEffect(() => {
    window.api.getRecentFiles().then(setRecentFiles)
  }, [setRecentFiles])
}
