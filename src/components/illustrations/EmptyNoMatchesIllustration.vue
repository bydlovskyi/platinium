<script lang="ts" setup>
/**
 * Line illustration for the data table's "no-matches" empty state (GitHub
 * issue #41, PRD "Designed states"). Reads as a search/filter that came up
 * empty — a magnifying glass over faint, struck-through content lines —
 * distinct from `EmptyNoDataIllustration`'s "nothing created yet" motif,
 * since records exist here but the current filters hide all of them.
 *
 * Shares this family's visual language (rounded 1.5px strokes) with the
 * other four illustrations under this directory. Pure `currentColor` — the
 * consumer sets colour via a `text-*` Tailwind class.
 */
</script>

<template>
  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="30" y="34" width="48" height="10" rx="3" stroke="currentColor" stroke-width="1.5" opacity="0.5" />
    <rect x="30" y="52" width="36" height="10" rx="3" stroke="currentColor" stroke-width="1.5" opacity="0.5" />
    <rect x="30" y="70" width="42" height="10" rx="3" stroke="currentColor" stroke-width="1.5" opacity="0.5" />
    <circle cx="66" cy="62" r="22" stroke="currentColor" stroke-width="1.5" />
    <path d="M82 78L96 92" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    <path d="M57 62H75" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
  </svg>
</template>
