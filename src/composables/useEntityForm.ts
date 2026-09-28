import type { RouteLocationRaw } from 'vue-router'

import { ValidationFieldError } from '@/features/platform/api/interceptors/response.interceptor'

interface IUseEntityFormOptions<TModel extends object, TRecord> {
  initialModel: TModel
  load: (id: string) => Promise<TRecord>
  toModel: (record: TRecord) => TModel
  create: (model: TModel) => Promise<unknown>
  update: (id: string, model: TModel) => Promise<unknown>
  messages: { created: string; updated: string }
  listRoute: RouteLocationRaw
}

// The routed create/edit form: record loading, dirty tracking with the unsaved-changes guard,
// server field errors and submit. The component only declares fields and rules.
export function useEntityForm<TModel extends object, TRecord> (options: IUseEntityFormOptions<TModel, TRecord>) {
  const { initialModel, load, toModel, create, update, messages, listRoute } = options

  const route = useRoute()
  const router = useRouter()

  const recordId = computed(() => (typeof route.params.id === 'string' ? route.params.id : undefined))
  const isEditMode = computed(() => recordId.value !== undefined)

  // The list passes its fullPath as `from` so returning keeps its filters/sort/page.
  const returnTo = computed<RouteLocationRaw>(() => (typeof route.query.from === 'string' ? route.query.from : listRoute))

  const formRef = useElFormRef<IElementPlus['FormInstance']>(null)
  const form = useElFormModel<TModel>({ ...initialModel })

  const loadingRecord = ref(isEditMode.value)
  const loadError = ref(false)

  // Undefined until the record loads, so the empty form an edit starts with never counts as dirty.
  let baseline = isEditMode.value ? undefined : JSON.stringify(form)

  const isDirty = ref(false)
  watch(form, () => {
    isDirty.value = baseline !== undefined && JSON.stringify(form) !== baseline
  })

  const { markClean } = useUnsavedChangesGuard({ isDirty })

  const serverFieldErrors = ref<Partial<Record<keyof TModel, string>>>({})

  function clearServerError (field: keyof TModel): void {
    serverFieldErrors.value[field] = undefined
  }

  // A watcher, not onMounted: the id may arrive after mount (e.g. auth guard redirecting back).
  watch(recordId, async (id) => {
    if (id === undefined) {
      return
    }

    loadingRecord.value = true
    loadError.value = false

    try {
      const record = await load(id)

      // Guards against a slower load for a previous id landing after the route moved on.
      if (recordId.value !== id) {
        return
      }

      Object.assign(form, toModel(record))
      baseline = JSON.stringify(form)
    } catch {
      loadError.value = true
    } finally {
      if (recordId.value === id) {
        loadingRecord.value = false
      }
    }
  }, { immediate: true })

  const loading = ref(false)

  async function goBack (): Promise<void> {
    await router.push(returnTo.value)
  }

  async function submit (): Promise<void> {
    if (loading.value) {
      return
    }

    loading.value = true

    try {
      // A callback keeps Element Plus from logging the failing fields to the console.
      const isValid = await formRef.value?.validate(() => undefined).catch(() => false)

      if (!isValid) {
        return
      }

      serverFieldErrors.value = {}

      // `reactive()` widens the type; the model's fields are plain values, so the cast is exact.
      const model = { ...form } as TModel

      if (recordId.value !== undefined) {
        await update(recordId.value, model)
      } else {
        await create(model)
      }

      notificationService.success({ message: isEditMode.value ? messages.updated : messages.created })

      markClean()
      await goBack()
    } catch (error) {
      if (error instanceof ValidationFieldError) {
        serverFieldErrors.value = error.fieldErrors as Partial<Record<keyof TModel, string>>
      }
    } finally {
      loading.value = false
    }
  }

  return {
    form,
    formRef,
    recordId,
    isEditMode,
    loadingRecord,
    loadError,
    loading,
    serverFieldErrors,
    clearServerError,
    returnTo,
    goBack,
    submit,
    markClean
  }
}
