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
  <el-container class="h-screen overflow-hidden bg-surface text-text-primary">
    <el-aside
      v-if="!isMobile"
      :width="showIconOnlyRail ? '4rem' : '15rem'"
      class="border-r border-border bg-surface-raised transition-[width] duration-base"
    >
      <AppSidebar :collapsed="showIconOnlyRail" />
    </el-aside>

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

    <el-container class="min-w-0">
      <el-header
        height="4rem"
        class="flex items-center justify-between gap-4 border-b border-border bg-surface-raised"
      >
        <div class="flex items-center gap-2">
          <el-button
            v-if="isMobile"
            text
            circle
            aria-label="Open navigation"
            @click="mobileDrawerOpen = true"
          >
            <template #icon>
              <Icon name="menu" />
            </template>
          </el-button>

          <el-button
            v-if="isTablet"
            text
            circle
            :aria-label="showIconOnlyRail ? 'Expand navigation' : 'Collapse navigation'"
            @click="tabletSidebarExpanded = !tabletSidebarExpanded"
          >
            <template #icon>
              <Icon :name="showIconOnlyRail ? 'chevron-right' : 'chevron-left'" />
            </template>
          </el-button>
        </div>

        <div class="flex items-center gap-2">
          <ThemeToggle />
          <AccountMenu />
        </div>
      </el-header>

      <el-main class="min-w-0">
        <!-- Route transitions (issue #42, PRD-010 "Motion") — a short
             crossfade so navigating between screens reads as continuous
             rather than a jump-cut. `mode="out-in"` avoids the outgoing and
             incoming pages briefly overlapping/reflowing together; `:key`
             on the full path (not just the route name) so two visits to the
             same named route with different params (e.g. edit ids) still
             transition. Duration/easing come from the motion tokens mapped
             onto `--el-transition-duration*`, not a literal value, so
             reduced-motion's `0s` override (element-reset/theme.css)
             suppresses this the same way it suppresses every other mapped
             transition. -->
        <router-view #default="{ Component, route: current }">
          <Transition name="route-fade" mode="out-in">
            <component :is="Component" :key="current.fullPath" />
          </Transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>
