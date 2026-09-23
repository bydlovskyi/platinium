<script lang="ts" setup>
/**
 * Centred-card frame for anonymous routes (login) — no navigation (PRD-002
 * "Layouts"). Selected declaratively by `route.meta.layout` in `App.vue`;
 * `Login.vue` itself only renders the card content, never this wrapper.
 */
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-surface p-4">
    <el-card shadow="never" class="w-full max-w-sm" body-class="!p-8">
      <router-view />
    </el-card>
  </div>
</template>
