/**
 * Entity-agnostic CSV export composable (GitHub issue #40, PRD-007 "CSV
 * export"). Every list screen's toolbar gets one "Export CSV" `el-button` —
 * this composable is the shared confirm/request/download plumbing behind it,
 * mirroring `useBulkOperations`'s shape: it knows nothing about
 * `eventsService`/`categoriesService`/`ticketsService` by name (layering
 * forbids a composable reaching sideways into another view's service), so the
 * caller injects its own `exportFn`, keyed to whichever entity it's
 * exporting, the same way `useBulkOperations`'s `bulk` is caller-supplied.
 *
 * The server (`src/mocks/handlers/csv.ts`, already merged) always returns the
 * FULL filtered and sorted result for `format=csv`, never just the current
 * page — this composable therefore takes the current filters/search/sort
 * query (NOT page/perPage) and forwards it unchanged, so the exported file
 * and the on-screen query can never disagree (PRD-007).
 */

/**
 * Row-count threshold above which the administrator is warned before an
 * export starts (PRD-007: "a documented row threshold"). 2,000 rows is a
 * CSV a spreadsheet still opens instantly and a mocked in-memory backend
 * serialises without a noticeable delay — comfortably above what any single
 * filtered view in the seeded dataset returns in normal use, so the warning
 * only fires for a deliberately broad, unfiltered export the administrator
 * should think twice about.
 */
export const CSV_EXPORT_WARNING_THRESHOLD = 2000

type TCsvExportFn<TParams> = (params: TParams, signal?: AbortSignal) => Promise<Blob>

interface IExportCsvOptions<TParams> {
  /** Singular/plural-agnostic label used in the warning dialog, e.g. `"events"`. */
  entity: string
  /** The entity's own `service.exportCsv`, injected so this composable never imports a specific service (see file-level comment). */
  exportFn: TCsvExportFn<TParams>
  /** The list's current filters/search/sort — everything the request needs EXCEPT `page`/`perPage`, since the export always covers the full filtered result. */
  params: TParams
  /** The current filtered result's total row count (`meta.total`), used only for the threshold check below — never sent to the server. */
  total: number
}

const ISO_DATE_LENGTH = 'YYYY-MM-DD'.length

/** Matches `csvContentDisposition` in `src/mocks/handlers/csv.ts` exactly: `<entity>-<today ISO date>.csv`. */
function downloadFilename (entity: string): string {
  const today = new Date().toISOString().slice(0, ISO_DATE_LENGTH)

  return `${entity}-${today}.csv`
}

/**
 * Triggers a real browser download of `blob` named `filename`: a temporary
 * object URL, a hidden `<a download>` clicked programmatically, then revoked.
 *
 * The filename is built locally (see {@link downloadFilename}) rather than
 * read off the response's `Content-Disposition` header — the global response
 * interceptor (`src/features/platform/api/interceptors/response.interceptor.ts`)
 * unconditionally unwraps every response to `response.data`, discarding
 * headers, for every call site in the app. Reading the header here would mean
 * either bypassing `apiClient`'s shared interceptor for this one call or
 * changing that shared plumbing — both out of scope for this slice — so the
 * filename is reconstructed instead, using the exact same `entity`-plus-date
 * format the mock's `csvContentDisposition` already produces.
 */
function triggerDownload (blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = objectUrl
  link.download = filename
  link.click()

  URL.revokeObjectURL(objectUrl)
}

/**
 * Owns the confirm → request → download flow for one list screen's CSV
 * export. Returned as-is (not wrapped in `readonly`) so `loading` can bind
 * straight to the toolbar's `el-button :loading`, mirroring
 * `useBulkOperations`'s `isRunning`.
 */
export function useCsvExport () {
  const { confirm } = useConfirm()

  const loading = ref(false)

  async function exportCsv<TParams> ({ entity, exportFn, params, total }: IExportCsvOptions<TParams>): Promise<void> {
    loading.value = true

    try {
      if (total > CSV_EXPORT_WARNING_THRESHOLD) {
        // `loading` is already `true` at this point (see below) rather than
        // only once the network request starts — PRD-007's acceptance
        // criterion is "progress shown while the export is prepared", and
        // for a large export the confirm step IS part of preparing it: the
        // administrator asked for the export the moment they clicked the
        // button, and the button should stop looking idle immediately rather
        // than sitting still until they've also answered a dialog. If they
        // cancel, `loading` is cleared in the `finally` below same as any
        // other early return.
        const intent = await confirm({
          subject: entity,
          title: 'Large export',
          message: `This export contains ${total} rows and may take a moment to prepare. Continue?`,
          confirmButtonText: 'Export',
          danger: false,
          onConfirm: () => Promise.resolve()
        })

        if (!intent.confirmed) {
          return
        }
      }

      const blob = await exportFn(params)

      triggerDownload(blob, downloadFilename(entity))
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    exportCsv
  }
}
