<script lang="ts" setup>
import type { RouteLocationRaw } from 'vue-router'

interface IBlockingLink {
  to: RouteLocationRaw
  label: string
}

const props = defineProps<{
  modelValue: boolean
  result?: TBulkResult
  entityLabel: string
  /** Failed rows are listed by name; ids are only a fallback. */
  names?: Record<string, string>
  blockingLink?: (failure: TBulkFailure) => IBlockingLink | undefined
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

const failureRows = computed(() => (props.result?.failed ?? []).map(failure => ({
  id: failure.id,
  name: props.names?.[failure.id] ?? failure.id,
  reason: failure.reason,
  link: props.blockingLink?.(failure)
})))

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
    class="bulk-result-dialog"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-result :icon="resultType" :title="resultTitle" :sub-title="resultSubTitle" />

    <ul v-if="failedCount > 0" class="mt-2 divide-y divide-border border-y border-border">
      <li
        v-for="row in failureRows"
        :key="row.id"
        class="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
      >
        <div class="min-w-0">
          <p class="truncate font-medium text-text-primary">
            {{ row.name }}
          </p>
          <p class="text-caption text-text-muted">
            {{ row.reason }}
          </p>
        </div>

        <el-button
          v-if="row.link"
          tag="router-link"
          :to="row.link.to"
          size="small"
          class="self-start sm:self-center"
          @click="onClose"
        >
          {{ row.link.label }}
        </el-button>
      </li>
    </ul>

    <template #footer>
      <el-button type="primary" @click="onClose">
        Close
      </el-button>
    </template>
  </el-dialog>
</template>

<style>
/* A long failure list must scroll inside the dialog: otherwise the title and Close button leave the viewport.
   No `--el-*` variable controls the body height, hence the class override. */
.bulk-result-dialog:not(.is-fullscreen) {
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 2 * var(--el-dialog-margin-top, 15vh));
}

.bulk-result-dialog:not(.is-fullscreen) .el-dialog__body {
  min-height: 0;
  overflow-y: auto;
}
</style>
