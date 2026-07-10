import type { ReactNode } from 'react'

export interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="ui-empty-state">
      {icon && <span className="ui-empty-icon" aria-hidden="true">{icon}</span>}
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {action}
    </div>
  )
}
