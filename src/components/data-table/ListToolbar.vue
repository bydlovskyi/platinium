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

const { isMobile } = useBreakpoint()
const slots = useSlots()

const isFilterDrawerOpen = ref(false)

const hasFilterControls = computed(() => slots.filters !== undefined)
const activeFilterCount = computed(() => props.activeFilters.length)
const hasActiveFilters = computed(() => activeFilterCount.value > 0)

// Search is debounced in `useListQuery`; don't debounce here too.
function onSearchInput (value: string): void {
  emit('update:search', value)
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-center gap-3">
      <el-input
        :model-value="search"
        clearable
        class="!w-full sm:!w-72"
        :placeholder="searchPlaceholder"
        aria-label="Search"
        @update:model-value="onSearchInput"
      >
        <template #prefix>
          <Icon name="search" class="size-4 text-text-muted" />
        </template>
      </el-input>

      <div v-if="!isMobile" class="flex flex-wrap items-center gap-2">
        <slot name="filters" />
      </div>

      <!-- Only when filter controls exist, so the button never opens an empty drawer. -->
      <template v-else-if="hasFilterControls">
        <el-badge :value="activeFilterCount" :hidden="!hasActiveFilters" type="primary">
          <el-button aria-label="Open filters" @click="isFilterDrawerOpen = true">
            <template #icon>
              <Icon name="filter-off" />
            </template>
            Filters
          </el-button>
        </el-badge>

        <el-drawer
          v-model="isFilterDrawerOpen"
          title="Filters"
          direction="btt"
          size="auto"
        >
          <div class="flex flex-col gap-3">
            <slot name="filters" />
          </div>
        </el-drawer>
      </template>

      <div class="ml-auto flex items-center gap-2">
        <slot name="actions" />
      </div>
    </div>

    <div v-if="hasActiveFilters" class="flex flex-wrap items-center gap-2">
      <el-tag
        v-for="chip in activeFilters"
        :key="chip.key"
        closable
        @close="emit('filter-removed', chip.key)"
      >
        {{ chip.label }}
      </el-tag>

      <el-button link @click="emit('clear-all-requested')">
        Clear all
      </el-button>
    </div>
  </div>
</template>
