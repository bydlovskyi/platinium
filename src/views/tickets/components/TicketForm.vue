<script lang="ts" setup>
// Status is deliberately independent of quantity: zero stock doesn't mean sold out.
interface ITicketFormModel {
  name: string
  price: number
  currency: TCurrency | undefined
  quantity: number
  status: TTicketStatus
  eventId: string | undefined
  categoryId: string | undefined
}

const { canDo } = useCapability()
const { isMobile } = useBreakpoint()
const { confirm } = useConfirm()

const actionButtonSize = computed(() => (isMobile.value ? 'small' : 'default'))

// The required rules guarantee these before submit; narrowing here keeps the payload honest for the type checker.
function toPayload (model: ITicketFormModel): TTicketPayload {
  if (model.currency === undefined || model.eventId === undefined || model.categoryId === undefined) {
    throw new Error('Ticket form submitted without a currency, event or category.')
  }

  return {
    name: model.name,
    price: model.price,
    currency: model.currency,
    quantity: model.quantity,
    status: model.status,
    eventId: model.eventId,
    categoryId: model.categoryId
  }
}

const {
  form,
  formRef,
  recordId: ticketId,
  isEditMode,
  loadingRecord,
  loadError,
  loading,
  serverFieldErrors,
  clearServerError,
  goBack,
  submit,
  markClean
} = useEntityForm<ITicketFormModel, TTicket>({
  initialModel: {
    name: '',
    price: 0,
    // No default currency: CurrencyInput must not mount (and convert price) before one is picked.
    currency: undefined,
    quantity: 0,
    status: 'draft',
    eventId: undefined,
    categoryId: undefined
  },
  load: id => ticketsService.get(id, { showNotification: false }),
  toModel: ticket => ({
    name: ticket.name,
    price: ticket.price,
    currency: ticket.currency,
    quantity: ticket.quantity,
    status: ticket.status,
    eventId: ticket.eventId,
    categoryId: ticket.categoryId
  }),
  create: model => ticketsService.create(toPayload(model)),
  update: (id, model) => ticketsService.update(id, toPayload(model)),
  messages: { created: 'Ticket created.', updated: 'Ticket updated.' },
  listRoute: { name: routeNames.tickets }
})

const rules: IElementPlus['FormRules'] = {
  name: [useRequiredRule()],
  currency: [useRequiredRule()],
  status: [useRequiredRule()],
  eventId: [useRequiredRule()],
  categoryId: [useRequiredRule()]
}

// Tickets are leaves: no dependency conflict is possible here.
async function deleteTicket (id: string): Promise<void> {
  await confirm({
    subject: form.name,
    onConfirm: async () => {
      await ticketsService.delete(id)

      notificationService.success({ message: 'Ticket deleted.' })

      markClean()
      await goBack()
    }
  })
}
</script>

<template>
  <FormPageFrame
    :title="isEditMode ? 'Edit ticket' : 'Create ticket'"
    :loading="loadingRecord"
    :load-error="loadError"
    not-found-title="Ticket not found"
    not-found-subtitle="This ticket may have been deleted or the link is incorrect."
    @back-requested="goBack"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      class="max-w-lg"
      @submit.prevent="submit"
    >
      <el-form-item label="Name" prop="name" :error="serverFieldErrors.name">
        <el-input
          v-model="form.name"
          placeholder="General Admission"
          @input="clearServerError('name')"
        />
      </el-form-item>

      <el-form-item label="Currency" prop="currency" :error="serverFieldErrors.currency">
        <el-select
          v-model="form.currency"
          placeholder="Select a currency"
          class="w-full"
          @change="clearServerError('currency')"
        >
          <el-option v-for="currency in CURRENCIES" :key="currency" :label="currency" :value="currency" />
        </el-select>
      </el-form-item>

      <el-form-item label="Price" prop="price" :error="serverFieldErrors.price">
        <CurrencyInput
          v-if="form.currency"
          v-model="form.price"
          :currency="form.currency"
          @update:model-value="clearServerError('price')"
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
          @change="clearServerError('quantity')"
        />
      </el-form-item>

      <el-form-item label="Status" prop="status" :error="serverFieldErrors.status">
        <el-radio-group v-model="form.status" @change="clearServerError('status')">
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
          @update:model-value="clearServerError('eventId')"
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
          @update:model-value="clearServerError('categoryId')"
        />
      </el-form-item>

      <div class="flex items-center justify-between gap-2">
        <div class="flex gap-2">
          <el-button
            :size="actionButtonSize"
            type="primary"
            native-type="submit"
            :loading="loading"
          >
            {{ isEditMode ? 'Save changes' : 'Create ticket' }}
          </el-button>
          <el-button :size="actionButtonSize" :disabled="loading" @click="goBack">
            Cancel
          </el-button>
        </div>

        <el-button
          v-if="ticketId && canDo('tickets', 'delete')"
          :size="actionButtonSize"
          type="danger"
          plain
          :disabled="loading"
          @click="deleteTicket(ticketId)"
        >
          Delete ticket
        </el-button>
      </div>
    </el-form>
  </FormPageFrame>
</template>
