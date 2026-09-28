<script lang="ts" setup>
import { ValidationFieldError } from '@/features/platform/api/interceptors/response.interceptor'

interface IEventFormModel {
  name: string
  country: string
  venue: string
  startDate: string
  endDate: string
  status: TEventStatus
}

const route = useRoute()
const router = useRouter()
const { canDo } = useCapability()
const { isMobile } = useBreakpoint()
const { confirm } = useConfirm()
const { notifyDependencyConflict } = useDependencyConflictNotice()

const actionButtonSize = computed(() => (isMobile.value ? 'small' : 'default'))

const eventId = computed(() => (typeof route.params.id === 'string' ? route.params.id : undefined))
const isEditMode = computed(() => eventId.value !== undefined)

// The list passes its fullPath as `from` so returning keeps its filters/sort/page.
const returnTo = computed(() => (typeof route.query.from === 'string' ? route.query.from : { name: routeNames.events }))

const loadingRecord = ref(isEditMode.value)
const loadError = ref(false)

const formRef = useElFormRef<IElementPlus['FormInstance']>(null)
const form = useElFormModel<IEventFormModel>({
  name: '',
  country: '',
  venue: '',
  startDate: '',
  endDate: '',
  status: 'draft'
})

// Undefined until the record loads, so the empty form an edit starts with never counts as dirty.
let baseline = isEditMode.value ? undefined : JSON.stringify(form)

const isDirty = ref(false)
watch(form, () => {
  isDirty.value = baseline !== undefined && JSON.stringify(form) !== baseline
})

const { markClean } = useUnsavedChangesGuard({ isDirty })

const serverFieldErrors = ref<Partial<Record<keyof IEventFormModel, string>>>({})

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
  serverFieldErrors.value.startDate = undefined
  justClearedEndDate.value = Boolean(value && form.endDate && form.endDate < value)

  if (justClearedEndDate.value) {
    form.endDate = ''
  }
}

function onEndDateChange (): void {
  serverFieldErrors.value.endDate = undefined
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

// A watcher, not onMounted: the id may arrive after mount (e.g. auth guard redirecting back).
watch(eventId, async (id) => {
  if (id === undefined) {
    return
  }

  loadingRecord.value = true
  loadError.value = false

  try {
    const event = await eventsService.get(id, { showNotification: false })

    Object.assign(form, {
      name: event.name,
      country: event.country,
      venue: event.venue,
      startDate: event.startDate,
      endDate: event.endDate,
      status: event.status
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

    if (eventId.value) {
      await eventsService.update(eventId.value, { ...form })
    } else {
      await eventsService.create({ ...form })
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
    loading.value = false
  }
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
      await router.push(returnTo.value)
    }
  })
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <PageHeader :title="isEditMode ? 'Edit event' : 'Create event'" />

    <Transition name="skeleton-fade" mode="out-in">
      <el-skeleton v-if="loadingRecord" key="skeleton" :rows="6" animated />

      <div v-else-if="loadError" key="error" class="rounded-token-md border border-border">
        <el-result
          icon="warning"
          title="Event not found"
          sub-title="This event may have been deleted or the link is incorrect."
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
            maxlength="120"
            show-word-limit
            placeholder="Summer Jazz Festival"
            @input="serverFieldErrors.name = undefined"
          />
        </el-form-item>

        <el-form-item label="Country" prop="country" :error="serverFieldErrors.country">
          <el-select
            v-model="form.country"
            filterable
            placeholder="Select a country"
            class="w-full"
            @change="serverFieldErrors.country = undefined"
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
            @input="serverFieldErrors.venue = undefined"
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
          <el-radio-group v-model="form.status" @change="serverFieldErrors.status = undefined">
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
            <el-button :size="actionButtonSize" :disabled="loading" @click="router.push(returnTo)">
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
    </Transition>
  </div>
</template>
