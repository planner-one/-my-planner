import { type ComponentType } from 'react'
import ClockWidget, { meta as clockMeta, ClockActions } from './ClockWidget'
import MemoWidget, { meta as memoMeta, MemoActions } from './MemoWidget'
import CalendarWidget, { meta as calendarMeta } from './CalendarWidget'

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
  { ...clockMeta,    component: ClockWidget,    Actions: ClockActions },
  { ...memoMeta,     component: MemoWidget,     Actions: MemoActions },
  { ...calendarMeta, component: CalendarWidget },
].sort((a, b) => a.order - b.order)

export const WIDGET_MAP: Record<string, WidgetMeta> = Object.fromEntries(
  WIDGETS.map(w => [w.id, w])
)
