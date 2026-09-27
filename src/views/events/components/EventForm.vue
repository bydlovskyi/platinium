<script lang="ts" setup>
import { ValidationFieldError, DependencyConflictError } from '@/features/platform/api/interceptors/response.interceptor'

interface IEventFormModel {
  name: string
  country: string
  venue: string
  startDate: string
  endDate: string
  status: TEventStatus
}

const NAME_MAX_LENGTH = 120
const VENUE_MAX_LENGTH = 120

const STATUS_OPTIONS: { value: TEventStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'completed', label: 'Completed' }
]

function emptyModel (): IEventFormModel {
  return {
    name: '',
    country: '',
    venue: '',
    startDate: '',
    endDate: '',
    status: 'draft'
  }
}

function cloneModel (model: IEventFormModel): IEventFormModel {
  return { ...model }
}

const route = useRoute()
const router = useRouter()
const { canDo } = useCapability()
const { isMobile } = useBreakpoint()
const actionButtonSize = computed(() => (isMobile.value ? 'small' : 'default'))

const eventId = computed<string | undefined>(() => (
  typeof route.params.id === 'string' ? route.params.id : undefined
))
const isEditMode = computed(() => eventId.value !== undefined)

// The list passes its fullPath as `from` so returning keeps its filters/sort/page.
const returnTo = computed<string | { name: string }>(() => (
  typeof route.query.from === 'string' ? route.query.from : { name: routeNames.events }
))

function goToList (): void {
  void router.push(returnTo.value)
}

const { confirm } = useConfirm()

// Re-throws so useConfirm keeps the dialog open on a 409.
async function deleteEvent (): Promise<void> {
  const id = eventId.value

  if (id === undefined) {
    return
  }

  await confirm({
    subject: form.name,
    onConfirm: async () => {
      try {
        await eventsService.delete(id)
      } catch (error) {
        if (error instanceof DependencyConflictError) {
          const blocking = `${error.count} ${error.entity}${error.count === 1 ? '' : 's'}`

          notificationService.error({
            title: 'Cannot delete event',
            message: `${blocking} reference this event and must be removed first.`,
            action: {
              label: `View ${blocking}`,
              onClick: () => {
                void router.push({ name: routeNames.tickets, query: { eventId: id } })
              }
            }
          })
        }

        throw error
      }

      notificationService.success({ message: 'Event deleted.' })

      markClean()
      await router.push(returnTo.value)
    }
  })
}

const loadingRecord = ref(isEditMode.value)
const loadError = ref(false)

const formRef = useElFormRef<IElementPlus['FormInstance']>(null)
const form = useElFormModel<IEventFormModel>(emptyModel())

const baseline = ref<IEventFormModel | undefined>(isEditMode.value ? undefined : emptyModel())

// Tracked separately: re-deriving "start > end" would keep the alert up forever, not just right after clearing.
const justClearedEndDate = ref(false)

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

const serverFieldErrors = ref<Partial<Record<keyof IEventFormModel, string>>>({})

function fieldError (field: keyof IEventFormModel): string | undefined {
  return serverFieldErrors.value[field]
}

function clearServerError (field: keyof IEventFormModel): void {
  if (serverFieldErrors.value[field] !== undefined) {
    serverFieldErrors.value = { ...serverFieldErrors.value, [field]: undefined }
  }
}

