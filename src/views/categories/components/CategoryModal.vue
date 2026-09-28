<script lang="ts" setup>
import { ConflictError, ValidationFieldError } from '@/features/platform/api/interceptors/response.interceptor'

interface ICategoryFormModel {
  name: string
  description: string
}

const props = defineProps<{
  category?: TCategory
  onSaved?: () => void
}>()

const { isOpen, closeModal } = useModals()
const { isMobile } = useBreakpoint()

const isEditMode = computed(() => props.category !== undefined)

const formRef = useElFormRef<IElementPlus['FormInstance']>(null)
const nameInputRef = useTemplateRef<IElementPlus['InputInstance']>('nameInputRef')

const initialModel: ICategoryFormModel = {
  name: props.category?.name ?? '',
  description: props.category?.description ?? ''
}
const form = useElFormModel<ICategoryFormModel>({ ...initialModel })

const isDirty = ref(false)
watch(form, () => {
  isDirty.value = JSON.stringify(form) !== JSON.stringify(initialModel)
})

const { markClean, confirmDiscard } = useUnsavedChangesGuard({
  isDirty,
  message: 'You have unsaved changes. Discard them and close this dialog?',
  confirmButtonText: 'Discard',
  guardRouteLeave: false
})

const serverFieldErrors = ref<Partial<Record<keyof ICategoryFormModel, string>>>({})

const rules: IElementPlus['FormRules'] = {
  name: [
    useRequiredRule({ whitespace: true }),
    useMaxLenRule(120)
  ],
  description: [
    useMaxLenRule(500)
  ]
}

const loading = ref(false)

async function onSubmit (): Promise<void> {
  if (loading.value) {
    return
  }

  loading.value = true

  try {
    const isValid = await formRef.value?.validate(() => undefined).catch(() => false)

    if (!isValid) {
      return
    }

    serverFieldErrors.value = {}

    const payload: TCategoryPayload = {
      name: form.name.trim(),
      description: form.description.trim()
    }

    if (props.category) {
      await categoriesService.update(props.category.id, payload)
    } else {
      await categoriesService.create(payload)
    }

    notificationService.success({
      message: isEditMode.value ? 'Category updated.' : 'Category created.'
    })

    markClean()
    props.onSaved?.()
    closeModal('CategoryModal')
  } catch (error) {
    if (error instanceof ValidationFieldError) {
      serverFieldErrors.value = error.fieldErrors
    } else if (error instanceof ConflictError && error.code === 'DUPLICATE_NAME') {
      serverFieldErrors.value = { name: error.message }
    }
  } finally {
    loading.value = false
  }
}

async function onBeforeClose (done: () => void): Promise<void> {
  if (loading.value) {
    return
  }

  if (await confirmDiscard()) {
    markClean()
    done()
  }
}
</script>

<template>
  <el-dialog
    :model-value="isOpen.CategoryModal"
    :fullscreen="isMobile"
    destroy-on-close
    :close-on-click-modal="!loading"
    :close-on-press-escape="!loading"
    :show-close="!loading"
    :title="isEditMode ? 'Edit category' : 'Create category'"
    :before-close="onBeforeClose"
    @opened="nameInputRef?.focus()"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      @submit.prevent="onSubmit"
    >
      <el-form-item label="Name" prop="name" :error="serverFieldErrors.name">
        <el-input
          ref="nameInputRef"
          v-model="form.name"
          maxlength="120"
          show-word-limit
          placeholder="General Admission"
          @input="serverFieldErrors.name = undefined"
        />
      </el-form-item>

      <el-form-item label="Description" prop="description" :error="serverFieldErrors.description">
        <el-input
          v-model="form.description"
          type="textarea"
          autosize
          maxlength="500"
          show-word-limit
          placeholder="Standard entry with access to general seating areas."
          @input="serverFieldErrors.description = undefined"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button :disabled="loading" @click="onBeforeClose(() => closeModal('CategoryModal'))">
        Cancel
      </el-button>
      <el-button type="primary" :loading="loading" @click="onSubmit">
        {{ isEditMode ? 'Save changes' : 'Create category' }}
      </el-button>
    </template>
  </el-dialog>
</template>
