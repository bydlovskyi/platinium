<script lang="ts" setup>
/**
 * Line illustration for the 403 "forbidden" page (GitHub issue #41, PRD
 * "Designed states"). Reads as a locked padlock behind a barrier line —
 * distinct from the other four illustrations under this directory, all of
 * which describe an empty/failed/lost condition rather than a permission
 * boundary.
 *
 * Shares this family's visual language (rounded 1.5px strokes) with the
 * other four illustrations here. Pure `currentColor` — the consumer sets
 * colour via a `text-*` Tailwind class.
 */
</script>

<template>
  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 78H102" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="1 8" />
    <rect
      x="38"
      y="56"
      width="44"
      height="34"
      rx="6"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linejoin="round"
    />
    <path d="M46 56V44a14 14 0 0 1 28 0v12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    <circle cx="60" cy="70" r="4" fill="currentColor" />
    <path d="M60 74V80" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
  </svg>
</template>
