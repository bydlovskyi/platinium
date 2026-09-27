import { ElMessageBox } from 'element-plus'

import type { Action as TMessageBoxAction } from 'element-plus/es/components/message-box/src/message-box.type'

// Always resolves (never rejects on cancel) so callers need no try/catch.
export type TConfirmIntent =
  | { confirmed: true } |
  { confirmed: false; reason: 'cancel' | 'close' }

interface IUseConfirmOptions {
  subject: string
  title?: string
  message?: string
  confirmButtonText?: string
  cancelButtonText?: string
  danger?: boolean
  // Rejecting keeps the dialog open for retry; the caller surfaces the error.
  onConfirm: () => Promise<void>
}

export function useConfirm () {
  // ElMessageBox outlives the component, so force-close it on unmount via its own `done`.
  // Not ElMessageBox.close(): it closes every box and throws inside Element Plus while a confirm is in flight.
  let pendingClose: (() => void) | undefined

  onUnmounted(() => {
    pendingClose?.()
  })

  async function confirm ({
    subject,
    title = 'Confirm',
    message,
    confirmButtonText = 'Delete',
    cancelButtonText = 'Cancel',
    danger = true,
    onConfirm
  }: IUseConfirmOptions): Promise<TConfirmIntent> {
    try {
      await ElMessageBox.confirm(
        message ?? `Delete ${subject}? This action cannot be undone.`,
        title,
        {
          confirmButtonText,
          cancelButtonText,
          type: danger ? 'warning' : 'info',
          confirmButtonClass: danger ? 'el-button--danger' : undefined,
          distinguishCancelAndClose: true,
          beforeClose: (action: TMessageBoxAction, instance, done) => {
            if (action !== 'confirm') {
              done()
              return
            }

            instance.confirmButtonLoading = true
            pendingClose = done

            onConfirm()
              .then(() => {
                instance.confirmButtonLoading = false
                pendingClose = undefined
                done()
              })
              .catch(() => {
                instance.confirmButtonLoading = false
                // No done(): dialog stays open so the admin can retry; onUnmounted still closes it.
              })
          }
        }
      )

      return { confirmed: true }
    } catch (action) {
      return { confirmed: false, reason: action === 'cancel' ? 'cancel' : 'close' }
    } finally {
      pendingClose = undefined
    }
  }

  return { confirm }
}
