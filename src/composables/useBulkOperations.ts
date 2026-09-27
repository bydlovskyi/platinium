type TBulkFn = (body: TBulkRequest) => Promise<TBulkResult>

interface IRunBulkOperationOptions {
  confirmSubject: string
  confirmMessage?: string
  confirmButtonText?: string
  danger?: boolean
  bulk: TBulkFn
  onComplete: () => void | Promise<void>
}

export function useBulkOperations () {
  const route = useRoute()
  const { confirm } = useConfirm()

  const selectedIds = ref<string[]>([])
  const isRunning = ref(false)
  const lastResult = ref<TBulkResult>()

  function clearSelection (): void {
    selectedIds.value = []
  }

  let queryGeneration = 0

  // Selection must never survive a query change, or a bulk action could hit rows no longer on screen.
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

        // If the query changes mid-request, the result no longer belongs to what is on screen.
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
          // Stale: show a toast instead of BulkResultDialog, whose ids are no longer visible.
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
