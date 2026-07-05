import { type ComponentType } from 'react'
import ClockWidget, { meta as clockMeta, ClockActions } from './ClockWidget'
import MemoWidget, { meta as memoMeta, MemoActions } from './MemoWidget'
import CalendarWidget, { meta as calendarMeta, CalendarActions } from './CalendarWidget'
import TodoWidget, { meta as todoMeta } from './TodoWidget'
import HabitWidget, { meta as habitMeta } from './HabitWidget'
import PomodoroWidget, { meta as pomodoroMeta } from './PomodoroWidget'
import CounterWidget, { meta as counterMeta } from './CounterWidget'
import ChartWidget, { meta as chartMeta, ChartActions } from './ChartWidget'
import GoalWidget, { meta as goalMeta } from './GoalWidget'
import WorkOverviewWidget, { meta as workOverviewMeta } from './WorkOverviewWidget'
import MenuWidget, { meta as menuMeta } from './MenuWidget'
import ReviewWidget, { meta as reviewMeta } from './ReviewWidget'
import ScheduledTaskWidget, { meta as scheduledMeta } from './ScheduledTaskWidget'
import WeatherWidget, { meta as weatherMeta } from './WeatherWidget'
import JournalWidget, { meta as journalFeedMeta } from './JournalWidget'

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
  hideHeaderLabel?: boolean
}

export const WIDGETS: WidgetMeta[] = [
  { ...clockMeta,    component: ClockWidget,         Actions: ClockActions },
  { ...memoMeta,     component: MemoWidget,           Actions: MemoActions },
  { ...calendarMeta, component: CalendarWidget, Actions: CalendarActions },
  { ...todoMeta,     component: TodoWidget },
  { ...habitMeta,    component: HabitWidget },
  { ...pomodoroMeta, component: PomodoroWidget },
  { ...counterMeta,  component: CounterWidget },
  { ...chartMeta,    component: ChartWidget,          Actions: ChartActions },
  { ...goalMeta,     component: GoalWidget },
  { ...workOverviewMeta, component: WorkOverviewWidget },
  { ...menuMeta,     component: MenuWidget },
  { ...reviewMeta,   component: ReviewWidget },
  { ...scheduledMeta,component: ScheduledTaskWidget },
  { ...weatherMeta,  component: WeatherWidget },
  { ...journalFeedMeta, component: JournalWidget },
].sort((a, b) => a.order - b.order)

export const WIDGET_MAP: Record<string, WidgetMeta> = Object.fromEntries(
  WIDGETS.map(w => [w.id, w])
)
