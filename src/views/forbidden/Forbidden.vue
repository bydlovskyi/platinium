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
