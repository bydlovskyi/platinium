<script lang="ts" setup>
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
  category?: TCategory
  onSaved?: () => void
}>()

const { isOpen, closeModal } = useModals()
const { canDo } = useCapability()

const isDialogOpen = computed(() => isOpen.value.CategoryModal === true)
const isEditMode = computed(() => props.category !== undefined)

const { isMobile } = useBreakpoint()

const formRef = useElFormRef<IElementPlus['FormInstance']>(null)
const nameInputRef = useTemplateRef<IElementPlus['InputInstance']>('nameInputRef')
const form = useElFormModel<ICategoryFormModel>(emptyModel())

const baseline = ref<ICategoryFormModel>(emptyModel())

const isDirtyFromBaseline = computed(() => JSON.stringify(form) !== JSON.stringify(baseline.value))

// Writable mirror for useUnsavedChangesGuard; no route guard since the dialog's :before-close is the leave path.
const isDirty = ref(false)
watch(isDirtyFromBaseline, (value) => {
  isDirty.value = value
}, { immediate: true })

const { markClean: markGuardClean } = useUnsavedChangesGuard({ isDirty, guardRouteLeave: false })

function markClean (): void {
  baseline.value = cloneModel(form)
  markGuardClean()
}

const serverFieldErrors = ref<Partial<Record<keyof ICategoryFormModel, string>>>({})

function fieldError (field: keyof ICategoryFormModel): string | undefined {
  return serverFieldErrors.value[field]
}

function clearServerError (field: keyof ICategoryFormModel): void {
  if (serverFieldErrors.value[field] !== undefined) {
    serverFieldErrors.value = { ...serverFieldErrors.value, [field]: undefined }
  }
}

// useRequiredRule lets whitespace-only values through; the server trims them and would 400.
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

// The modal instance is reused across opens: bumped on every open (not keyed on category id, since two
// creates share `undefined`) so a submit resolving after a reopen doesn't clobber the new session.
let openToken = 0

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

// Covers openModal being called again for a different record while already open.
watch(() => props.category, () => {
  if (isDialogOpen.value) {
    resetForNewSession()
  }
})

// The first openModal mounts with isOpen already true, so the watcher above never fires for it.
if (isDialogOpen.value) {
  resetForNewSession()
}

const submitting = ref(false)

function toPayload (): TCategoryPayload {
  return {
    name: form.name.trim(),
    description: form.description.trim()
  }
}

async function onSubmit (): Promise<void> {
  // Set before the first await: validate() yields a microtask, so rapid clicks would otherwise all submit.
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
      serverFieldErrors.value = { name: error.message }
    }
  } finally {
    if (submissionToken === openToken) {
      submitting.value = false
    }
  }
}

const UNSAVED_CHANGES_MESSAGE = 'You have unsaved changes. Discard them and close this dialog?'

// :before-close covers Escape, the close icon and mask click alike.
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

// The focus trap focuses the header close button first (DOM order), so focus the name input explicitly.
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
      <el-button
        v-if="canDo('categories', isEditMode ? 'update' : 'create')"
        type="primary"
        :loading="submitting"
        :disabled="submitting"
        @click="onSubmit"
      >
        {{ isEditMode ? 'Save changes' : 'Create category' }}
      </el-button>
    </template>
  </el-dialog>
</template>
