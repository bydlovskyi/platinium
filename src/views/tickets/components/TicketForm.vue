<script lang="ts" setup>
// Status is deliberately independent of quantity: zero stock doesn't mean sold out.
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
    // No default currency: CurrencyInput must not mount (and convert price) before one is picked.
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
const { canDo } = useCapability()

const ticketId = computed<string | undefined>(() => (
  typeof route.params.id === 'string' ? route.params.id : undefined
))
const isEditMode = computed(() => ticketId.value !== undefined)

// The list passes its fullPath as `from` so returning keeps its filters/sort/page.
const returnTo = computed<string | { name: string }>(() => (
  typeof route.query.from === 'string' ? route.query.from : { name: routeNames.tickets }
))

function goToList (): void {
  void router.push(returnTo.value)
}

const loadingRecord = ref(isEditMode.value)
const loadError = ref(false)

const formRef = useElFormRef<IElementPlus['FormInstance']>(null)
const form = useElFormModel<ITicketFormModel>(emptyModel())

const baseline = ref<ITicketFormModel | undefined>(isEditMode.value ? undefined : emptyModel())

const isDirtyFromBaseline = computed(() => (
  baseline.value !== undefined && JSON.stringify(form) !== JSON.stringify(baseline.value)
))

// Writable mirror for useUnsavedChangesGuard; handing it the computed would leave the flag stuck after a save.
const isDirty = ref(false)
watch(isDirtyFromBaseline, (value) => {
  isDirty.value = value
}, { immediate: true })

const { markClean: markGuardClean } = useUnsavedChangesGuard({ isDirty })

function markClean (): void {
  baseline.value = cloneModel(form)
  markGuardClean()
}

const serverFieldErrors = ref<Partial<Record<keyof ITicketFormModel, string>>>({})

function fieldError (field: keyof ITicketFormModel): string | undefined {
  return serverFieldErrors.value[field]
}

function clearServerError (field: keyof ITicketFormModel): void {
  if (serverFieldErrors.value[field] !== undefined) {
    serverFieldErrors.value = { ...serverFieldErrors.value, [field]: undefined }
  }
}

function fetchEventOptions ({ search: term, page: pageNumber }: { search: string; page: number }) {
  return eventsService.list({ search: term, page: pageNumber })
}

function resolveEventOption (id: string): Promise<TEvent> {
  return eventsService.get(id)
}

function fetchCategoryOptions ({ search: term, page: pageNumber }: { search: string; page: number }) {
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

    // Discard if the route moved to a different id while this was in flight.
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

// A watcher, not onMounted: the id may arrive after mount (e.g. auth guard redirecting back).
watch(ticketId, (id) => {
  if (id !== undefined) {
    void loadRecord(id)
  }
}, { immediate: true })

const submitting = ref(false)

function toPayload (): TTicketPayload {
  return {
    name: form.name,
    price: form.price,
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

    <Transition name="skeleton-fade" mode="out-in">
      <el-skeleton v-if="loadingRecord" key="skeleton" :rows="6" animated />

      <div v-else-if="loadError" key="error" class="rounded-token-md border border-border">
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
        key="form"
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
          <el-button
            v-if="canDo('tickets', isEditMode ? 'update' : 'create')"
            type="primary"
            native-type="submit"
            :loading="submitting"
            :disabled="submitting"
          >
            {{ isEditMode ? 'Save changes' : 'Create ticket' }}
          </el-button>
          <el-button :disabled="submitting" @click="goToList">
            Cancel
          </el-button>
        </div>
      </el-form>
    </Transition>
  </div>
</template>
