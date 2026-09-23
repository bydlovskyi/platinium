<script lang="ts" setup>
import { navEntries } from '@/layouts/config/nav-entries'

defineProps<{
  collapsed?: boolean
}>()

const emit = defineEmits<{
  navigate: []
}>()

const route = useRoute()

function isActive (routeName: string): boolean {
  return route.name === routeName
}
</script>

<template>
  <nav aria-label="Primary" class="flex h-full flex-col gap-1 p-3">
    <router-link
      v-for="entry in navEntries"
      :key="entry.routeName"
      :to="{ name: entry.routeName }"
      :title="collapsed ? entry.label : undefined"
      class="flex items-center gap-3 rounded-token-md px-3 py-2 text-body transition-colors"
      :class="isActive(entry.routeName)
        ? 'bg-accent/10 text-accent font-medium'
        : 'text-text-muted hover:bg-surface-raised hover:text-text-primary'"
      :aria-current="isActive(entry.routeName) ? 'page' : undefined"
      @click="emit('navigate')"
    >
      <Icon :name="entry.icon" class="size-5 shrink-0" />
      <span v-if="!collapsed" class="truncate">{{ entry.label }}</span>
    </router-link>
  </nav>
</template>
