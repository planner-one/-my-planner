import { forwardRef, type SelectHTMLAttributes } from 'react'
import { classNames } from '../../utils/classNames'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({
  className,
  ...props
}, ref) {
  return <select ref={ref} className={classNames('ui-control', 'ui-select', className)} {...props} />
})
