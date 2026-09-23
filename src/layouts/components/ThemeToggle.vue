<script lang="ts" setup>
const { isDark, toggleTheme } = useTheme()
</script>

<template>
  <el-tooltip :content="isDark ? 'Switch to light theme' : 'Switch to dark theme'">
    <el-button
      type="text"
      :aria-label="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
      @click="toggleTheme"
    >
      <Icon :name="isDark ? 'sun' : 'moon'" class="size-5" />
    </el-button>
  </el-tooltip>
</template>
