import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function useDialogA11y(
  open: boolean,
  onClose: () => void,
  containerRef: RefObject<HTMLElement | null>,
) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const container = containerRef.current
    const preferredFocus = container?.querySelector<HTMLElement>('[data-dialog-autofocus], [autofocus]')
    const focusable = container?.querySelector<HTMLElement>(FOCUSABLE)
    window.requestAnimationFrame(() => (preferredFocus ?? focusable ?? container)?.focus())

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !containerRef.current) return

      const elements = Array.from(containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter(element => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true')
      if (elements.length === 0) {
        event.preventDefault()
        containerRef.current.focus()
        return
      }

      const first = elements[0]
      const last = elements[elements.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [containerRef, open])
}
