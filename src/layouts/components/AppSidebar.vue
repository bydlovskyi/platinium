<script lang="ts" setup>
import { navEntries } from '@/layouts/config/nav-entries'

defineProps<{
  collapsed?: boolean
}>()

const emit = defineEmits<{
  navigate: []
}>()

const route = useRoute()
const router = useRouter()

const activeRouteName = computed(() => String(route.name ?? ''))

// Named-route push rather than `el-menu`'s path-based `router` mode.
async function onSelect (routeName: string): Promise<void> {
  emit('navigate')
  await router.push({ name: routeName })
}
</script>

<template>
  <nav aria-label="Primary" class="flex h-full flex-col">
    <router-link
      :to="{ name: routeNames.home }"
      aria-label="Ticket Admin home"
      class="flex h-16 shrink-0 items-center gap-3 border-b border-border px-5"
      :class="{ 'justify-center !px-0': collapsed }"
      @click="emit('navigate')"
    >
      <img src="/favicon.svg" alt="" class="size-8 shrink-0">
      <span v-if="!collapsed" class="truncate font-semibold text-text-primary">Ticket Admin</span>
    </router-link>

    <el-scrollbar class="min-h-0 flex-1">
      <el-menu
        :default-active="activeRouteName"
        :collapse="collapsed"
        :collapse-transition="false"
        class="!border-r-0 !bg-transparent"
        @select="onSelect"
      >
        <el-menu-item
          v-for="entry in navEntries"
          :key="entry.routeName"
          :index="entry.routeName"
          :aria-current="activeRouteName === entry.routeName ? 'page' : undefined"
          :aria-label="collapsed ? entry.label : undefined"
        >
          <el-icon>
            <Icon :name="entry.icon" />
          </el-icon>
          <template #title>
            {{ entry.label }}
          </template>
        </el-menu-item>
      </el-menu>
    </el-scrollbar>
  </nav>
</template>
