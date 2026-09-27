<script lang="ts" setup>
const props = defineProps<{
  modelValue: boolean
  result?: TBulkResult
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

const { isMobile } = useBreakpoint()
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="`Bulk ${entityLabel} update result`"
    :fullscreen="isMobile"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-result :icon="resultType" :title="resultTitle" :sub-title="resultSubTitle" />

    <el-table v-if="failedCount > 0" :data="result?.failed ?? []" class="mt-2">
      <el-table-column prop="id" label="ID" />
      <el-table-column prop="reason" label="Reason" />
      <el-table-column label="Blocking count" width="140" align="right">
        <template #default="{ row }">
          <span class="tabular-nums">{{ (row as TBulkFailure).count ?? '—' }}</span>
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
