<script lang="ts" setup>
/**
 * Category create/edit dialog (GitHub issue #30, PRD-005 "Ticket Categories
 * Management"). The first real `*Modal.vue` — `src/views/home/components/modals/HomeModal.vue`
 * is a placeholder with no form, no focus handling and no dirty tracking.
 * One component serves both create and edit, branching on whether `category`
 * was supplied, mirroring `src/views/events/components/EventForm.vue`'s
 * established pattern (dirty-tracking against a baseline, server-field-error
 * mapping, submit-in-flight handling) — adapted from a route-based form to a
 * dialog: the record comes from a prop, not `route.params.id`, and the
 * "leave" path is `el-dialog`'s `:before-close`, not a route change.
 *
 * Unlike `EventForm.vue` (a fresh instance per route navigation), this
 * component is a long-lived singleton: `useModals()` (`Modals.vue`) keeps
 * ONE instance per modal name alive across every `openModal` call, only
 * toggling `isOpen`/`props` (see `v-for="[name, modal] in modals.entries()"`
 * keyed by `name`, not by a per-open id). Two consequences follow, both
 * handled below:
 *   1. The form model/baseline must be reset every time the dialog
 *      transitions from closed → open with a (possibly different) record —
 *      not just once at mount. Handled by watching `isOpen` and `category`
 *      together.
 *   2. A slow in-flight submit for record A could resolve after the
 *      administrator has already closed and reopened the dialog for record
 *      B. Handled the same shape as `EventForm.vue`'s `eventId.value !== id`
 *      staleness check, keyed here on an open-instance token instead of a
 *      route param.
 */
import { ElMessageBox } from 'element-plus'

import { ConflictError, ValidationFieldError } from '@/features/platform/api/interceptors/response.interceptor'

interface ICategoryFormModel {
  name: string
  description: string
}

const NAME_MAX_LENGTH = 120
const DESCRIPTION_MAX_LENGTH = 500

const DUPLICATE_NAME_CODE = 'DUPLICATE_NAME'

function emptyModel (): ICategoryFormModel {
  return { name: '', description: '' }
}

function modelFromCategory (category: TCategory): ICategoryFormModel {
  return { name: category.name, description: category.description }
}

function cloneModel (model: ICategoryFormModel): ICategoryFormModel {
  return { ...model }
}

const props = defineProps<{
  /** The record being edited, or `undefined` to create a new one. Supplied directly from the list row — no fetch-by-id (see `categories.service.ts`). */
  category?: TCategory
  /** Called after a successful create/edit so the list can refetch in place — preserves the caller's current page/search (PRD-005). */
  onSaved?: () => void
}>()

const { isOpen, closeModal } = useModals()

const isDialogOpen = computed(() => isOpen.value.CategoryModal === true)
const isEditMode = computed(() => props.category !== undefined)

const { isMobile } = useBreakpoint()

// --- Form state ----------------------------------------------------------

const formRef = useElFormRef<IElementPlus['FormInstance']>(null)
const nameInputRef = useTemplateRef<IElementPlus['InputInstance']>('nameInputRef')
const form = useElFormModel<ICategoryFormModel>(emptyModel())

/** The last loaded/saved snapshot, compared against `form` to derive dirtiness. */
const baseline = ref<ICategoryFormModel>(emptyModel())

const isDirtyFromBaseline = computed(() => JSON.stringify(form) !== JSON.stringify(baseline.value))

/**
 * `useUnsavedChangesGuard` needs a writable `Ref<boolean>` — mirrored from
 * the read-only `isDirtyFromBaseline` computed, same reasoning as
 * `EventForm.vue`. `guardRouteLeave: false` because there is no route change
 * to guard here: the leave path is this dialog's own `:before-close`
 * (PRD-005 "applied to `el-dialog`'s `:before-close` rather than a route
 * change — the composable's guard registration is parameterised for this").
 * The `beforeunload` registration stays on unconditionally inside the
 * composable, so a dirty dialog still warns on tab close/reload.
 */
const isDirty = ref(false)
watch(isDirtyFromBaseline, (value) => {
  isDirty.value = value
}, { immediate: true })

const { markClean: markGuardClean } = useUnsavedChangesGuard({ isDirty, guardRouteLeave: false })

function markClean (): void {
  baseline.value = cloneModel(form)
  markGuardClean()
}

