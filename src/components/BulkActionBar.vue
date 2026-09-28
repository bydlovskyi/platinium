<script lang="ts" setup>
withDefaults(defineProps<{
  selectedCount: number
  canDelete?: boolean
  canArchive?: boolean
  running?: boolean
}>(), {
  canDelete: false,
  canArchive: false,
  running: false
})

const emit = defineEmits<{
  'delete-requested': []
  'archive-requested': []
  'clear-requested': []
}>()
</script>

<template>
  <el-affix v-if="selectedCount > 0" position="bottom" :offset="16">
    <el-card shadow="always" body-class="flex flex-wrap items-center gap-2 !py-3">
      <el-tag size="large">
        {{ selectedCount }} selected on this page
      </el-tag>

      <el-button
        v-if="canDelete"
        type="danger"
        :loading="running"
        @click="emit('delete-requested')"
      >
        Delete
      </el-button>

      <el-button
        v-if="canArchive"
        :loading="running"
        @click="emit('archive-requested')"
      >
        Archive
      </el-button>

      <el-button link @click="emit('clear-requested')">
        Clear selection
      </el-button>
    </el-card>
  </el-affix>
</template>
