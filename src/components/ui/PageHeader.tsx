import type { ReactNode } from 'react'
import { classNames } from '../../utils/classNames'

export interface PageHeaderProps {
  title: string
  description?: string
  eyebrow?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, description, eyebrow, actions, className }: PageHeaderProps) {
  return (
    <header className={classNames('ui-page-header', className)}>
      <div>
        {eyebrow && <span className="ui-page-eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="ui-page-actions">{actions}</div>}
    </header>
  )
}
