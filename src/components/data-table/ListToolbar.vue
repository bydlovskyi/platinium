<script lang="ts" setup>
/**
 * Shared list toolbar (GitHub issue #24, PRD-003 "Toolbar"), placed
 * alongside `AppDataTable` as the other half of every entity list screen.
 * Search, active-filter chips and page actions are generic here; the filter
 * *controls* themselves stay entity-specific and are supplied through the
 * `#filters` slot (an entity's own `el-select`/`el-date-picker type="daterange"`
 * bound to its typed filter descriptor from `useListQuery`) — this
 * component only renders the chrome around them, never hardcodes what a
 * filter is (PRD-003: "filter shape is declared per entity... the toolbar
 * itself should accept filters as props/slots, not hardcode entity
 * filters").
 *
 * Search debounce already lives one layer down, in `useListQuery`'s
 * `watchDebounced` over its `search` ref (300ms default) — this component
 * does not add a second debounce on top of that. It only forwards
 * keystrokes via `update:search` on a plain `v-model`-style binding, so the
 * one place that decides "when does a keystroke become a request" stays the
 * composable, not the input.
 *
 * Below the tablet breakpoint (`useBreakpoint`, PRD-002) the filter slot
 * moves into an `el-drawer`, opened by an `el-button` wrapped in an
 * `el-badge` showing how many filters are currently active.
 */
interface IActiveFilterChip {
  /** Identifies which filter this chip clears — passed back on `filter-removed`. */
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

      <!-- Desktop/tablet: filter controls render inline, supplied by the entity screen. -->
      <div v-if="!isMobile" class="flex flex-wrap items-center gap-2">
        <slot name="filters" />
      </div>

      <!-- Mobile: filter controls move behind a drawer, opened by a badge
           showing how many are active so collapsing them never hides that
           a filter is in effect. Only rendered when the entity screen
           actually supplies filter controls — an entity with none (e.g.
           categories, PRD-005 "No filters") would otherwise show a button
           that opens an empty drawer. -->
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

    <!-- Active filters as individually-removable chips, plus one clear-all. -->
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