/** Server-side field errors — a 400's per-field map, or the single 409 duplicate-name message attached to `name`. Cleared as soon as the administrator edits that field again. */
const serverFieldErrors = ref<Partial<Record<keyof ICategoryFormModel, string>>>({})

function fieldError (field: keyof ICategoryFormModel): string | undefined {
  return serverFieldErrors.value[field]
}

function clearServerError (field: keyof ICategoryFormModel): void {
  if (serverFieldErrors.value[field] !== undefined) {
    serverFieldErrors.value = { ...serverFieldErrors.value, [field]: undefined }
  }
}

/**
 * `useRequiredRule()` only rejects `undefined`/`null`/zero-length — a
 * whitespace-only value like `'   '` (length 3) passes it and would
 * otherwise round-trip to the server, which trims and 400s it. This is a
 * categories-local addition (not folded into `useRequiredRule` itself, which
 * `EventForm.vue` also relies on and must keep behaving exactly as before);
 * mirrors `EventForm.vue`'s `validateEndDate` custom-validator shape.
 */
function validateNameNotBlank (_rule: unknown, value: string, callback: (error?: Error) => void): void {
  if (value.trim().length === 0) {
    callback(new Error('Required field'))
    return
  }

  callback()
}

const rules: IElementPlus['FormRules'] = {
  name: [
    useRequiredRule(),
    useMaxLenRule(NAME_MAX_LENGTH),
    { validator: validateNameNotBlank, trigger: 'change' }
  ],
  description: [
    useMaxLenRule(DESCRIPTION_MAX_LENGTH)
  ]
}

/**
 * Identifies the record instance currently loaded into the form — a plain
 * counter bumped every time the dialog opens, rather than `props.category?.id`
 * (creating twice in a row is two distinct "sessions" with the same
 * `undefined` id, and would otherwise be indistinguishable). A submit
 * response is only applied if this token is unchanged when it resolves —
 * the reused-singleton-instance guard against a stale response from a
 * previous open clobbering the current one (see the file-level comment).
 */
let openToken = 0

/** Resets the form to a clean state for the record currently in `props.category` (or a blank one for create) — run every time the dialog transitions from closed to open. */
function resetForNewSession (): void {
  openToken += 1
  serverFieldErrors.value = {}

  const nextModel = props.category ? modelFromCategory(props.category) : emptyModel()

  Object.assign(form, nextModel)
  baseline.value = cloneModel(nextModel)
  isDirty.value = false

  formRef.value?.clearValidate()
}

watch(isDialogOpen, (open) => {
  if (open) {
    resetForNewSession()
  }
})

// `openModal` can in principle be called again for a different record while
// this dialog is already open (`isOpen` would stay `true` → `true`, so the
// transition watcher above would not fire and the previous record's data
// would linger) — watching `category` while open covers that case too,
// alongside the normal closed → open transition.
watch(() => props.category, () => {
  if (isDialogOpen.value) {
    resetForNewSession()
  }
})

// Handles the dialog being opened already-mounted with props already set
// (the very first `openModal` call for this modal name creates the
// instance with `isOpen` already `true` — the watcher above only fires on
// subsequent open transitions, not this initial one).
if (isDialogOpen.value) {
  resetForNewSession()
}

// --- Submission ------------------------------------------------------------

const submitting = ref(false)

function toPayload (): TCategoryPayload {
  return {
    name: form.name.trim(),
    description: form.description.trim()
  }
}

