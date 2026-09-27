<script lang="ts" setup>
import type { IStatusDistributionEntry } from './status-distribution-bar.types'

// The bar is aria-hidden (colour only); the legend links are the accessible equivalent.
const props = defineProps<{
  entries: IStatusDistributionEntry[]
}>()

const total = computed(() => props.entries.reduce((sum, entry) => sum + entry.count, 0))

function segmentWidth (count: number): number {
  return total.value === 0 ? 0 : (count / total.value) * 100
}

function label (status: string): string {
  return STATUS_PRESENTATION[status as TStatus]?.label ?? status
}

function color (status: string): string {
  const type = STATUS_PRESENTATION[status as TStatus]?.type

  return type ? STATUS_PRESENTATION_TYPE_COLOR[type] : STATUS_PRESENTATION_TYPE_COLOR.info
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="bg-surface-raised flex h-3 w-full overflow-hidden rounded-token-sm" aria-hidden="true">
      <div
        v-for="entry in entries"
        :key="entry.status"
        class="h-full"
        :style="{ width: `${segmentWidth(entry.count)}%`, backgroundColor: color(entry.status) }"
      />
    </div>

    <ul class="flex flex-wrap gap-x-4 gap-y-2">
      <li v-for="entry in entries" :key="entry.status">
        <router-link :to="entry.to" class="text-body text-text-muted hover:text-accent flex items-center gap-2">
          <span class="size-2.5 shrink-0 rounded-token-sm" :style="{ backgroundColor: color(entry.status) }" />
          <span>{{ label(entry.status) }}</span>
          <span class="text-text-primary tabular-nums">{{ entry.count }}</span>
        </router-link>
      </li>
    </ul>
  </div>
</template>
