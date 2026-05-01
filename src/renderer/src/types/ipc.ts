export const IPC = {
  FILE_OPEN: 'file:open',
  FILE_OPEN_PATH: 'file:open-path',
  FILE_SAVE: 'file:save',
  FILE_SAVE_AS: 'file:save-as',
  FILE_READ_INITIAL: 'file:read-initial',
  IMAGE_COPY_TO_DOC: 'image:copy-to-doc',
  RECENT_GET: 'recent:get',
  RECENT_ADD: 'recent:add',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  // Push from main → renderer
  PUSH_OPEN_FILE: 'push:open-file',
  PUSH_MENU_SAVE: 'push:menu-save',
  PUSH_THEME_CHANGE: 'push:theme-change'
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]
