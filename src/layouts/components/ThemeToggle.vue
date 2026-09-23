<script lang="ts" setup>
/**
 * Light/dark toggle in the shell header (PRD-002 "Theme" / issue #20),
 * backed entirely by `useTheme` (VueUse's `useColorMode`) — this component
 * owns no persistence or system-preference logic of its own.
 */
const { isDark, toggleTheme } = useTheme()
</script>

<template>
  <el-tooltip :content="isDark ? 'Switch to light theme' : 'Switch to dark theme'">
    <button
      type="button"
      class="flex size-9 items-center justify-center rounded-token-md text-text-muted transition-colors
        hover:bg-surface-raised hover:text-text-primary"
      :aria-label="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
      @click="toggleTheme"
    >
      <Icon :name="isDark ? 'sun' : 'moon'" class="size-5" />
    </button>
  </el-tooltip>
</template>
