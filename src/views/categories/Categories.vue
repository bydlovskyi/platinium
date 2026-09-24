<script lang="ts" setup>
/**
 * Categories list screen (GitHub issue #30, PRD-005 "Ticket Categories
 * Management" — the test of whether the shared list/modal machinery from
 * PRD-003/PRD-004 makes a simple, two-field entity cheap to build). Unlike
 * `Events.vue`, create/edit are not routes: they are one dialog
 * (`CategoryModal.vue`) opened through `useModals()`, per PRD-005's explicit
 * "a form with more than three fields... gets a route; anything smaller gets
 * a dialog" rule. This view therefore owns its own header/create button
 * (mirroring `PageHeader`'s established `#actions` slot pattern) rather than
 * delegating that to a separate create route the way events does.
 */
import { DependencyConflictError } from '@/features/platform/api/interceptors/response.interceptor'

import type { IDataTableColumn, IDataTableRowAction } from '@/components/data-table/data-table.types'

const route = useRoute()
const router = useRouter()

const {
  search,
  sort,
  page,
  setSearch,
  setSort,
  setPage,
  setPerPage,
  resetFilters,
  data,
  meta,
  loading,
  error,
  refetch,
  emptyReason
} = useCategoriesList()

const { openModal } = useModals()
const { confirm } = useConfirm()
const { canDo } = useCapability()

const columns: IDataTableColumn<TCategory>[] = [
  { key: 'name', label: 'Name', sortable: true, responsivePriority: 'high' },
  { key: 'description', label: 'Description', responsivePriority: 'low' }
]

/**
 * Only `name` is a rendered column (per PRD-005, see `columns` below) —
 * `createdAt` is driven entirely by the "Sort by" `el-select` further down.
 * Passing `sort.value` through unchanged when it names `createdAt` would have
 * `AppDataTable`'s `syncSortFromProps` call the underlying `el-table.sort()`
 * with a `prop` that matches no column; Element Plus's column lookup for that
 * call fails silently, leaving whichever column's header arrow was last set
 * (e.g. "Name") stuck showing a sort that is no longer applied. Gating on
 * `field === 'name'` here means `AppDataTable` clears its own header
 * indicator instead — correct, since no column IS actually sorted in that
 * case — while the request itself is unaffected, as it comes from
 * `useCategoriesList`'s query, not from this computed.
 */
const dataTableSort = computed(() => (
  sort.value?.field === 'name' ? { field: sort.value.field, order: sort.value.order } : undefined
))

/**
 * `createdAt` is a sortable field on the contract (`src/mocks/handlers/categories.ts`'s
 * `sortableFields`) but PRD-005's acceptance criteria only call for "name and
 * description" as list columns — there is no `createdAt` column to attach
 * `AppDataTable`'s header-click sort to. Rather than adding a hidden column
 * or a new shared "sort by" component (out of scope per the issue brief),
 * this small inline `el-select` drives `setSort` directly for the one field
 * with no column of its own; `name` stays sortable through its own column
 * header as usual.
 */
const NON_COLUMN_SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' }
]

const nonColumnSortValue = computed<string | undefined>(() => (
  sort.value?.field === 'createdAt' ? `${sort.value.field}:${sort.value.order}` : undefined
))

/**
 * `useListQuery` only exposes `setSort(field)` (toggles asc → desc → off for
 * that field) — there is no "set this exact field/order" setter, because no
 * other list screen has needed to pick a sort *order* from a control other
 * than a column header click, which already encodes direction through which
 * edge/arrow was clicked. Rather than stretch `setSort`'s toggle semantics
 * to reach an exact order (fragile, and reads nothing like what it does),
 * this pushes the `sort`/`order` query params directly — the same two params
 * `useListQuery` itself reads back out of `route.query` on the very next
 * navigation, so this stays within "list state lives in the URL", just
 * without going through the one setter that doesn't fit this control.
 */
function onNonColumnSortChange (value: string | undefined): void {
  const query = { ...route.query, page: undefined }

  if (value === undefined) {
    void router.push({ query: { ...query, sort: undefined, order: undefined } })
    return
  }

  const [field, order] = value.split(':')

  void router.push({ query: { ...query, sort: field, order } })
}

