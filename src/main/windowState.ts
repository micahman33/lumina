import { BrowserWindow, screen } from 'electron'
import store from './store'

export function applyWindowState(win: BrowserWindow): void {
  const bounds = store.get('settings.windowBounds')
  if (bounds) {
    const displays = screen.getAllDisplays()
    const onScreen = displays.some(
      (d) =>
        bounds.x >= d.bounds.x &&
        bounds.y >= d.bounds.y &&
        bounds.x < d.bounds.x + d.bounds.width &&
        bounds.y < d.bounds.y + d.bounds.height
    )
    if (onScreen) {
      win.setBounds(bounds)
    }
  }
}

export function trackWindowState(win: BrowserWindow): void {
  const save = (): void => {
    if (!win.isMinimized() && !win.isMaximized()) {
      const bounds = win.getBounds()
      store.set('settings.windowBounds', bounds)
    }
  }
  win.on('resize', save)
  win.on('move', save)
}
