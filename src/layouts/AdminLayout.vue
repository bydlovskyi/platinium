<script lang="ts" setup>
import AccountMenu from '@/layouts/components/AccountMenu.vue'
import AppSidebar from '@/layouts/components/AppSidebar.vue'
import ThemeToggle from '@/layouts/components/ThemeToggle.vue'

/**
 * The authenticated shell (PRD-002 "A shell that adapts rather than
 * collapses" / issue #20): sidebar + header row + content area + account
 * menu + theme toggle. Selected declaratively by `route.meta.layout` in
 * `App.vue` — `Home.vue` and every future authenticated route never import
 * this directly.
 *
 * `router-view` lives *inside* this shell (not the other way around) so the
 * sidebar/header stay mounted across navigations — a page's data loading
 * never looks like a full reload (PRD-002 user story 31).
 *
 * Responsive presentation, backed by `useBreakpoint` (no ad-hoc window
 * listeners):
 * - desktop: persistent full-width sidebar rail.
 * - tablet: the same `AppSidebar`, collapsed to icon-only; a toggle button
 *   recovers full width.
 * - mobile: `AppSidebar` moves inside an `el-drawer` behind a hamburger —
 *   focus trapping and Escape-to-close are inherited from Element Plus
 *   rather than reimplemented, and the drawer closes on every navigation.
 */
const { isMobile, isTablet } = useBreakpoint()

const mobileDrawerOpen = ref(false)
const tabletSidebarExpanded = ref(false)

const showIconOnlyRail = computed(() => isTablet.value && !tabletSidebarExpanded.value)

const route = useRoute()

watch(() => route.fullPath, () => {
  mobileDrawerOpen.value = false
})
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-surface text-text-primary">
    <aside
      v-if="!isMobile"
      class="shrink-0 border-r border-border bg-surface-raised transition-[width] duration-base"
      :class="showIconOnlyRail ? 'w-16' : 'w-60'"
    >
      <AppSidebar :collapsed="showIconOnlyRail" />
    </aside>

    <el-drawer
      v-if="isMobile"
      v-model="mobileDrawerOpen"
      direction="ltr"
      size="16rem"
      title="Navigation"
      class="admin-shell-mobile-drawer"
    >
      <AppSidebar @navigate="mobileDrawerOpen = false" />
    </el-drawer>

    <div class="flex min-w-0 flex-1 flex-col">
      <header
        class="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface-raised px-4"
      >
        <div class="flex items-center gap-2">
          <button
            v-if="isMobile"
            type="button"
            aria-label="Open navigation"
            class="flex size-9 items-center justify-center rounded-token-md text-text-muted
              hover:bg-surface hover:text-text-primary"
            @click="mobileDrawerOpen = true"
          >
            <Icon name="menu" class="size-5" />
          </button>

          <button
            v-if="isTablet"
            type="button"
            :aria-label="showIconOnlyRail ? 'Expand navigation' : 'Collapse navigation'"
            class="flex size-9 items-center justify-center rounded-token-md text-text-muted
              hover:bg-surface hover:text-text-primary"
            @click="tabletSidebarExpanded = !tabletSidebarExpanded"
          >
            <Icon :name="showIconOnlyRail ? 'chevron-right' : 'chevron-left'" class="size-5" />
          </button>
        </div>

        <div class="flex items-center gap-2">
          <ThemeToggle />
          <AccountMenu />
        </div>
      </header>

      <main class="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <router-view />
      </main>
    </div>
  </div>
</template>
