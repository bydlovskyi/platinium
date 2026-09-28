<script lang="ts" setup generic="TOption extends object">
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
  fetchOptions: (params: IRemoteSelectFetchParams) => Promise<IRemoteSelectPage<TOption>>
  /** Resolves a preselected value that isn't on the loaded page. */
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
  option (slotProps: { option: TOption }): unknown
}>()

const modelValue = defineModel<string | undefined>()

const searchTerm = ref('')
// `shallowRef`: deep unwrapping of the unconstrained generic isn't assignable back to `TOption`.
const loadedOptions = shallowRef<TOption[]>([])
/** Resolved independently of the search so the field keeps its label mid-search. */
const selectedOption = shallowRef<TOption>()
const meta = ref<TPaginationMeta>()
const loading = ref(false)
const loadingMore = ref(false)

// Keep the selected record in the list so `el-select` can always resolve its label.
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

// Monotonic token so a slow response never overwrites a newer one.
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
    // Keep previous results; the `apiClient` interceptor surfaces the error.
  } finally {
    if (requestToken === searchRequestToken) {
      loading.value = false
    }
  }
}

// `el-select` already debounces `remote-method`; don't add a second debounce.
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

    // Superseded by a newer search.
    if (requestToken !== searchRequestToken) {
      return
    }

    const existingValues = new Set(loadedOptions.value.map(option => props.optionValue(option)))
    const newOptions = page.data.filter(option => !existingValues.has(props.optionValue(option)))

    loadedOptions.value = [...loadedOptions.value, ...newOptions]
    meta.value = page.meta
  } catch {
    // Keep loaded pages; scrolling again retries.
  } finally {
    loadingMore.value = false
  }
}

let resolveRequestValue: string | undefined

// While the preselected record is being fetched, `el-select` would show the raw id; hide the value until then.
const resolving = ref(false)

const displayedValue = computed(() => (resolving.value ? undefined : modelValue.value))

const emit = defineEmits<{
  resolved: [option: TOption]
}>()

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
  resolving.value = true

  try {
    const resolved = await props.resolveOption(value)

    // The bound value moved on before this resolved.
    if (resolveRequestValue !== value) {
      return
    }

    selectedOption.value = resolved
    emit('resolved', resolved)
  } catch {
    // Unresolvable reference: keep the raw value rather than break the form.
  } finally {
    if (resolveRequestValue === value) {
      resolving.value = false
    }
  }
}, { immediate: true })

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
    :model-value="displayedValue"
    filterable
    remote
    :remote-method="onRemoteMethod"
    :debounce="SEARCH_DEBOUNCE_MS"
    :loading="loading || resolving"
    :clearable="clearable"
    :disabled="disabled || resolving"
    :placeholder="resolving ? 'Loading…' : placeholder"
    :popper-class="popperClass"
    class="w-full"
    @update:model-value="modelValue = $event"
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
