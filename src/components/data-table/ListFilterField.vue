<script lang="ts" setup>
defineOptions({ inheritAttrs: false })

defineProps<{
  label: string
}>()

// On mobile the toolbar moves filters into a drawer, so stack full-width under a label there.
const { isMobile: isStacked } = useBreakpoint()
</script>

<template>
  <div v-if="isStacked" class="flex flex-col gap-1.5">
    <span class="text-label text-text-muted">{{ label }}</span>
    <slot />
  </div>

  <div v-else v-bind="$attrs">
    <slot />
  </div>
</template>
