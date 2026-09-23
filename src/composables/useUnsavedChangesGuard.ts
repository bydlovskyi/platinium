import { ElMessageBox } from 'element-plus'
import { onBeforeRouteLeave } from 'vue-router'

/**
 * Generic unsaved-changes guard (GitHub issue #27, PRD-004 "Unsaved-changes
 * guard composable"). Built here rather than inside `views/events/` because
 * PRD-005 (categories) and PRD-006 (tickets) reuse it unchanged against
 * their own forms — a composable that only one view can import would have to
 * be duplicated or promoted later, and promoting a composable after two
 * copies already exist is exactly the smell `code-conventions` warns about.
 * Lives in `src/composables/` (global, auto-imported), not
 * `src/views/events/composables/`, per `architecture.md`'s "Composable
 * layer" — nothing here is events-specific, it only needs a boolean "is this
 * dirty" signal from the caller.
 *
 * Two independent leave paths are covered because they are genuinely
 * different browser mechanisms:
 * - in-app navigation (clicking "Cancel", the back button, a sidebar link)
 *   goes through Vue Router and is intercepted by `onBeforeRouteLeave`,
 *   which can show a real, styled `ElMessageBox.confirm` and cancel the
 *   navigation outright;
 * - leaving the page itself (closing the tab, refreshing, typing a new URL)
 *   never reaches Vue Router at all, so it's covered separately by the
 *   native `beforeunload` event, whose confirmation UI is the browser's own
 *   and cannot be styled or replaced by `ElMessageBox`.
 */
interface IUseUnsavedChangesGuardOptions {
  /** Reactive dirty signal — true while there is unsaved work the administrator would lose by leaving. */
  isDirty: Ref<boolean>
  /** Prompt copy shown in the in-app `ElMessageBox.confirm`. */
  message?: string
}

const DEFAULT_MESSAGE = 'You have unsaved changes. Leave this page and discard them?'

export function useUnsavedChangesGuard ({ isDirty, message = DEFAULT_MESSAGE }: IUseUnsavedChangesGuardOptions) {
  function onBeforeUnload (event: BeforeUnloadEvent): void {
    if (!isDirty.value) {
      return
    }

    // The modern way to trigger the browser's own native confirmation
    // prompt; the string return value is a legacy fallback some browsers
    // still read but none render the caller-supplied text anymore.
    event.preventDefault()
    event.returnValue = ''
  }

  window.addEventListener('beforeunload', onBeforeUnload)

  onUnmounted(() => {
    window.removeEventListener('beforeunload', onBeforeUnload)
  })

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

  /** Marks the tracked state as saved/clean — call after a successful save so the post-save navigation doesn't re-trigger the prompt. */
  function markClean (): void {
    isDirty.value = false
  }

  return { markClean }
}
