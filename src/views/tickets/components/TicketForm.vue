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

const route = useRoute()
const router = useRouter()

const ticketId = computed(() => (typeof route.params.id === 'string' ? route.params.id : undefined))
const isEditMode = computed(() => ticketId.value !== undefined)

// The list passes its fullPath as `from` so returning keeps its filters/sort/page.
const returnTo = computed(() => (typeof route.query.from === 'string' ? route.query.from : { name: routeNames.tickets }))

const loadingRecord = ref(isEditMode.value)
const loadError = ref(false)

const formRef = useElFormRef<IElementPlus['FormInstance']>(null)
const form = useElFormModel<ITicketFormModel>({
  name: '',
  price: 0,
  // No default currency: CurrencyInput must not mount (and convert price) before one is picked.
  currency: undefined,
  quantity: 0,
  status: 'draft',
  eventId: undefined,
  categoryId: undefined
})

// Undefined until the record loads, so the empty form an edit starts with never counts as dirty.
let baseline = isEditMode.value ? undefined : JSON.stringify(form)

const isDirty = ref(false)
watch(form, () => {
  isDirty.value = baseline !== undefined && JSON.stringify(form) !== baseline
})

const { markClean } = useUnsavedChangesGuard({ isDirty })

const serverFieldErrors = ref<Partial<Record<keyof ITicketFormModel, string>>>({})

const rules: IElementPlus['FormRules'] = {
  name: [useRequiredRule()],
  currency: [useRequiredRule()],
  status: [useRequiredRule()],
  eventId: [useRequiredRule()],
  categoryId: [useRequiredRule()]
}

// A watcher, not onMounted: the id may arrive after mount (e.g. auth guard redirecting back).
watch(ticketId, async (id) => {
  if (id === undefined) {
    return
  }

  loadingRecord.value = true
  loadError.value = false

  try {
    const ticket = await ticketsService.get(id, { showNotification: false })

    Object.assign(form, {
      name: ticket.name,
      price: ticket.price,
      currency: ticket.currency,
      quantity: ticket.quantity,
      status: ticket.status,
      eventId: ticket.eventId,
      categoryId: ticket.categoryId
    })
    baseline = JSON.stringify(form)
  } catch {
    loadError.value = true
  } finally {
    loadingRecord.value = false
  }
}, { immediate: true })

const loading = ref(false)

async function onSubmit (): Promise<void> {
  if (loading.value) {
    return
  }

  loading.value = true

  try {
    const isValid = await formRef.value?.validate().catch(() => false)

    if (!isValid) {
      return
    }

    serverFieldErrors.value = {}

    const payload: TTicketPayload = {
      name: form.name,
      price: form.price,
      currency: form.currency!,
      quantity: form.quantity,
      status: form.status,
      eventId: form.eventId!,
      categoryId: form.categoryId!
    }

    if (ticketId.value) {
      await ticketsService.update(ticketId.value, payload)
    } else {
      await ticketsService.create(payload)
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
    loading.value = false
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
            <el-button type="primary" @click="router.push(returnTo)">
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
        <el-form-item label="Name" prop="name" :error="serverFieldErrors.name">
          <el-input
            v-model="form.name"
            placeholder="General Admission"
            @input="serverFieldErrors.name = undefined"
          />
        </el-form-item>

        <el-form-item label="Currency" prop="currency" :error="serverFieldErrors.currency">
          <el-select
            v-model="form.currency"
            placeholder="Select a currency"
            class="w-full"
            @change="serverFieldErrors.currency = undefined"
          >
            <el-option v-for="currency in CURRENCIES" :key="currency" :label="currency" :value="currency" />
          </el-select>
        </el-form-item>

        <el-form-item label="Price" prop="price" :error="serverFieldErrors.price">
          <CurrencyInput
            v-if="form.currency"
            v-model="form.price"
            :currency="form.currency"
            @update:model-value="serverFieldErrors.price = undefined"
          />
          <el-input v-else disabled placeholder="Select a currency first" />
        </el-form-item>

        <el-form-item label="Quantity" prop="quantity" :error="serverFieldErrors.quantity">
          <el-input-number
            v-model="form.quantity"
            :min="0"
            :step="1"
            step-strictly
            :precision="0"
            class="w-full"
            @change="serverFieldErrors.quantity = undefined"
          />
        </el-form-item>

        <el-form-item label="Status" prop="status" :error="serverFieldErrors.status">
          <el-radio-group v-model="form.status" @change="serverFieldErrors.status = undefined">
            <el-radio v-for="status in TICKET_STATUSES" :key="status" :value="status">
              {{ STATUS_PRESENTATION[status].label }}
            </el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="Event" prop="eventId" :error="serverFieldErrors.eventId">
          <RemoteSelect
            v-model="form.eventId"
            :fetch-options="params => eventsService.list(params)"
            :resolve-option="id => eventsService.get(id)"
            :option-value="(event: TEvent) => event.id"
            :option-label="(event: TEvent) => event.name"
            placeholder="Search for an event…"
            @update:model-value="serverFieldErrors.eventId = undefined"
          />
        </el-form-item>

        <el-form-item label="Category" prop="categoryId" :error="serverFieldErrors.categoryId">
          <RemoteSelect
            v-model="form.categoryId"
            :fetch-options="params => categoriesService.list(params)"
            :resolve-option="id => categoriesService.get(id)"
            :option-value="(category: TCategory) => category.id"
            :option-label="(category: TCategory) => category.name"
            placeholder="Search for a category…"
            @update:model-value="serverFieldErrors.categoryId = undefined"
          />
        </el-form-item>

        <div class="flex gap-2">
          <el-button type="primary" native-type="submit" :loading="loading">
            {{ isEditMode ? 'Save changes' : 'Create ticket' }}
          </el-button>
          <el-button :disabled="loading" @click="router.push(returnTo)">
            Cancel
          </el-button>
        </div>
      </el-form>
    </Transition>
  </div>
</template>
