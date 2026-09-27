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
const { role } = useCapability()

const activeRouteName = computed(() => String(route.name ?? ''))

const visibleNavEntries = computed(() => (
  navEntries.filter(entry => entry.requiresRole === undefined || entry.requiresRole === role.value)
))

// Named-route push rather than `el-menu`'s path-based `router` mode.
async function onSelect (routeName: string): Promise<void> {
  emit('navigate')
  await router.push({ name: routeName })
}
</script>

<template>
  <nav aria-label="Primary" class="h-full">
    <el-scrollbar>
      <el-menu
        :default-active="activeRouteName"
        :collapse="collapsed"
        :collapse-transition="false"
        class="!border-r-0 !bg-transparent"
        @select="onSelect"
      >
        <el-menu-item
          v-for="entry in visibleNavEntries"
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
