import { type ReactNode } from 'react'
import { Modal } from './ui/Modal'

interface QuickAddModalProps {
  title: string
  onClose: () => void
  children: ReactNode
}

export default function QuickAddModal({ title, onClose, children }: QuickAddModalProps) {
  return (
    <Modal open onClose={onClose} title={title} size="sm">
      {children}
    </Modal>
  )
}
