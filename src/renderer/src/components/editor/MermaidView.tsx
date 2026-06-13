import { useEffect, useRef, useState } from 'react'

let mermaidPromise: Promise<typeof import('mermaid').default> | null = null

function getMermaid(): Promise<typeof import('mermaid').default> {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((mod) => {
      mod.default.initialize({ startOnLoad: false, securityLevel: 'strict' })
      return mod.default
    })
  }
  return mermaidPromise
}

let diagramCounter = 0

export function MermaidView({ code }: { code: string }): JSX.Element {
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const idRef = useRef(`mermaid-diagram-${++diagramCounter}`)

  useEffect(() => {
    if (!code.trim()) {
      setSvg(null)
      setError(null)
      return
    }

    let cancelled = false
    const isDark = document.documentElement.classList.contains('dark')

    getMermaid()
      .then((mermaid) => {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: isDark ? 'dark' : 'default'
        })
        return mermaid.render(idRef.current, code)
      })
      .then(({ svg: rendered }) => {
        if (!cancelled) {
          setSvg(rendered)
          setError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setSvg(null)
          setError(err instanceof Error ? err.message : 'Failed to render diagram')
        }
      })

    return () => {
      cancelled = true
    }
  }, [code, document.documentElement.classList.contains('dark')])

  if (error) {
    return (
      <div className="text-xs text-red-500 font-mono whitespace-pre-wrap p-3">
        Mermaid error: {error}
      </div>
    )
  }

  if (!svg) {
    return <div className="text-xs text-gray-400 dark:text-gray-500 p-3">Rendering diagram…</div>
  }

  return (
    <div
      className="mermaid-diagram flex justify-center overflow-x-auto p-3"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
