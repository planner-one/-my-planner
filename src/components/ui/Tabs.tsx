import type { KeyboardEvent } from 'react'
import { classNames } from '../../utils/classNames'

export interface TabOption<T extends string> {
  value: T
  label: string
  count?: number
}

export interface TabsProps<T extends string> {
  value: T
  options: ReadonlyArray<TabOption<T>>
  onChange: (value: T) => void
  label: string
  className?: string
}

export function Tabs<T extends string>({ value, options, onChange, label, className }: TabsProps<T>) {
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let nextIndex = currentIndex
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % options.length
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + options.length) % options.length
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = options.length - 1
    else return

    event.preventDefault()
    onChange(options[nextIndex].value)
    const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    buttons?.[nextIndex]?.focus()
  }

  return (
    <div className={classNames('ui-tabs', className)} role="tablist" aria-label={label}>
      {options.map((option, index) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          tabIndex={value === option.value ? 0 : -1}
          className={value === option.value ? 'active' : undefined}
          onClick={() => onChange(option.value)}
          onKeyDown={event => handleKeyDown(event, index)}
        >
          <span>{option.label}</span>
          {option.count !== undefined && <small>{option.count}</small>}
        </button>
      ))}
    </div>
  )
}
