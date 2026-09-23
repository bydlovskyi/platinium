<script lang="ts" setup>
/**
 * Ticket form (GitHub issue #35, PRD-006 "Ticket form component"). One
 * component serving both `routeNames.ticketCreate` and `routeNames.ticketEdit`
 * — the route decides whether an existing record is loaded first
 * (`route.params.id`), everything else (field set, `:rules`, dirty tracking,
 * submission) is identical for both. Closely mirrors
 * `src/views/events/components/EventForm.vue`'s shape.
 *
 * No delete button here, unlike `EventForm.vue`: ticket deletion already
 * shipped on the list screen (GitHub issue #34, `Tickets.vue`'s row action)
 * and tickets are leaves with no dependency check, so there is no need for a
 * second delete affordance on this form (issue #35's acceptance criteria
 * list no delete-from-form requirement for tickets, unlike events).
 *
 * Status is deliberately independent of quantity (PRD-006 "Status" — "a
 * ticket with zero quantity is not automatically sold out, because an
 * administrator may be preparing stock"). Nothing in this component reads
 * `form.quantity` to derive or disable `form.status`.
 */
import { ValidationFieldError } from '@/features/platform/api/interceptors/response.interceptor'

interface ITicketFormModel {
  name: string
  price: number
  currency: TCurrency | undefined
  quantity: number
  status: TTicketStatus
  eventId: string | undefined
  categoryId: string | undefined
}

const STATUS_OPTIONS: { value: TTicketStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'on_sale', label: 'On sale' },
  { value: 'sold_out', label: 'Sold out' },
  { value: 'archived', label: 'Archived' }
]

function emptyModel (): ITicketFormModel {
  return {
    name: '',
    price: 0,
    // No default currency (PRD-006 "Money" — "Currency ... is required with
    // no default"): `CurrencyInput` is not mounted until the administrator
    // picks one (see the template), so an empty price never gets converted
    // at the wrong precision.
    currency: undefined,
    quantity: 0,
    status: 'draft',
    eventId: undefined,
    categoryId: undefined
  }
}

function cloneModel (model: ITicketFormModel): ITicketFormModel {
  return { ...model }
}

const route = useRoute()
const router = useRouter()

/** Present only on the edit route (`/tickets/:id/edit`); its absence is what distinguishes create from edit mode. */
const ticketId = computed<string | undefined>(() => (
  typeof route.params.id === 'string' ? route.params.id : undefined
))
const isEditMode = computed(() => ticketId.value !== undefined)

/**
 * Where "back to list" returns to. Captured from `route.query.from` — the
 * list screen (`Tickets.vue`) passes its own `route.fullPath` when it
 * navigates here, so the administrator returns to the same filtered,
 * sorted, paginated page rather than a reset list. Falls back to the plain
 * list route when the form was opened directly (e.g. a bookmarked/typed
 * URL), since there is no prior list state to restore in that case.
 */
const returnTo = computed<string | { name: string }>(() => (
  typeof route.query.from === 'string' ? route.query.from : { name: routeNames.tickets }
))

function goToList (): void {
  void router.push(returnTo.value)
}

// --- Loading the existing record (edit mode only) --------------------------

const loadingRecord = ref(isEditMode.value)
const loadError = ref(false)

// --- Form state --------------------------------------------------------------

const formRef = useElFormRef<IElementPlus['FormInstance']>(null)
const form = useElFormModel<ITicketFormModel>(emptyModel())

/** The last loaded/saved snapshot, compared against `form` to derive dirtiness. `undefined` while a record is still loading in edit mode. */
const baseline = ref<ITicketFormModel | undefined>(isEditMode.value ? undefined : emptyModel())

const isDirtyFromBaseline = computed(() => (
  baseline.value !== undefined && JSON.stringify(form) !== JSON.stringify(baseline.value)
))

/**
 * `useUnsavedChangesGuard` needs a writable `Ref<boolean>` (`markClean` sets
 * it to `false` directly) — `isDirtyFromBaseline` is a read-only `computed`
 * derived from `baseline` vs `form`, so it's mirrored into a plain ref here
 * rather than handed to the guard directly, which would silently fail to
 * write and leave the dirty flag stuck after a save.
 */
