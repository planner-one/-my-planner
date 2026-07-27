import { useEffect, useRef, useState } from 'react'
import {
  getWidgetSizeTier,
  measureWidgetBorderBox,
  type WidgetHeightTier,
  type WidgetWidthTier,
} from '../utils/widgetSize'

interface WidgetSize {
  ref: React.RefObject<HTMLDivElement | null>
  w: number
  h: number
  widthTier: WidgetWidthTier
  heightTier: WidgetHeightTier
}

export function useWidgetSize(): WidgetSize {
  const ref = useRef<HTMLDivElement>(null)
  const measuredSizeRef = useRef({ w: 0, h: 0 })
  const [size, setSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let frameId: number | null = null

    const flushSize = () => {
      frameId = null
      const next = measureWidgetBorderBox(el)
      if (
        measuredSizeRef.current.w === next.w
        && measuredSizeRef.current.h === next.h
      ) return

      measuredSizeRef.current = next
      setSize(previous => (
        previous.w === next.w && previous.h === next.h
          ? previous
          : next
      ))
    }

    const scheduleSize = () => {
      if (frameId !== null) return
      frameId = window.requestAnimationFrame(flushSize)
    }

    scheduleSize()
    const ro = new ResizeObserver(scheduleSize)
    try {
      ro.observe(el, { box: 'border-box' })
    } catch {
      ro.observe(el)
    }
    return () => {
      ro.disconnect()
      if (frameId !== null) window.cancelAnimationFrame(frameId)
    }
  }, [])

  const tier = getWidgetSizeTier(size.w, size.h)

  return {
    ref,
    w: size.w,
    h: size.h,
    widthTier: tier.width,
    heightTier: tier.height,
  }
}
