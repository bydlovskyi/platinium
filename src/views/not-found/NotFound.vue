<template>
  <el-result sub-title="The page you're looking for doesn't exist or may have been moved.">
    <template #icon>
      <Icon name="compass" class="size-12 text-text-muted" />
    </template>
    <template #title>
      <h1 class="text-screen-heading text-text-primary">
        Page not found
      </h1>
    </template>
    <template #extra>
      <el-button type="primary" tag="router-link" :to="{ name: routeNames.home }">
        Back to dashboard
      </el-button>
    </template>
  </el-result>
</template>
