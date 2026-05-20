import { useEffect, useRef, useState } from 'react'

interface WidgetSize {
  ref: React.RefObject<HTMLDivElement | null>
  w: number
  h: number
}

export function useWidgetSize(): WidgetSize {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setSize({ w: Math.round(width), h: Math.round(height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return { ref, w: size.w, h: size.h }
}
