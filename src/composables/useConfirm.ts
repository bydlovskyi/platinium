import { ElMessageBox } from 'element-plus'

import type { Action as TMessageBoxAction } from 'element-plus/es/components/message-box/src/message-box.type'

/**
 * Resolved intent of a `useConfirm` prompt. A small, explicit shape rather
 * than a boolean or a thrown/caught control-flow split — `ElMessageBox`'s
 * own promise rejects on cancel, which would force every call site to wrap
 * the call in try/catch just to tell "administrator declined" apart from
 * "the confirm handler itself threw". Resolving always, with an explicit
 * `confirmed` discriminant, keeps both outcomes on the same success path.
 */
export type TConfirmIntent =
  | { confirmed: true } |
  { confirmed: false; reason: 'cancel' | 'close' }

interface IUseConfirmOptions {
  /** The specific record's name/label, so the prompt reads "Delete event
   *  'Summer Fair'?" rather than a generic "Are you sure?" (PRD-003). */
  subject: string
  /** Defaults to a delete-shaped prompt; override for non-destructive confirmations. */
  title?: string
  message?: string
  confirmButtonText?: string
  cancelButtonText?: string
  danger?: boolean
  /** The async action to run once confirmed. While it is in flight the
   *  confirm button shows Element Plus's own loading state and stays
   *  disabled, so a slow request cannot be submitted twice. Rejecting keeps
   *  the dialog open so the administrator sees the failure and can retry;
   *  the caller is responsible for surfacing the error itself (e.g. via the
   *  response interceptor for API failures). */
  onConfirm: () => Promise<void>
}

/**
 * Shared destructive-action confirmation (GitHub issue #24, PRD-003
 * "Confirmation composable"), wrapping `ElMessageBox.confirm` so every
 * delete in the portal asks the same way: names the record, disables and
 * shows progress on the confirm button while `onConfirm` runs via
 * `beforeClose`, and resolves once to a clear, explicit intent instead of a
 * boolean thrown/caught through a rejected promise.
 */
export function useConfirm () {
  // Set only while an `onConfirm` triggered by a confirm-button click is in
  // flight (or has just failed and left the dialog deliberately open — see
  // the `.catch()` below) — i.e. exactly the window where the dialog can be
  // left stuck. `ElMessageBox` is a route-independent singleton teleported
  // to `document.body`; it is NOT torn down when the component that opened
  // it unmounts (e.g. the admin navigates away while the delete request is
  // still in flight). `pendingClose` is Element Plus's own `done` callback
  // for *this* dialog (the third argument `beforeClose` receives, which is
  // that render's `doClose`) — calling it force-closes just this dialog.
  //
  // The public `ElMessageBox.close()` API was considered instead (it needs
  // no reference threading), but it closes *every* currently open message
  // box, and — because it clears Element Plus's internal instance map
  // synchronously before the already-scheduled `action` event for a
  // `state.action === 'confirm'` dialog fires on `nextTick` — it throws an
  // unhandled `TypeError` from inside Element Plus's own promise resolution
  // for exactly this "confirm clicked, request in flight" case. Reusing the
  // per-dialog `done`/`doClose` callback we already have from `beforeClose`
  // avoids that internal race entirely, since it's the same call a normal
  // success/cancel/close already makes.
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
            // From here until `onConfirm` settles, this dialog can be left
            // stuck if the invoking component unmounts — see `onUnmounted`
            // above.
            pendingClose = done

            onConfirm()
              .then(() => {
                instance.confirmButtonLoading = false
                pendingClose = undefined
                done()
              })
              .catch(() => {
                instance.confirmButtonLoading = false
                // Intentionally still not calling `done()`: while the
                // invoking view is still mounted, the dialog stays open so
                // the administrator sees the failure and can retry or
                // cancel. `pendingClose` stays set so `onUnmounted` can still
                // force-close it if the view goes away before that happens.
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
