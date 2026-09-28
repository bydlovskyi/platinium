<script lang="ts" setup>
interface IEventFormModel {
  name: string
  country: string
  venue: string
  startDate: string
  endDate: string
  status: TEventStatus
}

const { canDo } = useCapability()
const { isMobile } = useBreakpoint()
const { confirm } = useConfirm()
const { notifyDependencyConflict } = useDependencyConflictNotice()

const actionButtonSize = computed(() => (isMobile.value ? 'small' : 'default'))

const {
  form,
  formRef,
  recordId: eventId,
  isEditMode,
  loadingRecord,
  loadError,
  loading,
  serverFieldErrors,
  clearServerError,
  goBack,
  submit,
  markClean
} = useEntityForm<IEventFormModel, TEvent>({
  initialModel: {
    name: '',
    country: '',
    venue: '',
    startDate: '',
    endDate: '',
    status: 'draft'
  },
  load: id => eventsService.get(id, { showNotification: false }),
  toModel: event => ({
    name: event.name,
    country: event.country,
    venue: event.venue,
    startDate: event.startDate,
    endDate: event.endDate,
    status: event.status
  }),
  create: model => eventsService.create({ ...model }),
  update: (id, model) => eventsService.update(id, { ...model }),
  messages: { created: 'Event created.', updated: 'Event updated.' },
  listRoute: { name: routeNames.events }
})

// Tracked separately: re-deriving "start > end" would keep the alert up forever, not just right after clearing.
const justClearedEndDate = ref(false)

// Local getters, not toISOString (UTC shifts the day near midnight in negative offsets).
function toDateOnly (date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function disabledEndDate (date: Date): boolean {
  return form.startDate !== '' && toDateOnly(date) < form.startDate
}

// :disabled-date only stops picker interaction; this catches programmatic changes.
function validateEndDate (_rule: unknown, value: string, callback: (error?: Error) => void): void {
  callback(value && form.startDate && value < form.startDate ? new Error('End date must not precede start date.') : undefined)
}

function onStartDateChange (value: string | null): void {
  clearServerError('startDate')
  justClearedEndDate.value = Boolean(value && form.endDate && form.endDate < value)

  if (justClearedEndDate.value) {
    form.endDate = ''
  }
}

function onEndDateChange (): void {
  clearServerError('endDate')
  justClearedEndDate.value = false
}

const rules: IElementPlus['FormRules'] = {
  name: [
    useRequiredRule(),
    useMaxLenRule(120)
  ],
  country: [useRequiredRule()],
  venue: [
    useRequiredRule(),
    useMaxLenRule(120)
  ],
  startDate: [useRequiredRule()],
  endDate: [
    useRequiredRule(),
    { validator: validateEndDate, trigger: 'change' }
  ],
  status: [useRequiredRule()]
}

// Re-throws so useConfirm keeps the dialog open on a 409.
async function deleteEvent (id: string): Promise<void> {
  await confirm({
    subject: form.name,
    onConfirm: async () => {
      try {
        await eventsService.delete(id)
      } catch (error) {
        notifyDependencyConflict(error, { entity: 'event', to: { name: routeNames.tickets, query: { eventId: id } } })
        throw error
      }

      notificationService.success({ message: 'Event deleted.' })

      markClean()
      await goBack()
    }
  })
}
</script>

<template>
  <FormPageFrame
    :title="isEditMode ? 'Edit event' : 'Create event'"
    :loading="loadingRecord"
    :load-error="loadError"
    not-found-title="Event not found"
    not-found-subtitle="This event may have been deleted or the link is incorrect."
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
          maxlength="120"
          show-word-limit
          placeholder="Summer Jazz Festival"
          @input="clearServerError('name')"
        />
      </el-form-item>

      <el-form-item label="Country" prop="country" :error="serverFieldErrors.country">
        <el-select
          v-model="form.country"
          filterable
          placeholder="Select a country"
          class="w-full"
          @change="clearServerError('country')"
        >
          <el-option
            v-for="option in countries.options"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="Venue" prop="venue" :error="serverFieldErrors.venue">
        <el-input
          v-model="form.venue"
          maxlength="120"
          show-word-limit
          placeholder="Skyline Terrace"
          @input="clearServerError('venue')"
        />
      </el-form-item>

      <el-form-item label="Start date" prop="startDate" :error="serverFieldErrors.startDate">
        <el-date-picker
          v-model="form.startDate"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="Select a start date"
          class="!w-full"
          @change="onStartDateChange"
        />
      </el-form-item>

      <el-form-item label="End date" prop="endDate" :error="serverFieldErrors.endDate">
        <el-date-picker
          v-model="form.endDate"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="Select an end date"
          class="!w-full"
          :disabled-date="disabledEndDate"
          @change="onEndDateChange"
        />
        <el-alert
          v-if="justClearedEndDate"
          type="warning"
          :closable="false"
          class="mt-2"
          title="End date cleared"
          description="The end date was cleared because it fell before the new start date. Choose a new end date."
        />
      </el-form-item>

      <el-form-item label="Status" prop="status" :error="serverFieldErrors.status">
        <el-radio-group v-model="form.status" @change="clearServerError('status')">
          <el-radio v-for="status in EVENT_STATUSES" :key="status" :value="status">
            {{ STATUS_PRESENTATION[status].label }}
          </el-radio>
        </el-radio-group>
      </el-form-item>

      <div class="flex items-center justify-between gap-2">
        <div class="flex gap-2">
          <el-button
            :size="actionButtonSize"
            type="primary"
            native-type="submit"
            :loading="loading"
          >
            {{ isEditMode ? 'Save changes' : 'Create event' }}
          </el-button>
          <el-button :size="actionButtonSize" :disabled="loading" @click="goBack">
            Cancel
          </el-button>
        </div>

        <el-button
          v-if="eventId && canDo('events', 'delete')"
          :size="actionButtonSize"
          type="danger"
          plain
          :disabled="loading"
          @click="deleteEvent(eventId)"
        >
          Delete event
        </el-button>
      </div>
    </el-form>
  </FormPageFrame>
</template>
