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

    const updateSize = () => {
      const next = {
        w: Math.round(el.offsetWidth),
        h: Math.round(el.offsetHeight),
      }
      setSize(previous => (
        previous.w === next.w && previous.h === next.h
          ? previous
          : next
      ))
    }

    updateSize()
    const ro = new ResizeObserver(updateSize)
    try {
      ro.observe(el, { box: 'border-box' })
    } catch {
      ro.observe(el)
    }
    return () => ro.disconnect()
  }, [])

  return { ref, w: size.w, h: size.h }
}
