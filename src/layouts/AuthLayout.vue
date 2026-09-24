<script lang="ts" setup>
/**
 * Centred-card frame for anonymous routes (login) — no navigation (PRD-002
 * "Layouts"). Selected declaratively by `route.meta.layout` in `App.vue`;
 * `Login.vue` itself only renders the card content, never this wrapper.
 */
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-surface p-4">
    <div class="w-full max-w-sm flex flex-col gap-6">
      <div class="flex justify-center">
        <div class="flex size-12 items-center justify-center rounded-token-lg bg-accent/10 text-accent">
          <Icon name="dashboard" class="size-6" />
        </div>
      </div>

      <el-card shadow="always" class="w-full" body-class="!p-8">
        <router-view />
      </el-card>
    </div>
  </div>
</template>
