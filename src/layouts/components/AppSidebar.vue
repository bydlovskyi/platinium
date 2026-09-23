<script lang="ts" setup>
import { navEntries } from '@/layouts/config/nav-entries'

/**
 * Primary navigation, rendered from the declared entry list (PRD-002
 * "Navigation model") through `el-menu`. `:collapse` gives the tablet icon
 * rail (Element Plus shows the label in a tooltip), and navigation goes
 * through `router.push({ name })` in `@select` rather than `el-menu`'s
 * `router` mode, which navigates by path string.
 */
defineProps<{
  collapsed?: boolean
}>()

const emit = defineEmits<{
  navigate: []
}>()

const route = useRoute()
const router = useRouter()

const activeRouteName = computed(() => String(route.name ?? ''))

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
