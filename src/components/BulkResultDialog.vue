<script lang="ts" setup>
/**
 * Shared bulk-operation result dialog (GitHub issue #39, PRD-007 "Bulk
 * operations"). Events, Categories and Tickets all need the identical
 * structure — an `el-result` summary plus a table of per-identifier
 * failures — for whatever `TBulkResult` their `useBulkOperations().lastResult`
 * comes back with, so this lives once under `src/components/` rather than
 * being copy-pasted three times. Purely presentational: it renders whatever
 * `result` it is given and emits `update:modelValue` on close, no service or
 * composable knowledge of its own.
 */
const props = defineProps<{
  modelValue: boolean
  result?: TBulkResult
  /** e.g. "event"/"category"/"ticket" — used only for the dialog title. */
  entityLabel: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const succeededCount = computed(() => props.result?.succeeded.length ?? 0)
const failedCount = computed(() => props.result?.failed.length ?? 0)

const resultType = computed<'success' | 'warning' | 'error'>(() => {
  if (failedCount.value === 0) {
    return 'success'
  }

  return succeededCount.value === 0 ? 'error' : 'warning'
})

const resultTitle = computed(() => {
  if (resultType.value === 'success') {
    return 'Bulk operation completed'
  }

  return resultType.value === 'error' ? 'Bulk operation failed' : 'Bulk operation partially completed'
})

const resultSubTitle = computed(() => (
  `${succeededCount.value} succeeded, ${failedCount.value} failed`
))

function onClose (): void {
  emit('update:modelValue', false)
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="`Bulk ${entityLabel} update result`"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-result :icon="resultType" :title="resultTitle" :sub-title="resultSubTitle" />

    <el-table v-if="failedCount > 0" :data="result?.failed ?? []" class="mt-2">
      <el-table-column prop="id" label="ID" />
      <el-table-column prop="reason" label="Reason" />
      <el-table-column label="Blocking count" width="140" align="right">
        <template #default="{ row }">
          {{ (row as TBulkFailure).count ?? '—' }}
        </template>
      </el-table-column>
    </el-table>

    <template #footer>
      <el-button type="primary" @click="onClose">
        Close
      </el-button>
    </template>
  </el-dialog>
</template>
