<script lang="ts" setup>
/**
 * 403 page (GitHub issue #37, PRD-007 "Role-based permissions") — the
 * redirect target for a signed-in visitor whose role fails a route's
 * `meta.requiredCapability` check (`src/router/route-guard.ts`). Mirrors
 * `src/views/not-found/NotFound.vue`'s `el-result` pattern exactly, with a
 * permission-specific icon and copy.
 */
</script>

<template>
  <el-result sub-title="You don't have permission to view this page.">
    <template #icon>
      <ForbiddenIllustration class="size-24 text-text-muted" />
    </template>
    <template #title>
      <h1 class="text-screen-heading text-text-primary">
        Access denied
      </h1>
    </template>
    <template #extra>
      <el-button type="primary" tag="router-link" :to="{ name: routeNames.home }">
        Back to dashboard
      </el-button>
    </template>
  </el-result>
</template>