async function onSubmit (): Promise<void> {
  // Set synchronously, before the first `await` — `formRef.value.validate()`
  // yields a microtask even when every rule is synchronous, so N rapid
  // Enter-presses/clicks before the first `validate()` resolves would all
  // read a flag set *after* the await as `false` and all fire duplicate
  // requests (GitHub issue #27's lesson, verified live: 3 rapid clicks → 3
  // POSTs → 3 duplicate rows).
  if (submitting.value) {
    return
  }

  submitting.value = true
  const submissionToken = openToken

  try {
    const isValid = await formRef.value?.validate().catch(() => false)

    if (isValid !== true) {
      return
    }

    serverFieldErrors.value = {}

    const payload = toPayload()

    if (isEditMode.value && props.category !== undefined) {
      await categoriesService.update(props.category.id, payload)
    } else {
      await categoriesService.create(payload)
    }

    // The dialog may have been closed and reopened for a different record
    // while this request was in flight (the modal instance is reused —
    // see the file-level comment). Applying a stale response here would
    // silently overwrite whatever the administrator is now looking at.
    if (submissionToken !== openToken) {
      return
    }

    notificationService.success({
      message: isEditMode.value ? 'Category updated.' : 'Category created.'
    })

    markClean()
    props.onSaved?.()
    closeModal('CategoryModal')
  } catch (error) {
    if (submissionToken !== openToken) {
      return
    }

    if (error instanceof ValidationFieldError) {
      serverFieldErrors.value = error.fieldErrors
    } else if (error instanceof ConflictError && error.code === DUPLICATE_NAME_CODE) {
      // Uniqueness is a server-discovered conflict (PRD-005 "Uniqueness"),
      // not a client-side validation rule — rendered on the `name`
      // `el-form-item` exactly like a 400 field error, dialog stays open.
      // Any other 409/error falls through to the interceptor's own generic
      // handling (already suppressed for 409, so no duplicate toast here).
      serverFieldErrors.value = { name: error.message }
    }
  } finally {
    if (submissionToken === openToken) {
      submitting.value = false
    }
  }
}

// --- Close / unsaved-changes handling ---------------------------------------

const UNSAVED_CHANGES_MESSAGE = 'You have unsaved changes. Discard them and close this dialog?'

/**
 * `:before-close` covers every dialog dismissal path — Escape, the header
 * close icon, and a mask click all funnel through it (per Element Plus's own
 * `el-dialog` behaviour) — so a single handler is enough to prompt on all
 * three for a dirty form, per PRD-005's "Escape, the close icon and a mask
 * click on a dirty form prompts via `ElMessageBox.confirm`".
 */
async function onBeforeClose (done: () => void): Promise<void> {
  if (submitting.value) {
    return
  }

  if (!isDirty.value) {
    done()
    return
  }

  try {
    await ElMessageBox.confirm(UNSAVED_CHANGES_MESSAGE, 'Unsaved changes', {
      confirmButtonText: 'Discard',
      cancelButtonText: 'Stay',
      type: 'warning',
      distinguishCancelAndClose: true
    })

    markClean()
    done()
  } catch {
    // Administrator chose to stay — leave the dialog open.
  }
}

function onCancelClicked (): void {
  void onBeforeClose(() => closeModal('CategoryModal'))
}

/**
 * `el-dialog`'s focus-trap auto-focuses the first focusable descendant on
 * open, but that is the header's close (×) button — it renders before the
 * body in the DOM — not the name input (verified against this project's
 * Element Plus 2.13 source: `focus-trap.mjs`'s default `focusStartEl:
 * 'first'` walks DOM order). Restoring focus to the trigger element on close
 * *is* automatic (the trap records and restores `document.activeElement`
 * from before it activated), so only the open side needs handling here.
 */
function onOpened (): void {
  nameInputRef.value?.focus()
}
</script>

<template>
  <el-dialog
    :model-value="isDialogOpen"
    :fullscreen="isMobile"
    destroy-on-close
    :close-on-click-modal="!submitting"
    :close-on-press-escape="!submitting"
    :show-close="!submitting"
    :title="isEditMode ? 'Edit category' : 'Create category'"
    :before-close="onBeforeClose"
    @opened="onOpened"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      @submit.prevent="onSubmit"
    >
      <el-form-item label="Name" prop="name" :error="fieldError('name')">
        <el-input
          ref="nameInputRef"
          v-model="form.name"
          maxlength="120"
          show-word-limit
          placeholder="General Admission"
          @input="clearServerError('name')"
        />
      </el-form-item>

      <el-form-item label="Description" prop="description" :error="fieldError('description')">
        <el-input
          v-model="form.description"
          type="textarea"
          autosize
          maxlength="500"
          show-word-limit
          placeholder="Standard entry with access to general seating areas."
          @input="clearServerError('description')"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button :disabled="submitting" @click="onCancelClicked">
        Cancel
      </el-button>
      <el-button type="primary" :loading="submitting" :disabled="submitting" @click="onSubmit">
        {{ isEditMode ? 'Save changes' : 'Create category' }}
      </el-button>
    </template>
  </el-dialog>
</template>
