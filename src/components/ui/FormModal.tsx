import { type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'

interface FormModalProps {
  open: boolean
  title: string
  description?: string
  submitLabel?: string
  children: ReactNode
  onSubmit: () => void
  onOpenChange: (open: boolean) => void
}

export function FormModal({
  open,
  title,
  description,
  submitLabel = 'Save',
  children,
  onSubmit,
  onOpenChange,
}: FormModalProps) {
  return (
    <Dialog
      open={open}
      title={title}
      description={description}
      onOpenChange={onOpenChange}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit}>{submitLabel}</Button>
        </>
      }
    >
      {children}
    </Dialog>
  )
}
