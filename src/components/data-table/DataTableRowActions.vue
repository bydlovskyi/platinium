<script lang="ts" setup generic="TRow extends Record<string, unknown>">
import type { IDataTableRowAction } from './data-table.types'

const props = defineProps<{
  row: TRow
  actions: IDataTableRowAction<TRow>[]
  /** Names the row for assistive tech, e.g. "Actions for Summer Jazz Festival". */
  rowLabel: string
}>()

const emit = defineEmits<{
  invoked: [action: IDataTableRowAction<TRow>]
}>()

function isDisabled (action: IDataTableRowAction<TRow>): boolean {
  return action.disabled ? action.disabled(props.row) : false
}

function onActionClick (action: IDataTableRowAction<TRow>): void {
  if (!isDisabled(action)) {
    emit('invoked', action)
  }
}
</script>

<template>
  <el-dropdown trigger="click" placement="bottom-end">
    <el-button text circle :aria-label="`Actions for ${rowLabel}`">
      <template #icon>
        <Icon name="more" />
      </template>
    </el-button>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item
          v-for="action in actions"
          :key="action.key"
          :disabled="isDisabled(action)"
          :divided="action.danger"
          :class="{ '!text-danger': action.danger }"
          @click="onActionClick(action)"
        >
          <Icon v-if="action.icon" :name="action.icon" class="mr-2 size-4" />
          {{ action.label }}
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>
