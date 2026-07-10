import type { HTMLAttributes, ReactNode } from 'react'
import { classNames } from '../../utils/classNames'

export type BadgeTone = 'neutral' | 'accent' | 'info' | 'success' | 'warning' | 'danger'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
  children: ReactNode
}

export function Badge({ tone = 'neutral', className, children, ...props }: BadgeProps) {
  return (
    <span className={classNames('ui-badge', `ui-badge-${tone}`, className)} {...props}>
      {children}
    </span>
  )
}
