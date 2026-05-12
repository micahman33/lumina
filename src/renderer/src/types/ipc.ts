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
  // Recent files management
  RECENT_REMOVE: 'recent:remove',
  RECENT_PIN: 'recent:pin',
  RECENT_REVEAL: 'recent:reveal',
  RECENT_RENAME: 'recent:rename',
  // Spell-check
  SPELL_GET: 'spell:get-suggestions',
  SPELL_REPLACE: 'spell:replace',
  // Export
  EXPORT_HTML: 'export:html',
  EXPORT_PDF: 'export:pdf',
  // Image paste
  PASTE_IMAGE: 'image:paste',
  // Push from main → renderer
  PUSH_OPEN_FILE: 'push:open-file',
  PUSH_MENU_SAVE: 'push:menu-save',
  PUSH_MENU_SAVE_AS: 'push:menu-save-as',
  PUSH_THEME_CHANGE: 'push:theme-change'
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]
