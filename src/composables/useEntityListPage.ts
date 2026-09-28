import type { RouteLocationRaw } from 'vue-router'

import type { IDataTableRowAction } from '@/components/data-table/data-table.types'
import type { TCapabilityEntity } from '@/composables/useCapability'

interface IEntityListPageService<TQuery> {
  delete: (id: string) => Promise<void>
  bulk: (body: TBulkRequest) => Promise<TBulkResult>
  exportCsv: (params: Omit<TQuery, 'page' | 'perPage'>) => Promise<Blob>
}

interface IEntityListPageList<TRow, TQuery> {
  data: Ref<TRow[]>
  meta: Ref<TPaginationMeta | undefined>
  page: Ref<number>
  query: Ref<TQuery>
  setPage: (page: number) => Promise<void>
  refetch: () => Promise<void>
}

interface INamedRow {
  id: string
  name: string
}

interface IPagedQuery {
  page?: number
  perPage?: number
}

interface IUseEntityListPageOptions<TRow extends INamedRow, TQuery extends IPagedQuery> {
  entity: TCapabilityEntity
  label: { singular: string; plural: string }
  list: IEntityListPageList<TRow, TQuery>
  service: IEntityListPageService<TQuery>
  /** Omitted when the entity has no status to archive. */
  archive?: { message: string }
  /** Where a delete blocked by dependent records links to; omitted for leaf entities. */
  blockingRecordsRoute?: (id: string) => RouteLocationRaw
}

// Everything a list page does besides declaring its columns and filters: row actions, single and bulk
// delete, bulk archive, CSV export and the selection that feeds them.
export function useEntityListPage<TRow extends INamedRow, TQuery extends IPagedQuery> (
  options: IUseEntityListPageOptions<TRow, TQuery>
) {
  const { entity, label, list, service, archive, blockingRecordsRoute } = options

  const { confirm } = useConfirm()
  const { canDo } = useCapability()
  const { notifyDependencyConflict } = useDependencyConflictNotice()
  const { loading: csvExportLoading, exportCsv: runCsvExport } = useCsvExport()
  const {
    selectedIds,
    isRunning: bulkRunning,
    lastResult: bulkResult,
    resultVisible: bulkResultVisible,
    clearSelection,
    runBulkOperation
  } = useBulkOperations()
  const { leavingRowKeys, removeRows } = useRowRemoval({
    rows: list.data,
    page: list.page,
    setPage: list.setPage,
    refetch: list.refetch
  })

  const canCreate = computed(() => canDo(entity, 'create'))
  const canBulkDelete = computed(() => canDo(entity, 'delete'))
  const canBulkArchive = computed(() => archive !== undefined && canDo(entity, 'update'))
  // Selection only exists to feed the bulk bar, so a viewer never sees checkboxes.
  const canSelectRows = computed(() => canBulkDelete.value || canBulkArchive.value)

  function rowKey (row: TRow): string {
    return row.id
  }

  // Filtered, not disabled: AppDataTable renders rowActions as given, so this keeps viewer-forbidden actions out of the DOM.
  const rowActions = computed<IDataTableRowAction<TRow>[]>(() => {
    const actions: IDataTableRowAction<TRow>[] = []

    if (canDo(entity, 'update')) {
      actions.push({ key: 'edit', label: 'Edit' })
    }

    if (canDo(entity, 'delete')) {
      actions.push({ key: 'delete', label: 'Delete', danger: true })
    }

    return actions
  })

  function selectionSubject (): string {
    const count = selectedIds.value.length

    return `${count} ${count === 1 ? label.singular : label.plural}`
  }

  async function bulkDelete (): Promise<void> {
    await runBulkOperation('delete', {
      confirmSubject: selectionSubject(),
      bulk: body => service.bulk(body),
      onComplete: () => removeRows(bulkResult.value?.succeeded ?? [])
    })
  }

  async function bulkArchive (): Promise<void> {
    if (archive === undefined) {
      return
    }

    await runBulkOperation('archive', {
      confirmSubject: selectionSubject(),
      confirmMessage: `Archive ${selectionSubject()}? ${archive.message}`,
      confirmButtonText: 'Archive',
      danger: false,
      bulk: body => service.bulk(body),
      onComplete: list.refetch
    })
  }

  // Re-throws on 409 so useConfirm keeps the dialog open.
  async function deleteRow (row: TRow): Promise<void> {
    await confirm({
      subject: row.name,
      onConfirm: async () => {
        try {
          await service.delete(row.id)
        } catch (error) {
          if (blockingRecordsRoute) {
            notifyDependencyConflict(error, { entity: label.singular, to: blockingRecordsRoute(row.id) })
          }

          throw error
        }

        notificationService.success({ message: `${capitalise(label.singular)} deleted.` })

        await removeRows([row.id])
      }
    })
  }

  function exportCsv (): void {
    const { page: _page, perPage: _perPage, ...params } = list.query.value

    // The interceptor already toasts failures; this only prevents an unhandled rejection.
    runCsvExport({
      entity: label.plural,
      exportFn: exportParams => service.exportCsv(exportParams),
      params,
      total: list.meta.value?.total ?? 0
    }).catch(() => undefined)
  }

  function onSelectionChanged (keys: string[]): void {
    selectedIds.value = keys
  }

  const bulkResultNames = computed(() => Object.fromEntries(list.data.value.map(row => [row.id, row.name])))

  function bulkBlockingLink (failure: TBulkFailure): { to: RouteLocationRaw; label: string } | undefined {
    if (blockingRecordsRoute === undefined || failure.code !== 'CONFLICT' || failure.count === undefined) {
      return undefined
    }

    return {
      to: blockingRecordsRoute(failure.id),
      label: `View ${failure.count} ticket${failure.count === 1 ? '' : 's'}`
    }
  }

  return {
    canCreate,
    canSelectRows,
    canBulkDelete,
    canBulkArchive,
    rowKey,
    rowActions,
    selectedIds,
    bulkRunning,
    bulkResult,
    bulkResultVisible,
    bulkResultNames,
    bulkBlockingLink,
    clearSelection,
    leavingRowKeys,
    bulkDelete,
    bulkArchive,
    deleteRow,
    csvExportLoading,
    exportCsv,
    onSelectionChanged
  }
}

function capitalise (value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
