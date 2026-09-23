<script lang="ts" setup>
/**
 * Centred-card frame for anonymous routes (login) — no navigation (PRD-002
 * "Layouts"). Selected declaratively by `route.meta.layout` in `App.vue`;
 * `Login.vue` itself only renders the card content, never this wrapper.
 */
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-surface p-4">
    <div class="w-full max-w-sm rounded-lg border border-border bg-surface-raised p-8 shadow-token-md">
      <router-view />
    </div>
  </div>
</template>
