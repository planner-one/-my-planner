import type { CareerEvent, Goal, Project, ScheduledTask, Task, Todo } from '../types'
import { getCareerMilestones } from './careerEvents'

export interface CalendarSources {
  todos: Todo[]
  scheduledTasks: ScheduledTask[]
  careerEvents: CareerEvent[]
  tasks: Task[]
  goals: Goal[]
  projects: Project[]
}

export interface CalendarLinkedItems {
  todos: Todo[]
  scheduled: ScheduledTask[]
  career: CareerEvent[]
  tasks: Task[]
  goals: Goal[]
  projects: Project[]
}

export const todoBelongsToDate = (todo: Todo, dateStr: string, todayStr: string) =>
  todo.date ? todo.date === dateStr : dateStr === todayStr

export function getCalendarLinkedItems(sources: CalendarSources, dateStr: string, todayStr: string): CalendarLinkedItems {
  return {
    todos: sources.todos.filter(todo => todoBelongsToDate(todo, dateStr, todayStr)),
    scheduled: sources.scheduledTasks.filter(task => task.date === dateStr),
    career: sources.careerEvents.filter(event => getCareerMilestones(event, dateStr).length > 0),
    tasks: sources.tasks.filter(task => task.due === dateStr),
    goals: sources.goals.filter(goal => goal.due === dateStr),
    projects: sources.projects.filter(project => project.due === dateStr),
  }
}

export function countCalendarLinkedItems(items: CalendarLinkedItems) {
  return items.todos.length
    + items.scheduled.length
    + items.career.length
    + items.tasks.length
    + items.goals.length
    + items.projects.length
}

export function makeCalendarDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1).getDay()
  const lastDate = new Date(year, month + 1, 0).getDate()
  const totalCells = Math.ceil((firstDay + lastDate) / 7) * 7
  const days: Date[] = []
  for (let i = firstDay - 1; i >= 0; i--) days.push(new Date(year, month, -i))
  for (let i = 1; i <= lastDate; i++) days.push(new Date(year, month, i))
  while (days.length < totalCells) days.push(new Date(year, month + 1, days.length - firstDay - lastDate + 1))
  return days
}
