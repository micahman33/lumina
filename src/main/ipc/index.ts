import { registerFileHandlers } from './fileHandlers'
import { registerImageHandlers } from './imageHandlers'

export function registerAllHandlers(): void {
  registerFileHandlers()
  registerImageHandlers()
}
