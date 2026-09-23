<script lang="ts" setup>
const { isDark, toggleTheme } = useTheme()
</script>

<template>
  <el-tooltip :content="isDark ? 'Switch to light theme' : 'Switch to dark theme'">
    <el-button
      text
      circle
      :aria-label="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
      @click="toggleTheme"
    >
      <template #icon>
        <Icon :name="isDark ? 'sun' : 'moon'" />
      </template>
    </el-button>
  </el-tooltip>
</template>