const isDirty = ref(false)
watch(isDirtyFromBaseline, (value) => {
  isDirty.value = value
}, { immediate: true })

const { markClean: markGuardClean } = useUnsavedChangesGuard({ isDirty })

/** Marks the current form values as the new clean baseline (e.g. right after a successful save), then clears the guard's dirty flag to match. */
function markClean (): void {
  baseline.value = cloneModel(form)
  markGuardClean()
}

/** Server-side field errors from a 400, mapped onto each `el-form-item`'s `:error`. Cleared as soon as the administrator edits that field again. */
const serverFieldErrors = ref<Partial<Record<keyof ITicketFormModel, string>>>({})

function fieldError (field: keyof ITicketFormModel): string | undefined {
  return serverFieldErrors.value[field]
}

function clearServerError (field: keyof ITicketFormModel): void {
  if (serverFieldErrors.value[field] !== undefined) {
    serverFieldErrors.value = { ...serverFieldErrors.value, [field]: undefined }
  }
}

// --- Event / category remote-select configuration ----------------------------
// Local equivalents of `Tickets.vue`'s own `fetchEventOptions`/
// `resolveEventOption`/`fetchCategoryOptions`/`resolveCategoryOption` — not
// imported from there, since those are that component's own local scope.

async function fetchEventOptions ({ search: term, page: pageNumber }: { search: string; page: number }) {
  return eventsService.list({ search: term, page: pageNumber })
}

function resolveEventOption (id: string): Promise<TEvent> {
  return eventsService.get(id)
}

async function fetchCategoryOptions ({ search: term, page: pageNumber }: { search: string; page: number }) {
  return categoriesService.list({ search: term, page: pageNumber })
}

function resolveCategoryOption (id: string): Promise<TCategory> {
  return categoriesService.get(id)
}

const rules: IElementPlus['FormRules'] = {
  name: [useRequiredRule()],
  currency: [useRequiredRule()],
  status: [useRequiredRule()],
  eventId: [useRequiredRule()],
  categoryId: [useRequiredRule()]
}

// --- Loading the record (edit mode) -------------------------------------------

async function loadRecord (id: string): Promise<void> {
  loadingRecord.value = true
  loadError.value = false

  try {
    const ticket = await ticketsService.get(id, { showNotification: false })

    const loaded: ITicketFormModel = {
      name: ticket.name,
      price: ticket.price,
      currency: ticket.currency,
      quantity: ticket.quantity,
      status: ticket.status,
      eventId: ticket.eventId,
      categoryId: ticket.categoryId
    }

    // Discard the response if the route has since moved on to a different
    // id (e.g. the admin navigated from edit A to edit B before A's
    // response arrived) — applying it here would silently overwrite the
    // form and dirty-tracking baseline with the wrong record's data.
    if (ticketId.value !== id) {
      return
    }

    Object.assign(form, loaded)
    baseline.value = cloneModel(loaded)
  } catch {
    if (ticketId.value !== id) {
      return
    }

    loadError.value = true
  } finally {
    if (ticketId.value === id) {
      loadingRecord.value = false
    }
  }
}

// Watches `ticketId` (rather than a one-shot `onMounted`) so a param that
// isn't available yet at mount time — e.g. the auth guard resolving an
// async redirect back to this same route once a restored session confirms
// the administrator is signed in — still triggers the load once it arrives.
watch(ticketId, (id) => {
  if (id !== undefined) {
    void loadRecord(id)
  }
}, { immediate: true })

// --- Submission ----------------------------------------------------------------

const submitting = ref(false)

function toPayload (): TTicketPayload {
  return {
    name: form.name,
    price: form.price,
    // `currency`/`eventId`/`categoryId` are validated required before
    // submission ever reaches here, so the non-null assertions reflect a
    // state `:rules` has already guaranteed, not an unchecked assumption.
    currency: form.currency!,
    quantity: form.quantity,
    status: form.status,
    eventId: form.eventId!,
    categoryId: form.categoryId!
  }
}

