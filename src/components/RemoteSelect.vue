<script lang="ts" setup generic="TOption extends object">
/**
 * Generic paginated, searchable reference picker (GitHub issue #33, PRD-006
 * "Reference selectors (deep module)"). Event and category pickers are two
 * configurations of this one component, not two components — the caller
 * supplies a fetch function, a value resolver and (via the default scoped
 * slot) an option renderer; this component owns paging, incremental
 * loading and preselected-value resolution.
 *
 * Wraps `el-select` in remote mode (`filterable remote :remote-method
 * :debounce :loading`) per docs/prd/ELEMENT-PLUS.md — keyboard navigation,
 * clearing, dropdown positioning AND the search debounce are `el-select`'s
 * own (`:debounce`, 300ms default); layering a second debounce in front of
 * it would only stack an extra delay onto every keystroke.
 */
const SEARCH_DEBOUNCE_MS = 300
const SCROLL_TRIGGER_DISTANCE = 40

interface IRemoteSelectFetchParams {
  search: string
  page: number
}

interface IRemoteSelectPage<TPageOption> {
  data: TPageOption[]
  meta: TPaginationMeta
}

const props = withDefaults(defineProps<{
  /** Fetches one page of results for the given search term. */
  fetchOptions: (params: IRemoteSelectFetchParams) => Promise<IRemoteSelectPage<TOption>>
  /** Fetches a single record by identifier — resolves a preselected value absent from the loaded page. */
  resolveOption: (value: string) => Promise<TOption>
  optionValue: (option: TOption) => string
  optionLabel: (option: TOption) => string
  placeholder?: string
  clearable?: boolean
  disabled?: boolean
}>(), {
  placeholder: 'Search…',
  clearable: true,
  disabled: false
})

defineSlots<{
  /** Fills the `el-option` default slot. Falls back to the plain label when the caller doesn't need secondary detail. */
  option (slotProps: { option: TOption }): unknown
}>()

const modelValue = defineModel<string | undefined>()

const searchTerm = ref('')
// `shallowRef` rather than `ref`: `TOption` is an unconstrained generic, and
// Vue's deep `ref()` unwrapping produces a mapped type TypeScript can't
// prove is still assignable to `TOption` for an arbitrary caller-supplied
// type. Options are always replaced wholesale, never mutated in place, so
// shallow reactivity loses nothing here.
const loadedOptions = shallowRef<TOption[]>([])
/** The current value's own record, resolved independently of whatever the active search happens to return — this is what keeps the field showing a real label instead of a bare identifier while the admin is mid-search for something else. */
const selectedOption = shallowRef<TOption>()
const meta = ref<TPaginationMeta>()
const loading = ref(false)
const loadingMore = ref(false)

/**
 * Merges `selectedOption` into whatever the active search/page returned so
 * `el-select` can always resolve the bound value's label, even when the
 * selected record fell out of the current search results. Deduplicated by
 * identifier — a selected record that IS on the loaded page is not listed
 * twice.
 */
const options = computed<TOption[]>(() => {
  if (!selectedOption.value) {
    return loadedOptions.value
  }

  const selectedValue = props.optionValue(selectedOption.value)

  if (loadedOptions.value.some(option => props.optionValue(option) === selectedValue)) {
    return loadedOptions.value
  }

  return [selectedOption.value, ...loadedOptions.value]
})

const hasMore = computed(() => (meta.value ? meta.value.page < meta.value.totalPages : false))

function findLoaded (value: string): TOption | undefined {
  return loadedOptions.value.find(option => props.optionValue(option) === value)
}

// A newer search/resolve request landing after an older one already did is
// exactly the shared-form-component race the events-form and currency-input
// lessons both warn about — guard both request families with their own
// monotonic token so a slow response can never overwrite a newer one.
let searchRequestToken = 0

async function runSearch (term: string): Promise<void> {
  const requestToken = ++searchRequestToken

  loading.value = true

  try {
    const page = await props.fetchOptions({ search: term, page: 1 })

    if (requestToken !== searchRequestToken) {
      return
    }

    loadedOptions.value = page.data
    meta.value = page.meta
  } catch {
    // A failed fetch leaves whatever was previously loaded on screen rather
    // than blanking the dropdown — the caller's own fetch function (backed
    // by `apiClient`) is responsible for surfacing the failure itself, via
    // the global response interceptor.
  } finally {
    if (requestToken === searchRequestToken) {
      loading.value = false
    }
  }
}

