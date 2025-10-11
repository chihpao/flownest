import { readonly, ref } from 'vue'

export type ToastVariant = 'success' | 'error' | 'info'

export interface ToastAction {
  label: string
  handler: () => void
}

export interface ToastOptions {
  id?: number
  title?: string
  description?: string
  duration?: number
  action?: ToastAction
  onClose?: () => void
}

export interface ToastMessage {
  id: number
  type: ToastVariant
  title: string
  description?: string
  duration: number
  createdAt: number
  action?: ToastAction
  onClose?: () => void
}

const DEFAULT_DURATION = 4000
const toasts = ref<ToastMessage[]>([])
let seed = 0
const timers = new Map<number, number>()

function enqueue(type: ToastVariant, message: string, options?: ToastOptions) {
  const id = options?.id ?? ++seed
  const duration = options?.duration ?? DEFAULT_DURATION

  const toast: ToastMessage = {
    id,
    type,
    title: options?.title ?? message,
    description: options?.description,
    duration,
    createdAt: Date.now(),
    action: options?.action,
    onClose: options?.onClose,
  }

  toasts.value = [...toasts.value.filter((item) => item.id !== id), toast]

  if (duration > 0 && typeof window !== 'undefined') {
    const timer = window.setTimeout(() => dismiss(id), duration)
    timers.set(id, timer)
  }

  return id
}

function dismiss(id: number) {
  const toast = toasts.value.find((item) => item.id === id)
  if (!toast) return

  toasts.value = toasts.value.filter((item) => item.id !== id)

  const timer = timers.get(id)
  if (timer) {
    clearTimeout(timer)
    timers.delete(id)
  }

  toast.onClose?.()
}

function clear() {
  toasts.value.forEach((item) => item.onClose?.())
  toasts.value = []
  timers.forEach((timer) => clearTimeout(timer))
  timers.clear()
}

function success(message: string, options?: ToastOptions) {
  return enqueue('success', message, options)
}

function error(message: string, options?: ToastOptions) {
  return enqueue('error', message, options)
}

function info(message: string, options?: ToastOptions) {
  return enqueue('info', message, options)
}

export function useToast() {
  return {
    toasts: readonly(toasts),
    toast: {
      success,
      error,
      info,
      dismiss,
      clear,
    },
  }
}
