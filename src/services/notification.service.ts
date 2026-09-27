import { ElNotification } from 'element-plus'
import { h, type VNode } from 'vue'

// The only allowed caller of ElNotification: toasts go through here so they can change in one place.
interface INotifyAction {
  label: string
  onClick: () => void
}

interface INotifyOptions {
  message: string
  title?: string
  action?: INotifyAction
}

type TNotifyType = 'success' | 'warning' | 'info' | 'error'

const DEFAULT_TITLES = {
  success: 'Success',
  warning: 'Warning',
  info: 'Info',
  error: 'Error'
} as const

class NotificationService {
  success (options: INotifyOptions): void {
    this.notify('success', options)
  }

  error (options: INotifyOptions): void {
    this.notify('error', options)
  }

  warning (options: INotifyOptions): void {
    this.notify('warning', options)
  }

  info (options: INotifyOptions): void {
    this.notify('info', options)
  }

  private notify (type: TNotifyType, { message, title, action }: INotifyOptions): void {
    const resolvedTitle = title ?? DEFAULT_TITLES[type]

    if (action === undefined) {
      ElNotification({ type, title: resolvedTitle, message })
      return
    }

    const handle = ElNotification({
      type,
      title: resolvedTitle,
      message: this.renderWithAction(message, action, () => handle.close())
    })
  }

  private renderWithAction (message: string, action: INotifyAction, close: () => void): VNode {
    return h('div', [
      h('p', message),
      h('button', {
        type: 'button',
        class: 'mt-1 font-medium text-accent hover:underline',
        onClick: () => {
          close()
          action.onClick()
        }
      }, action.label)
    ])
  }
}

export const notificationService = new NotificationService()
