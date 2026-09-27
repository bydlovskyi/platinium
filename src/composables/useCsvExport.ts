export const CSV_EXPORT_WARNING_THRESHOLD = 2000

type TCsvExportFn<TParams> = (params: TParams, signal?: AbortSignal) => Promise<Blob>

interface IExportCsvOptions<TParams> {
  entity: string
  exportFn: TCsvExportFn<TParams>
  // Filters/search/sort only, no page/perPage: the server exports the full filtered result.
  params: TParams
  total: number
}

const ISO_DATE_LENGTH = 'YYYY-MM-DD'.length

// Filename is built locally because the response interceptor strips headers (no Content-Disposition).
function downloadFilename (entity: string): string {
  const today = new Date().toISOString().slice(0, ISO_DATE_LENGTH)

  return `${entity}-${today}.csv`
}

function triggerDownload (blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = objectUrl
  link.download = filename
  link.click()

  URL.revokeObjectURL(objectUrl)
}

export function useCsvExport () {
  const { confirm } = useConfirm()

  const loading = ref(false)

  async function exportCsv<TParams> ({ entity, exportFn, params, total }: IExportCsvOptions<TParams>): Promise<void> {
    loading.value = true

    try {
      if (total > CSV_EXPORT_WARNING_THRESHOLD) {
        // `loading` is set before the confirm on purpose: the dialog counts as "preparing" the export.
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
