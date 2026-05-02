import { useState, useRef, useEffect } from 'react'
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/core'

const LANGUAGES = [
  { label: 'Plain Text',   value: 'plaintext' },
  { label: 'Bash',         value: 'bash' },
  { label: 'C',            value: 'c' },
  { label: 'C++',          value: 'cpp' },
  { label: 'C#',           value: 'csharp' },
  { label: 'CSS',          value: 'css' },
  { label: 'Dockerfile',   value: 'dockerfile' },
  { label: 'Go',           value: 'go' },
  { label: 'GraphQL',      value: 'graphql' },
  { label: 'HTML',         value: 'html' },
  { label: 'Java',         value: 'java' },
  { label: 'JavaScript',   value: 'javascript' },
  { label: 'JSON',         value: 'json' },
  { label: 'Kotlin',       value: 'kotlin' },
  { label: 'Markdown',     value: 'markdown' },
  { label: 'PHP',          value: 'php' },
  { label: 'Python',       value: 'python' },
  { label: 'Ruby',         value: 'ruby' },
  { label: 'Rust',         value: 'rust' },
  { label: 'SQL',          value: 'sql' },
  { label: 'Swift',        value: 'swift' },
  { label: 'TOML',         value: 'toml' },
  { label: 'TypeScript',   value: 'typescript' },
  { label: 'XML',          value: 'xml' },
  { label: 'YAML',         value: 'yaml' },
]

export function CodeBlockView({ node, updateAttributes }: NodeViewProps): JSX.Element {
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)
  const language = (node.attrs.language as string) || ''
  const displayLabel =
    LANGUAGES.find((l) => l.value === language)?.label ??
    (language || 'Plain Text')

  // Close picker when clicking outside
  useEffect(() => {
    if (!pickerOpen) return
    const handler = (e: MouseEvent): void => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [pickerOpen])

  return (
    <NodeViewWrapper
      as="div"
      className="relative my-4 rounded-xl overflow-visible
        bg-[#f3f4f6] border border-[#e5e7eb]
        dark:bg-gray-900 dark:border-gray-700"
    >
      {/* Language pill — not editable */}
      <div
        ref={pickerRef}
        contentEditable={false}
        className="absolute top-2.5 right-2.5 z-20 select-none"
      >
        <button
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setPickerOpen((v) => !v)
          }}
          className="text-[11px] leading-none px-2 py-1 rounded-md font-mono
            bg-[#e5e7eb] text-[#6b7280] hover:bg-[#d1d5db] hover:text-[#374151]
            dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-100
            transition-colors cursor-pointer"
        >
          {displayLabel}
        </button>

        {/* Dropdown */}
        {pickerOpen && (
          <div className="absolute right-0 top-full mt-1.5 w-44 max-h-56 overflow-y-auto
            bg-white border border-[#e5e7eb]
            dark:bg-gray-800 dark:border-gray-600
            rounded-xl shadow-2xl py-1 z-50">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.value === '' ? '__plain__' : lang.value}
                onMouseDown={(e) => {
                  e.preventDefault()
                  updateAttributes({ language: lang.value })
                  setPickerOpen(false)
                }}
                className={`w-full text-left px-3 py-1.5 text-xs font-mono transition-colors ${
                  lang.value === language
                    ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-gray-700'
                    : 'text-[#374151] hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Code content — pad top to clear the pill */}
      <pre className="m-0 p-4 pt-9 overflow-x-auto bg-transparent rounded-xl">
        <NodeViewContent
          as="code"
          className={`font-mono text-sm text-[#1f2937] dark:text-gray-100 whitespace-pre${language ? ` language-${language}` : ''}`}
        />
      </pre>
    </NodeViewWrapper>
  )
}
