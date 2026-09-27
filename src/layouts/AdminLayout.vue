<script lang="ts" setup>
import AccountMenu from '@/layouts/components/AccountMenu.vue'
import AppSidebar from '@/layouts/components/AppSidebar.vue'
import ThemeToggle from '@/layouts/components/ThemeToggle.vue'

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
        <div class="mx-auto w-full max-w-screen-2xl">
          <!-- Keyed on `path`: param changes (edit ids) remount, query changes (list filters) must not. -->
          <router-view #default="{ Component, route: current }">
            <Transition name="route-fade" mode="out-in">
              <component :is="Component" :key="current.path" />
            </Transition>
          </router-view>
        </div>
      </el-main>
    </el-container>
  </el-container>
</template>
