<script lang="ts" setup>
/**
 * Event form (GitHub issue #27, PRD-004 "Event form component (deep
 * module)"). One component serving both `routeNames.eventCreate` and
 * `routeNames.eventEdit` — the route decides whether an existing record is
 * loaded first (`route.params.id`), everything else (field set, `:rules`,
 * the cross-field date constraint, dirty tracking, submission) is identical
 * for both, per the PRD's "separate create and edit components guarantee a
 * validation rule gets fixed in one and not the other".
 *
 * Single-column `el-form label-position="top"`, per PRD-004's "single
 * column, usable at 375px" — no grid, so nothing needs to collapse at the
 * mobile breakpoint.
 */
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

/** Present only on the edit route (`/events/:id/edit`); its absence is what distinguishes create from edit mode. */
const eventId = computed<string | undefined>(() => (
  typeof route.params.id === 'string' ? route.params.id : undefined
))
const isEditMode = computed(() => eventId.value !== undefined)

/**
 * Where "back to list" returns to. Captured from `route.query.from` — the
 * list screen (`Events.vue`) passes its own `route.fullPath` when it
 * navigates here, so the administrator returns to the same filtered,
 * sorted, paginated page rather than a reset list. Falls back to the plain
 * list route when the form was opened directly (e.g. a bookmarked/typed
 * URL), since there is no prior list state to restore in that case.
 */
const returnTo = computed<string | { name: string }>(() => (
  typeof route.query.from === 'string' ? route.query.from : { name: routeNames.events }
))

function goToList (): void {
  void router.push(returnTo.value)
}

const { confirm } = useConfirm()

/**
 * Deletes the event being edited (GitHub issue #28, PRD-004 "Delete
 * available as a row action and from the edit form"). Mirrors
 * `Events.vue`'s row-action delete: a 409 (`DependencyConflictError`) is
 * rendered as its own actionable notification and re-thrown so `useConfirm`
 * keeps the dialog open instead of navigating away or closing silently. A
 * successful delete returns to the list the same way "Cancel"/"Save" do
 * (`returnTo`, the `from` query param captured above).
 */
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
          notificationService.error({
            title: 'Cannot delete event',
            message: `${error.count} ${error.entity}${error.count === 1 ? '' : 's'} reference this event and must be removed first.`
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

// --- Loading the existing record (edit mode only) --------------------------

const loadingRecord = ref(isEditMode.value)
const loadError = ref(false)

// --- Form state --------------------------------------------------------------

const formRef = useElFormRef<IElementPlus['FormInstance']>(null)
const form = useElFormModel<IEventFormModel>(emptyModel())

/** The last loaded/saved snapshot, compared against `form` to derive dirtiness. `undefined` while a record is still loading in edit mode. */
const baseline = ref<IEventFormModel | undefined>(isEditMode.value ? undefined : emptyModel())

/**
 * Set right after the start date clears an existing end date, so the
 * warning `el-alert` under the end-date field can be shown/dismissed on its
 * own terms — re-deriving "start > end" from the current field values would
 * keep the alert visible forever once true, instead of only right after the
 * clearing happened.
 */
const justClearedEndDate = ref(false)

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

/** Server-side field errors from a 400, mapped onto each `el-form-item`'s `:error`. Cleared as soon as the administrator edits that field again (`trigger: 'change'` on every rule already revalidates it). */
const serverFieldErrors = ref<Partial<Record<keyof IEventFormModel, string>>>({})

function fieldError (field: keyof IEventFormModel): string | undefined {
  return serverFieldErrors.value[field]
}

function clearServerError (field: keyof IEventFormModel): void {
  if (serverFieldErrors.value[field] !== undefined) {
    serverFieldErrors.value = { ...serverFieldErrors.value, [field]: undefined }
  }
}

// --- Date-range constraint ---------------------------------------------------

/**
 * `date` arrives as a local `Date` at midnight for the calendar cell being
 * evaluated — formatted through local getters (not `toISOString`, which is
 * UTC and would shift the day near midnight in negative-UTC-offset zones)
 * into the same `YYYY-MM-DD` shape `form.startDate` is already stored as, so
 * the two compare correctly as strings.
 */
function toDateOnly (date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/** `el-date-picker`'s own constraint (PRD-004 "in the picker, so the administrator cannot express the mistake") — disables every end-date cell before the chosen start date. */
function disabledEndDate (date: Date): boolean {
  if (!form.startDate) {
    return false
  }

  return toDateOnly(date) < form.startDate
}

/** Form-rule mirror of the same constraint (PRD-004 "so a programmatic change is still caught"), since `:disabled-date` alone only stops direct picker interaction. */
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

// --- Loading the record (edit mode) -------------------------------------------

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

    // Discard the response if the route has since moved on to a different
    // id (e.g. the admin navigated from edit A to edit B before A's
    // response arrived) — applying it here would silently overwrite the
    // form and dirty-tracking baseline with the wrong record's data.
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

// Watches `eventId` (rather than a one-shot `onMounted`) so a param that
// isn't available yet at mount time — e.g. the auth guard resolving an
// async redirect back to this same route once a restored session confirms
// the administrator is signed in — still triggers the load once it arrives.
watch(eventId, (id) => {
  if (id !== undefined) {
    void loadRecord(id)
  }
}, { immediate: true })

// --- Submission ----------------------------------------------------------------

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

    <el-skeleton v-if="loadingRecord" :rows="6" animated />

    <div v-else-if="loadError" class="rounded-token-md border border-border">
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
          <el-button type="primary" native-type="submit" :loading="submitting" :disabled="submitting">
            {{ isEditMode ? 'Save changes' : 'Create event' }}
          </el-button>
          <el-button :disabled="submitting" @click="goToList">
            Cancel
          </el-button>
        </div>

        <el-button v-if="isEditMode" type="danger" plain :disabled="submitting" @click="deleteEvent">
          Delete event
        </el-button>
      </div>
    </el-form>
  </div>
</template>
