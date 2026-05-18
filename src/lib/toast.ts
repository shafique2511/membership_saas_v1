import { toast } from 'sonner'

export { toast }

export function toastError(error: unknown, fallback = 'Something went wrong') {
  toast.error(error instanceof Error ? error.message : fallback)
}

export function toastSuccess(message: string) {
  toast.success(message)
}
