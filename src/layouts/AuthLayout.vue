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
        <!-- Route transitions (issue #42, PRD-010 "Motion") — same
             `route-fade` crossfade as `AdminLayout.vue`'s `router-view`
             (shared CSS in base.css), applied here too so navigating within
             the anonymous shell (login variants) is consistent with the
             authenticated shell rather than a special case. -->
        <router-view #default="{ Component, route: current }">
          <Transition name="route-fade" mode="out-in">
            <component :is="Component" :key="current.fullPath" />
          </Transition>
        </router-view>
      </el-card>
    </div>
  </div>
</template>
