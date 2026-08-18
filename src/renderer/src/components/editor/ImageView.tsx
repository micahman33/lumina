import { useRef, useCallback } from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/core'

export function ImageView({ node, selected, updateAttributes }: NodeViewProps): JSX.Element {
  const { src, alt, width } = node.attrs as { src: string; alt: string; width: number | null }
  const containerRef = useRef<HTMLSpanElement>(null)

  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const startX = e.clientX
      const startWidth = containerRef.current?.getBoundingClientRect().width ?? 300

      const onMouseMove = (moveEvent: MouseEvent): void => {
        const delta = moveEvent.clientX - startX
        const newWidth = Math.max(48, Math.round(startWidth + delta))
        updateAttributes({ width: newWidth })
      }

      const onMouseUp = (): void => {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [updateAttributes]
  )

  return (
    <NodeViewWrapper
      as="span"
      ref={containerRef}
      style={{
        display: 'inline-block',
        position: 'relative',
        maxWidth: '100%',
        width: width ? `${width}px` : 'auto',
        lineHeight: 0,
        verticalAlign: 'bottom',
      }}
    >
      <img
        src={src as string}
        alt={(alt as string) || ''}
        draggable={false}
        style={{ display: 'block', width: '100%', maxWidth: '100%', borderRadius: '4px' }}
      />

      {/* Selection border */}
      {selected && (
        <span
          contentEditable={false}
          style={{
            position: 'absolute',
            inset: 0,
            border: '2px solid #5b6ee8',
            borderRadius: '4px',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Resize handle — bottom-right corner */}
      {selected && (
        <span
          contentEditable={false}
          onMouseDown={startResize}
          title="Drag to resize"
          style={{
            position: 'absolute',
            bottom: -4,
            right: -4,
            width: 10,
            height: 10,
            background: '#5b6ee8',
            border: '2px solid white',
            borderRadius: '2px',
            cursor: 'nwse-resize',
            zIndex: 10,
          }}
        />
      )}
    </NodeViewWrapper>
  )
}
