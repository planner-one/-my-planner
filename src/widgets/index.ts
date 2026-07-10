import { createElement, type ComponentType, type ReactNode } from 'react'
import {
  BarChart3,
  CalendarClock,
  CalendarDays,
  Clock3,
  CloudSun,
  LayoutGrid,
  ListOrdered,
  ListTodo,
  MoonStar,
  Newspaper,
  Repeat2,
  StickyNote,
  Target,
  Timer,
  Workflow,
  type LucideIcon,
} from 'lucide-react'
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
  icon: ReactNode
  defaultW: number
  defaultH: number
  minW: number
  minH: number
  order: number
  component: ComponentType
  Actions?: ComponentType
  hideHeaderLabel?: boolean
}

const widgetIcon = (Icon: LucideIcon) => createElement(Icon, { size: 15, 'aria-hidden': true })

export const WIDGETS: WidgetMeta[] = [
  { ...clockMeta, icon: widgetIcon(Clock3), component: ClockWidget, Actions: ClockActions },
  { ...memoMeta, icon: widgetIcon(StickyNote), component: MemoWidget, Actions: MemoActions },
  { ...calendarMeta, icon: widgetIcon(CalendarDays), component: CalendarWidget, Actions: CalendarActions },
  { ...todoMeta, icon: widgetIcon(ListTodo), component: TodoWidget },
  { ...habitMeta, icon: widgetIcon(Repeat2), component: HabitWidget },
  { ...pomodoroMeta, icon: widgetIcon(Timer), component: PomodoroWidget },
  { ...counterMeta, icon: widgetIcon(ListOrdered), component: CounterWidget },
  { ...chartMeta, icon: widgetIcon(BarChart3), component: ChartWidget, Actions: ChartActions },
  { ...goalMeta, icon: widgetIcon(Target), component: GoalWidget },
  { ...workOverviewMeta, icon: widgetIcon(Workflow), component: WorkOverviewWidget },
  { ...menuMeta, icon: widgetIcon(LayoutGrid), component: MenuWidget },
  { ...reviewMeta, icon: widgetIcon(MoonStar), component: ReviewWidget },
  { ...scheduledMeta, icon: widgetIcon(CalendarClock), component: ScheduledTaskWidget },
  { ...weatherMeta, icon: widgetIcon(CloudSun), component: WeatherWidget },
  { ...journalFeedMeta, icon: widgetIcon(Newspaper), component: JournalWidget },
].sort((a, b) => a.order - b.order)

export const WIDGET_MAP: Record<string, WidgetMeta> = Object.fromEntries(
  WIDGETS.map(w => [w.id, w])
)
