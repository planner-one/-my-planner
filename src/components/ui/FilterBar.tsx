import type { HTMLAttributes, ReactNode } from 'react'
import { classNames } from '../../utils/classNames'

export interface FilterBarProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function FilterBar({ children, className, ...props }: FilterBarProps) {
  return (
    <div className={classNames('ui-filter-bar', className)} {...props}>
      {children}
    </div>
  )
}