async function onSubmit (): Promise<void> {
  if (submitting.value) {
    return
  }

  submitting.value = true

  try {
    const isValid = await formRef.value?.validate().catch(() => false)

    if (isValid !== true) {
      return
    }

    serverFieldErrors.value = {}

    if (isEditMode.value && ticketId.value !== undefined) {
      await ticketsService.update(ticketId.value, toPayload())
    } else {
      await ticketsService.create(toPayload())
    }

    notificationService.success({
      message: isEditMode.value ? 'Ticket updated.' : 'Ticket created.'
    })

    markClean()
    await router.push(returnTo.value)
  } catch (error) {
    if (error instanceof ValidationFieldError) {
      serverFieldErrors.value = error.fieldErrors
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <PageHeader :title="isEditMode ? 'Edit ticket' : 'Create ticket'" />

    <el-skeleton v-if="loadingRecord" :rows="6" animated />

    <div v-else-if="loadError" class="rounded-token-md border border-border">
      <el-result
        icon="warning"
        title="Ticket not found"
        sub-title="This ticket may have been deleted or the link is incorrect."
      >
        <template #extra>
          <el-button type="primary" @click="goToList">
            Back to list
          </el-button>
        </template>
      </el-result>
    </div>

    <el-form
      v-else
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      class="max-w-lg"
      @submit.prevent="onSubmit"
    >
      <el-form-item label="Name" prop="name" :error="fieldError('name')">
        <el-input
          v-model="form.name"
          placeholder="General Admission"
          @input="clearServerError('name')"
        />
      </el-form-item>

      <el-form-item label="Currency" prop="currency" :error="fieldError('currency')">
        <el-select
          v-model="form.currency"
          placeholder="Select a currency"
          class="w-full"
          @change="clearServerError('currency')"
        >
          <el-option label="USD" value="USD" />
          <el-option label="EUR" value="EUR" />
          <el-option label="GBP" value="GBP" />
        </el-select>
      </el-form-item>

      <el-form-item label="Price" prop="price" :error="fieldError('price')">
        <!-- `CurrencyInput` requires a non-empty `currency` prop and has no
             "no currency selected" state (PRD-006 "Money") — it is not
             mounted until `form.currency` is truthy, so a currency must be
             chosen first. -->
        <CurrencyInput
          v-if="form.currency"
          v-model="form.price"
          :currency="form.currency"
          @update:model-value="clearServerError('price')"
        />
        <el-input v-else disabled placeholder="Select a currency first" />
      </el-form-item>

      <el-form-item label="Quantity" prop="quantity" :error="fieldError('quantity')">
        <el-input-number
          v-model="form.quantity"
          :min="0"
          :step="1"
          step-strictly
          :precision="0"
          class="w-full"
          @change="clearServerError('quantity')"
        />
      </el-form-item>

      <el-form-item label="Status" prop="status" :error="fieldError('status')">
        <el-radio-group v-model="form.status" @change="clearServerError('status')">
          <el-radio v-for="option in STATUS_OPTIONS" :key="option.value" :value="option.value">
            {{ option.label }}
          </el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="Event" prop="eventId" :error="fieldError('eventId')">
        <RemoteSelect
          v-model="form.eventId"
          :fetch-options="fetchEventOptions"
          :resolve-option="resolveEventOption"
          :option-value="(event: TEvent) => event.id"
          :option-label="(event: TEvent) => event.name"
          placeholder="Search for an event…"
          @update:model-value="clearServerError('eventId')"
        />
      </el-form-item>

      <el-form-item label="Category" prop="categoryId" :error="fieldError('categoryId')">
        <RemoteSelect
          v-model="form.categoryId"
          :fetch-options="fetchCategoryOptions"
          :resolve-option="resolveCategoryOption"
          :option-value="(category: TCategory) => category.id"
          :option-label="(category: TCategory) => category.name"
          placeholder="Search for a category…"
          @update:model-value="clearServerError('categoryId')"
        />
      </el-form-item>

      <div class="flex gap-2">
        <el-button type="primary" native-type="submit" :loading="submitting" :disabled="submitting">
          {{ isEditMode ? 'Save changes' : 'Create ticket' }}
        </el-button>
        <el-button :disabled="submitting" @click="goToList">
          Cancel
        </el-button>
      </div>
    </el-form>
  </div>
</template>
