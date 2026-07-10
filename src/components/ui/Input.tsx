import { forwardRef, type InputHTMLAttributes } from 'react'
import { classNames } from '../../utils/classNames'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({
  className,
  ...props
}, ref) {
  return <input ref={ref} className={classNames('ui-control', 'ui-input', className)} {...props} />
})
