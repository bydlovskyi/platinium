<script lang="ts" setup>
import type { IStatusDistributionEntry } from './status-distribution-bar.types'

/**
 * The dashboard's status breakdown (GitHub issue #43, PRD-010 "Dashboard
 * presentation") — a single stacked proportional distribution bar, the one
 * hand-built exception PRD-010 names explicitly because `el-progress` can
 * only render one bar per status, not several statuses' shares stacked into
 * one strip that reads as a distribution "in one glance" (issue #43
 * acceptance criteria). Built entirely from this project's own tokens (no
 * literal colour or size), reusing the exact same status->colour mapping
 * `StatusTag`/`el-progress` already ride (`STATUS_PRESENTATION`/
 * `STATUS_PRESENTATION_TYPE_COLOR`, `src/utils/status-presentation.ts`) so a
 * status never reads differently here than anywhere else in the portal.
 *
 * The bar strip itself is `aria-hidden` — a colour-only visualisation would
 * fail PRD-010's "status is never encoded by colour alone" rule on its own,
 * so the real accessible interface is the legend below/beside it: real link
 * text carrying the label and the exact count for every status, the
 * accessible text equivalent the PRD calls for.
 */
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
