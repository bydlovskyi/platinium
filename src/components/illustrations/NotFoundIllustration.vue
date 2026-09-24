<script lang="ts" setup>
/**
 * Line illustration for the 404 "not found" page (GitHub issue #41, PRD
 * "Designed states"). Reads as a map pin off a broken/dashed path — "off the
 * map, lost" — distinct from `LoadFailedIllustration`'s connection motif and
 * `ForbiddenIllustration`'s barrier motif.
 *
 * Shares this family's visual language (rounded 1.5px strokes) with the
 * other four illustrations under this directory. Pure `currentColor` — the
 * consumer sets colour via a `text-*` Tailwind class.
 */
</script>

<template>
  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M14 96C30 80 40 86 52 78"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-dasharray="1 7"
    />
    <path
      d="M52 78C64 70 60 58 70 50"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-dasharray="1 7"
    />
    <path
      d="M84 26C70 26 60 36 60 49C60 65 84 90 84 90C84 90 108 65 108 49C108 36 98 26 84 26Z"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linejoin="round"
    />
    <circle cx="84" cy="49" r="10" stroke="currentColor" stroke-width="1.5" />
  </svg>
</template>