function rowKey (row: TCategory): string {
  return row.id
}

// `computed` rather than a static array (GitHub issue #37, PRD-007) so a
// viewer never has "edit"/"delete" in the dropdown at all — mirrors
// `Events.vue`'s `rowActions`.
const rowActions = computed<IDataTableRowAction<TCategory>[]>(() => {
  const actions: IDataTableRowAction<TCategory>[] = []

  if (canDo('categories', 'update')) {
    actions.push({ key: 'edit', label: 'Edit' })
  }

  if (canDo('categories', 'delete')) {
    actions.push({ key: 'delete', label: 'Delete', danger: true })
  }

  return actions
})

/**
 * Deletes `category` after confirmation (PRD-005 "Deletion" — identical to
 * `Events.vue`'s `deleteEvent`). A 409 here is always a real
 * `DependencyConflictError` (tickets referencing the category,
 * `checkDependencyConflict` in `src/mocks/handlers/categories.ts`), never the
 * duplicate-name `ConflictError` (that only applies to create/update). There
 * is no tickets list route yet (PRD-006, issue #34, not yet started), so —
 * exactly like `Events.vue`/`EventForm.vue` already do for their own
 * tickets-reference conflict — this shows the count-bearing message only,
 * with no link to a tickets list. That is a known, accepted forward
 * dependency, not an oversight here.
 */
async function deleteCategory (category: TCategory): Promise<void> {
  await confirm({
    subject: category.name,
    onConfirm: async () => {
      try {
        await categoriesService.delete(category.id)
      } catch (error) {
        if (error instanceof DependencyConflictError) {
          notificationService.error({
            title: 'Cannot delete category',
            message: `${error.count} ${error.entity}${error.count === 1 ? '' : 's'} reference this category and must be removed first.`
          })
        }

        throw error
      }

      notificationService.success({ message: 'Category deleted.' })

      if (data.value.length === 1 && page.value > 1) {
        void setPage(page.value - 1)
      } else {
        void refetch()
      }
    }
  })
}

/**
 * The list refetches on save (via `refetch`, threaded into the modal as an
 * `onSaved` prop) rather than the modal touching this view's state directly
 * — keeps `CategoryModal.vue` reusable and ignorant of where it was opened
 * from, and preserves the current page/search exactly (PRD-005 "I want my
 * current page and search preserved after saving") since `refetch` re-runs
 * the same `useListResource` query without resetting `page`/`search`.
 */
function onRowAction ({ action, row }: { action: string; row: TCategory }): void {
  if (action === 'edit') {
    openModal('CategoryModal', { category: row, onSaved: refetch })
  } else if (action === 'delete') {
    void deleteCategory(row)
  }
}

function onCreateClicked (): void {
  openModal('CategoryModal', { category: undefined, onSaved: refetch })
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <PageHeader title="Categories">
      <template #actions>
        <el-button v-if="canDo('categories', 'create')" type="primary" @click="onCreateClicked">
          <template #icon>
            <Icon name="plus" />
          </template>
          Create category
        </el-button>
      </template>
    </PageHeader>

    <ListToolbar
      :search="search"
      search-placeholder="Search by name or description…"
      @update:search="setSearch"
      @clear-all-requested="resetFilters"
    >
      <template #actions>
        <el-select
          :model-value="nonColumnSortValue"
          placeholder="Sort by"
          clearable
          class="!w-44"
          aria-label="Sort by creation date"
          @update:model-value="onNonColumnSortChange"
        >
          <el-option
            v-for="option in NON_COLUMN_SORT_OPTIONS"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </template>
    </ListToolbar>

    <AppDataTable
      :columns="columns"
      :rows="data"
      :row-key="rowKey"
      :meta="meta"
      :loading="loading"
      :error="error"
      :empty-reason="emptyReason"
      :sort="dataTableSort"
      :row-actions="rowActions"
      :can-create="canDo('categories', 'create')"
      caption="Categories"
      @sort-requested="setSort"
      @page-requested="setPage"
      @page-size-requested="setPerPage"
      @clear-filters-requested="resetFilters"
      @retry-requested="refetch"
      @row-action-invoked="onRowAction"
      @create-requested="onCreateClicked"
    />
  </div>
</template>
