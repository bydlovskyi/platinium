import { ElNotification } from 'element-plus'

// The only allowed caller of ElNotification: toasts go through here so they can change in one place.
interface INotifyOptions {
  message: string
  title?: string
}

const DEFAULT_TITLES = {
  success: 'Success',
  warning: 'Warning',
  info: 'Info',
  error: 'Error'
} as const

class NotificationService {
  success ({ message, title }: INotifyOptions): void {
    ElNotification({ type: 'success', title: title ?? DEFAULT_TITLES.success, message })
  }

  error ({ message, title }: INotifyOptions): void {
    ElNotification({ type: 'error', title: title ?? DEFAULT_TITLES.error, message })
  }

  warning ({ message, title }: INotifyOptions): void {
    ElNotification({ type: 'warning', title: title ?? DEFAULT_TITLES.warning, message })
  }

  info ({ message, title }: INotifyOptions): void {
    ElNotification({ type: 'info', title: title ?? DEFAULT_TITLES.info, message })
  }
}

export const notificationService = new NotificationService()
