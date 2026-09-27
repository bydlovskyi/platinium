<script lang="ts" setup>
interface IActiveFilterChip {
  key: string
  label: string
}

const props = withDefaults(defineProps<{
  search: string
  activeFilters?: IActiveFilterChip[]
  searchPlaceholder?: string
}>(), {
  activeFilters: () => [],
  searchPlaceholder: 'Search…'
})

const emit = defineEmits<{
  'update:search': [value: string]
  'filter-removed': [key: string]
  'clear-all-requested': []
}>()

// Same threshold as AppDataTable's cards, so filters move into the drawer together with the table.
const { isCompact } = useBreakpoint()
const slots = useSlots()

const isFilterDrawerOpen = ref(false)

const hasFilterControls = computed(() => slots.filters !== undefined)
const hasSortControl = computed(() => slots.sort !== undefined)
const hasDrawerControls = computed(() => hasFilterControls.value || hasSortControl.value)
const activeFilterCount = computed(() => props.activeFilters.length)
const hasActiveFilters = computed(() => activeFilterCount.value > 0)

// Search is debounced in `useListQuery`; don't debounce here too.
function onSearchInput (value: string): void {
  emit('update:search', value)
}
</script>

<template>
  <div class="flex flex-col gap-3 rounded-token-lg border border-border bg-surface-raised p-3 shadow-token-sm">
    <div class="flex items-center gap-2">
      <el-input
        :model-value="search"
        clearable
        class="min-w-0 flex-1 md:max-w-sm"
        :placeholder="searchPlaceholder"
        aria-label="Search"
        @update:model-value="onSearchInput"
      >
        <template #prefix>
          <Icon name="search" class="size-4 text-text-muted" />
        </template>
      </el-input>

      <div v-if="!isCompact && hasSortControl" class="ml-auto flex items-center gap-2">
        <slot name="sort" />
      </div>

      <el-badge
        v-else-if="isCompact && hasDrawerControls"
        :value="activeFilterCount"
        :hidden="!hasActiveFilters"
        type="primary"
      >
        <el-button aria-label="Open filters" @click="isFilterDrawerOpen = true">
          <template #icon>
            <Icon name="filter" />
          </template>
          Filters
        </el-button>
      </el-badge>
    </div>

    <div
      v-if="!isCompact && hasFilterControls"
      class="flex flex-wrap items-center gap-2"
      role="group"
      aria-label="Filters"
    >
      <slot name="filters" />
    </div>

    <div v-if="hasActiveFilters" class="flex flex-wrap items-center gap-2 border-t border-border-subtle pt-3">
      <el-tag
        v-for="chip in activeFilters"
        :key="chip.key"
        closable
        @close="emit('filter-removed', chip.key)"
      >
        {{ chip.label }}
      </el-tag>

      <el-button link type="primary" @click="emit('clear-all-requested')">
        Clear all
      </el-button>
    </div>

    <el-drawer
      v-if="isCompact && hasDrawerControls"
      v-model="isFilterDrawerOpen"
      title="Filters"
      direction="btt"
      size="auto"
    >
      <div class="flex flex-col gap-4">
        <slot name="filters" />
        <slot name="sort" />
      </div>

      <template #footer>
        <div class="flex gap-2">
          <el-button class="flex-1" :disabled="!hasActiveFilters" @click="emit('clear-all-requested')">
            Clear all
          </el-button>
          <el-button type="primary" class="!ml-0 flex-1" @click="isFilterDrawerOpen = false">
            Show results
          </el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>
