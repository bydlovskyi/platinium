/**
 * Entity-agnostic bulk-operations composable (GitHub issue #39, PRD-007
 * "Bulk operations"). Every list screen's checkbox column already exists
 * (`AppDataTable`'s `selectable`/`selectedRowKeys`/`selection-changed`,
 * GitHub issue #23) — this composable is what finally gives it something to
 * do, shared identically by Events, Categories and Tickets rather than each
 * view re-deriving the same selection/confirm/result plumbing.
 *
 * It knows nothing about `eventsService`/`categoriesService`/`ticketsService`
 * by name (code-conventions "composable → store → service" layering forbids
 * a composable reaching sideways into another view's service) — the caller
 * injects its own `bulk` function, keyed to whichever entity it's operating
 * on, the same way `useConfirm`'s `onConfirm` is caller-supplied.
 *
 * The single most safety-critical rule here (PRD-007: "acting on rows that
 * scrolled out of the current filter is the most dangerous bug this feature
 * could have") is that selection is scoped to the *current* `route.query` —
 * changing the search, a filter, the sort or the page must clear it, so an
 * administrator can never select a row, change the filters, and have the
 * bulk action land on a completely different set of records than the ones
 * they looked at when they selected them.
 */
type TBulkFn = (body: TBulkRequest) => Promise<TBulkResult>

interface IRunBulkOperationOptions {
  /** Constructed by the caller, e.g. `12 events` — mirrors `useConfirm`'s `subject`, just count-based instead of a single record's name. */
  confirmSubject: string
  /** Overrides the confirm dialog's default "Delete X? This action cannot be undone." wording — used for non-delete operations like archive. */
  confirmMessage?: string
  confirmButtonText?: string
  /** Non-destructive operations (e.g. archive) should pass `false`, matching `useConfirm`'s own `danger` default of `true`. */
  danger?: boolean
  /** The entity's own `service.bulk`, injected so this composable never imports a specific service (see file-level comment). */
  bulk: TBulkFn
  /** Called once the request settles (success or partial) — typically the list's `refetch`, so the table reflects the outcome. Its own returned promise (if any) is intentionally not awaited here, matching how every list view already fires `refetch` elsewhere (e.g. `Events.vue`'s `deleteEvent`). */
  onComplete: () => void | Promise<void>
}

/**
 * Owns page-scoped bulk selection state and the confirm → request → result
 * flow for one list screen. Returned as-is (not wrapped in `readonly`) so
 * `selectedIds` can bind straight to `AppDataTable`'s `selectedRowKeys` prop
 * and `selection-changed` event the same way `useListQuery`'s refs bind
 * directly to form/filter controls.
 */
export function useBulkOperations () {
  const route = useRoute()
  const { confirm } = useConfirm()

  const selectedIds = ref<string[]>([])
  const isRunning = ref(false)
  const lastResult = ref<TBulkResult>()

  function clearSelection (): void {
    selectedIds.value = []
  }

  // Bumped every time `route.query` changes — used by `runBulkOperation` as
  // a "is the response still relevant?" check (see below), alongside driving
  // the selection clear itself.
  let queryGeneration = 0

  // The single safety-critical rule this composable exists to enforce (see
  // file-level comment): any change to the URL-driven list query — search,
  // filter, sort, page or page size, all of which flow through
  // `useListQuery` into `route.query` — invalidates whatever was selected
  // against the *previous* filtered/paged view of the list.
  watch(() => route.query, () => {
    queryGeneration += 1
    clearSelection()
  })

  async function runBulkOperation (operation: TBulkOperation, options: IRunBulkOperationOptions): Promise<void> {
    const {
      confirmSubject,
      confirmMessage,
      confirmButtonText,
      danger = true,
      bulk,
      onComplete
    } = options

    await confirm({
      subject: confirmSubject,
      message: confirmMessage,
      confirmButtonText,
      danger,
      onConfirm: async () => {
        isRunning.value = true

        // Snapshotted before the request goes out — if `route.query`
        // changes while the request is in flight (search/filter/sort/page),
        // the admin is now looking at a different filtered/paged view than
        // the one the selected ids came from. The mutation itself already
        // happened against the backend regardless, but the result must not
        // be presented as if it belongs to whatever is currently on screen
        // (GitHub issue #39 follow-up fix).
        const requestGeneration = queryGeneration
        let result: TBulkResult

        try {
          result = await bulk({ ids: selectedIds.value, operation })
        } catch (error) {
          notificationService.error({
            message: 'The bulk operation could not be completed. Please try again.'
          })
          throw error
        } finally {
          isRunning.value = false
        }

        if (requestGeneration !== queryGeneration) {
          // Stale context: don't clear a selection that already got cleared
          // by the query watcher, and don't pop `BulkResultDialog` with ids
          // that no longer correspond to anything visible. The mutation did
          // run, so the admin still gets a signal — just as a toast, since a
          // toast (unlike the dialog) doesn't need to reference rows still
          // on screen.
          notificationService.info({
            message: `Bulk operation completed: ${result.succeeded.length} succeeded, ${result.failed.length} failed.`
          })
          return
        }

        lastResult.value = result
        clearSelection()
        onComplete()
      }
    })
  }

  return {
    selectedIds,
    isRunning,
    lastResult,
    clearSelection,
    runBulkOperation
  }
}
