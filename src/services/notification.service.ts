import { ElNotification } from 'element-plus'

/**
 * Thin wrapper over Element Plus's `ElNotification`. Everything in this app
 * that surfaces a toast notification goes through this service — nothing
 * else may call `ElNotification` directly (enforced by code review), so the
 * presentation can change in one place and tests can assert on notifications
 * without reaching into a UI library.
 *
 * Theming: `ElNotification`'s `type` prop resolves its color through Element
 * Plus's own `--el-color-{success,warning,info,danger}` CSS custom
 * properties, which `src/assets/styles/element-reset/theme.css` points at
 * this project's semantic design tokens (`--success`, `--warning`, `--info`,
 * `--danger` from `src/assets/styles/tokens.ts`) rather than Element Plus's
 * library defaults — so no inline color/class is needed here.
 */
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
