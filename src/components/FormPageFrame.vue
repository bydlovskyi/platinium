<script lang="ts" setup>
defineProps<{
  title: string
  loading: boolean
  loadError: boolean
  notFoundTitle: string
  notFoundSubtitle: string
}>()

const emit = defineEmits<{
  'back-requested': []
}>()
</script>

<template>
  <div class="flex flex-col gap-4">
    <PageHeader :title="title" />

    <Transition name="skeleton-fade" mode="out-in">
      <el-skeleton v-if="loading" key="skeleton" :rows="6" animated />

      <div v-else-if="loadError" key="error" class="rounded-token-md border border-border">
        <el-result icon="warning" :title="notFoundTitle" :sub-title="notFoundSubtitle">
          <template #extra>
            <el-button type="primary" @click="emit('back-requested')">
              Back to list
            </el-button>
          </template>
        </el-result>
      </div>

      <div v-else key="form">
        <slot />
      </div>
    </Transition>
  </div>
</template>
