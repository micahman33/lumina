import { autoUpdater } from 'electron-updater'
import { dialog, shell } from 'electron'
import type { BrowserWindow } from 'electron'

/**
 * Initialise the auto-updater.
 *
 * Strategy:
 *   - Check GitHub releases 3 seconds after the window is ready (non-blocking).
 *   - If a newer version is found, show a dialog offering to open the release page.
 *   - We don't auto-download because Lumina is not code-signed/notarized on macOS,
 *     which would cause the downloaded update to be quarantined. Directing the user
 *     to GitHub is the safest cross-platform approach for now.
 *   - Errors (offline, rate-limited, etc.) are silently swallowed — updates are
 *     opportunistic, never required to use the app.
 *
 * When Lumina is eventually notarized, switch autoDownload to true and
 * listen for 'update-downloaded' to call autoUpdater.quitAndInstall().
 */
export function initUpdater(win: BrowserWindow): void {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false
  // Suppress the default electron-updater logger noise in production
  autoUpdater.logger = null

  autoUpdater.on('update-available', (info) => {
    if (win.isDestroyed()) return
    dialog
      .showMessageBox(win, {
        type: 'info',
        title: 'Update Available',
        message: `Lumina ${info.version} is available`,
        detail: `You're on ${autoUpdater.currentVersion}. The new version includes the latest fixes and improvements.`,
        buttons: ['Download Update', 'Later'],
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }) => {
        if (response === 0) {
          shell.openExternal('https://github.com/micahman33/lumina/releases/latest')
        }
      })
      .catch(() => {/* window may have been closed */})
  })

  // All errors (network offline, missing asset, bad signature) are non-fatal.
  autoUpdater.on('error', () => {/* silently ignore */})

  // Check 3 s after ready so it doesn't slow down the initial load.
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {/* offline */})
  }, 3000)
}
