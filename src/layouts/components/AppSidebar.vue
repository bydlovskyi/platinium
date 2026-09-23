<script lang="ts" setup>
import { navEntries } from '@/layouts/config/nav-entries'

/**
 * Data-driven navigation (PRD-002 "Navigation model" / issue #20): renders
 * `navEntries` rather than hardcoded per-entry markup, so PRD-007 can later
 * filter the list by role without touching this component. Highlights the
 * current route by name (`route.name`), never by path string.
 *
 * `collapsed` renders icon-only (tablet tier — AdminLayout passes
 * `isTablet`); the same component backs the desktop persistent rail, the
 * tablet icon rail and the content of the mobile drawer, per "the content
 * area is the same component in all three [tiers] — only the navigation
 * presentation changes."
 */
defineProps<{
  collapsed?: boolean
}>()

/** Fired on every nav-link click, even one that lands on the already-active
 * route (a plain `route.fullPath` watcher would miss that case) — lets the
 * mobile drawer in `AdminLayout` close itself on tap regardless of whether
 * the destination actually changes. */
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
