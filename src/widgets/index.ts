import { type ComponentType } from 'react'
import ClockWidget, { meta as clockMeta } from './ClockWidget'
import MemoWidget, { meta as memoMeta, MemoActions } from './MemoWidget'

export interface WidgetMeta {
  id: string
  name: string
  icon: string
  defaultW: number
  defaultH: number
  minW: number
  minH: number
  order: number
  component: ComponentType
  Actions?: ComponentType
}

export const WIDGETS: WidgetMeta[] = [
  { ...clockMeta, component: ClockWidget },
  { ...memoMeta,  component: MemoWidget, Actions: MemoActions },
].sort((a, b) => a.order - b.order)

export const WIDGET_MAP: Record<string, WidgetMeta> = Object.fromEntries(
  WIDGETS.map(w => [w.id, w])
)
