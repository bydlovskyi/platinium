<script lang="ts" setup>
/**
 * Line illustration for the data table's (and any other screen's) load-error
 * state (GitHub issue #41, PRD "Designed states"). Reads as an interrupted
 * connection between two nodes — "a condition with a way forward" — rather
 * than a generic warning triangle, matching the retry affordance that always
 * accompanies it (`AppDataTable.vue`'s error `el-result`).
 *
 * Shares this family's visual language (rounded 1.5px strokes) with the
 * other four illustrations under this directory. Pure `currentColor` — the
 * consumer sets colour via a `text-*` Tailwind class.
 */
</script>

<template>
  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="28" cy="60" r="12" stroke="currentColor" stroke-width="1.5" />
    <circle cx="92" cy="60" r="12" stroke="currentColor" stroke-width="1.5" />
    <path d="M40 60H50" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    <path d="M70 60H80" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    <path
      d="M56 52L60 68L64 56L68 68"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M60 30V38M60 82V90"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-dasharray="1 5"
    />
  </svg>
</template>
