import { ElMessageBox } from 'element-plus'
import { onBeforeRouteLeave } from 'vue-router'

interface IUseUnsavedChangesGuardOptions {
  isDirty: Ref<boolean>
  message?: string
  // Pass `false` for dialog-hosted forms: no route change happens on close; wire `:before-close` instead.
  guardRouteLeave?: boolean
}

const DEFAULT_MESSAGE = 'You have unsaved changes. Leave this page and discard them?'

export function useUnsavedChangesGuard ({
  isDirty,
  message = DEFAULT_MESSAGE,
  guardRouteLeave = true
}: IUseUnsavedChangesGuardOptions) {
  function onBeforeUnload (event: BeforeUnloadEvent): void {
    if (!isDirty.value) {
      return
    }

    // Browsers show their own generic prompt; the custom text is ignored.
    event.preventDefault()
    event.returnValue = ''
  }

  window.addEventListener('beforeunload', onBeforeUnload)

  onUnmounted(() => {
    window.removeEventListener('beforeunload', onBeforeUnload)
  })

  if (guardRouteLeave) {
    onBeforeRouteLeave(async () => {
      if (!isDirty.value) {
        return true
      }

      try {
        await ElMessageBox.confirm(message, 'Unsaved changes', {
          confirmButtonText: 'Leave',
          cancelButtonText: 'Stay',
          type: 'warning',
          distinguishCancelAndClose: true
        })

        return true
      } catch {
        return false
      }
    })
  }

  function markClean (): void {
    isDirty.value = false
  }

  return { markClean }
}