// `el-select` already debounces before calling `:remote-method` (its own
// `debounce` prop, wired below) — a second debounce here would just stack
// two delays on every keystroke. `onRemoteMethod` only fires once the
// admin's typing has settled, so this call goes straight through.
function onRemoteMethod (term: string): void {
  searchTerm.value = term
  runSearch(term)
}

async function loadMore (): Promise<void> {
  if (loading.value || loadingMore.value || !hasMore.value || !meta.value) {
    return
  }

  const requestToken = searchRequestToken
  const nextPage = meta.value.page + 1

  loadingMore.value = true

  try {
    const page = await props.fetchOptions({ search: searchTerm.value, page: nextPage })

    // A fresh search superseded this page request — its results belong to
    // a search term nobody is looking at anymore.
    if (requestToken !== searchRequestToken) {
      return
    }

    const existingValues = new Set(loadedOptions.value.map(option => props.optionValue(option)))
    const newOptions = page.data.filter(option => !existingValues.has(props.optionValue(option)))

    loadedOptions.value = [...loadedOptions.value, ...newOptions]
    meta.value = page.meta
  } catch {
    // Leave the already-loaded pages on screen; `hasMore` still reflects
    // the last successful fetch, so scrolling again simply retries.
  } finally {
    loadingMore.value = false
  }
}

// --- Preselected-value resolution --------------------------------------------

let resolveRequestValue: string | undefined

watch(modelValue, async (value) => {
  if (!value) {
    selectedOption.value = undefined
    return
  }

  const loaded = findLoaded(value)

  if (loaded) {
    selectedOption.value = loaded
    return
  }

  if (selectedOption.value && props.optionValue(selectedOption.value) === value) {
    return
  }

  resolveRequestValue = value

  try {
    const resolved = await props.resolveOption(value)

    // The bound value moved on again before this resolved — a stale record
    // must never overwrite whatever the field is showing now.
    if (resolveRequestValue !== value) {
      return
    }

    selectedOption.value = resolved
  } catch {
    // Leave the field as-is (raw value with no matching option is better
    // than crashing the form over an unresolvable reference).
  }
}, { immediate: true })

// --- Incremental loading on scroll -------------------------------------------

const popperClass = `remote-select-popper-${useId().replace(/:/g, '')}`

const scrollWrapEl = ref<HTMLElement>()

useInfiniteScroll(scrollWrapEl, loadMore, {
  distance: SCROLL_TRIGGER_DISTANCE,
  canLoadMore: () => hasMore.value && !loading.value && !loadingMore.value
})

function onVisibleChange (visible: boolean): void {
  if (!visible) {
    scrollWrapEl.value = undefined
    return
  }

  nextTick(() => {
    scrollWrapEl.value = document
      .querySelector<HTMLElement>(`.${popperClass} .el-scrollbar__wrap`) ?? undefined
  })
}

onMounted(() => {
  runSearch('')
})
</script>

<template>
  <el-select
    v-model="modelValue"
    filterable
    remote
    :remote-method="onRemoteMethod"
    :debounce="SEARCH_DEBOUNCE_MS"
    :loading="loading"
    :clearable="clearable"
    :disabled="disabled"
    :placeholder="placeholder"
    :popper-class="popperClass"
    class="w-full"
    @visible-change="onVisibleChange"
  >
    <el-option
      v-for="option in options"
      :key="optionValue(option)"
      :value="optionValue(option)"
      :label="optionLabel(option)"
    >
      <slot name="option" :option="option">
        {{ optionLabel(option) }}
      </slot>
    </el-option>

    <template #loading>
      <p class="p-2 text-center text-caption text-text-muted">Loading…</p>
    </template>

    <template #empty>
      <p class="p-2 text-center text-caption text-text-muted">No results found.</p>
    </template>

    <template v-if="loadingMore" #footer>
      <p class="p-2 text-center text-caption text-text-muted">Loading more…</p>
    </template>
  </el-select>
</template>