// Local getters, not toISOString (UTC shifts the day near midnight in negative offsets).
function toDateOnly (date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function disabledEndDate (date: Date): boolean {
  if (!form.startDate) {
    return false
  }

  return toDateOnly(date) < form.startDate
}

// :disabled-date only stops picker interaction; this catches programmatic changes.
function validateEndDate (_rule: unknown, value: string, callback: (error?: Error) => void): void {
  if (value && form.startDate && value < form.startDate) {
    callback(new Error('End date must not precede start date.'))
    return
  }

  callback()
}

function onStartDateChange (value: string | null): void {
  clearServerError('startDate')

  if (value && form.endDate && form.endDate < value) {
    form.endDate = ''
    justClearedEndDate.value = true
  } else {
    justClearedEndDate.value = false
  }
}

function onEndDateChange (): void {
  clearServerError('endDate')
  justClearedEndDate.value = false
}

const rules: IElementPlus['FormRules'] = {
  name: [
    useRequiredRule(),
    useMaxLenRule(NAME_MAX_LENGTH)
  ],
  country: [useRequiredRule()],
  venue: [
    useRequiredRule(),
    useMaxLenRule(VENUE_MAX_LENGTH)
  ],
  startDate: [useRequiredRule()],
  endDate: [
    useRequiredRule(),
    { validator: validateEndDate, trigger: 'change' }
  ],
  status: [useRequiredRule()]
}

async function loadRecord (id: string): Promise<void> {
  loadingRecord.value = true
  loadError.value = false

  try {
    const event = await eventsService.get(id, { showNotification: false })

    const loaded: IEventFormModel = {
      name: event.name,
      country: event.country,
      venue: event.venue,
      startDate: event.startDate,
      endDate: event.endDate,
      status: event.status
    }

    // Discard if the route moved to a different id while this was in flight.
    if (eventId.value !== id) {
      return
    }

    Object.assign(form, loaded)
    baseline.value = cloneModel(loaded)
  } catch {
    if (eventId.value !== id) {
      return
    }

    loadError.value = true
  } finally {
    if (eventId.value === id) {
      loadingRecord.value = false
    }
  }
}

// A watcher, not onMounted: the id may arrive after mount (e.g. auth guard redirecting back).
watch(eventId, (id) => {
  if (id !== undefined) {
    void loadRecord(id)
  }
}, { immediate: true })

const submitting = ref(false)

function toPayload (): TEventPayload {
  return {
    name: form.name,
    country: form.country,
    venue: form.venue,
    startDate: form.startDate,
    endDate: form.endDate,
    status: form.status
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

    if (isEditMode.value && eventId.value !== undefined) {
      await eventsService.update(eventId.value, toPayload())
    } else {
      await eventsService.create(toPayload())
    }

    notificationService.success({
      message: isEditMode.value ? 'Event updated.' : 'Event created.'
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
    <PageHeader :title="isEditMode ? 'Edit event' : 'Create event'" />

    <!-- el-skeleton has no built-in transition to its content, hence the keyed <Transition>. -->
    <Transition name="skeleton-fade" mode="out-in">
      <el-skeleton v-if="loadingRecord" key="skeleton" :rows="6" animated />

      <div v-else-if="loadError" key="error" class="rounded-token-md border border-border">
        <el-result
          icon="warning"
          title="Event not found"
          sub-title="This event may have been deleted or the link is incorrect."
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
            maxlength="120"
            show-word-limit
            placeholder="Summer Jazz Festival"
            @input="clearServerError('name')"
          />
        </el-form-item>

        <el-form-item label="Country" prop="country" :error="fieldError('country')">
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

        <el-form-item label="Venue" prop="venue" :error="fieldError('venue')">
          <el-input
            v-model="form.venue"
            maxlength="120"
            show-word-limit
            placeholder="Skyline Terrace"
            @input="clearServerError('venue')"
          />
        </el-form-item>

        <el-form-item label="Start date" prop="startDate" :error="fieldError('startDate')">
          <el-date-picker
            v-model="form.startDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="Select a start date"
            class="!w-full"
            @change="onStartDateChange"
          />
        </el-form-item>

        <el-form-item label="End date" prop="endDate" :error="fieldError('endDate')">
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

        <el-form-item label="Status" prop="status" :error="fieldError('status')">
          <el-radio-group v-model="form.status" @change="clearServerError('status')">
            <el-radio v-for="option in STATUS_OPTIONS" :key="option.value" :value="option.value">
              {{ option.label }}
            </el-radio>
          </el-radio-group>
        </el-form-item>

        <div class="flex items-center justify-between gap-2">
          <div class="flex gap-2">
            <el-button
              v-if="canDo('events', isEditMode ? 'update' : 'create')"
              :size="actionButtonSize"
              type="primary"
              native-type="submit"
              :loading="submitting"
              :disabled="submitting"
            >
              {{ isEditMode ? 'Save changes' : 'Create event' }}
            </el-button>
            <el-button :size="actionButtonSize" :disabled="submitting" @click="goToList">
              Cancel
            </el-button>
          </div>

          <el-button
            v-if="isEditMode && canDo('events', 'delete')"
            :size="actionButtonSize"
            type="danger"
            plain
            :disabled="submitting"
            @click="deleteEvent"
          >
            Delete event
          </el-button>
        </div>
      </el-form>
    </Transition>
  </div>
</template>
