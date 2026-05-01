import { useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import type { Editor } from '@tiptap/react'

const COLS = 10
const ROWS = 8

interface TableWizardProps {
  editor: Editor
  children: React.ReactNode
}

export function TableWizard({ editor, children }: TableWizardProps): JSX.Element {
  const [hovered, setHovered] = useState({ col: 0, row: 0 })
  const [open, setOpen] = useState(false)

  const insertTable = (cols: number, rows: number): void => {
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
    setOpen(false)
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3"
          sideOffset={6}
        >
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 text-center">
            {hovered.col > 0 && hovered.row > 0
              ? `${hovered.col} × ${hovered.row} table`
              : 'Insert table'}
          </p>
          <div
            className="grid gap-0.5"
            style={{ gridTemplateColumns: `repeat(${COLS}, 1.5rem)` }}
            onMouseLeave={() => setHovered({ col: 0, row: 0 })}
          >
            {Array.from({ length: ROWS }).map((_, row) =>
              Array.from({ length: COLS }).map((_, col) => {
                const active = col < hovered.col && row < hovered.row
                return (
                  <button
                    key={`${row}-${col}`}
                    className={`w-6 h-6 border rounded-sm transition-colors ${active ? 'bg-blue-100 dark:bg-blue-900 border-blue-400 dark:border-blue-600' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/50'}`}
                    onMouseEnter={() => setHovered({ col: col + 1, row: row + 1 })}
                    onClick={() => insertTable(col + 1, row + 1)}
                    aria-label={`Insert ${col + 1}×${row + 1} table`}
                  />
                )
              })
            )}
          </div>
          <Popover.Arrow className="fill-white dark:fill-gray-800" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
