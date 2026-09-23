<script lang="ts" setup>
/**
 * Designed 404 (PRD-002 user story 30 / issue #20). Only ever reached
 * authenticated — `not-found.routes.ts` carries `requiresAuth: true`, so it
 * renders inside `AdminLayout` (shell visible, per issue #20 acceptance
 * criteria) rather than a bare blank page. An anonymous visitor hitting the
 * same unmatched URL is redirected to login by the guard before this
 * component ever mounts, since there is no shell to show them yet.
 */
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-4 py-24 text-center">
    <Icon name="compass" class="size-12 text-text-muted" />

    <div>
      <h1 class="text-screen-heading text-text-primary">
        Page not found
      </h1>
      <p class="mt-1 text-body text-text-muted">
        The page you're looking for doesn't exist or may have been moved.
      </p>
    </div>

    <el-button type="primary" tag="router-link" :to="{ name: routeNames.home }">
      Back to dashboard
    </el-button>
  </div>
</template>
