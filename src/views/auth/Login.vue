<script lang="ts" setup>
interface ILoginForm {
  email: string
  password: string
}

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const formRef = useElFormRef<IElementPlus['FormInstance']>(null)
const form = useElFormModel<ILoginForm>({ email: 'admin@platinium.test', password: 'admin123' })

const rules: IElementPlus['FormRules'] = {
  email: [
    { required: true, message: 'Email is required.', trigger: 'blur' },
    { type: 'email', message: 'Enter a valid email address.', trigger: 'blur' }
  ],
  password: [
    { required: true, message: 'Password is required.', trigger: 'blur' }
  ]
}

const loading = ref(false)
const submitError = ref<string | null>(null)

// Only internal relative paths; an absolute URL here would be an open redirect.
function safeRedirectTarget (): string | null {
  const redirect = route.query.redirect

  if (typeof redirect !== 'string' || !redirect.startsWith('/') || redirect.startsWith('//')) {
    return null
  }

  return redirect
}

async function onSubmit (): Promise<void> {
  if (loading.value) {
    return
  }

  const isValid = await formRef.value?.validate().catch(() => false)

  if (!isValid) {
    return
  }

  submitError.value = null
  loading.value = true

  try {
    await authStore.signIn(form.email, form.password)

    const redirect = safeRedirectTarget()

    if (redirect !== null) {
      await router.push(redirect)
    } else {
      await router.push({ name: routeNames.home })
    }
  } catch (error) {
    submitError.value = error instanceof Error ? error.message : 'Something went wrong. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="text-screen-heading text-text-primary mb-1 text-center">
      Sign in
    </h1>
    <p class="text-body text-text-muted mb-8 text-center">
      Ticket Management Admin Portal
    </p>

    <el-alert
      v-if="submitError"
      type="error"
      :title="submitError"
      :closable="false"
      show-icon
      class="mb-4"
    />

    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      @submit.prevent="onSubmit"
    >
      <el-form-item label="Email" prop="email">
        <el-input
          v-model="form.email"
          type="email"
          autocomplete="username"
          placeholder="admin@platinium.test"
        />
      </el-form-item>

      <el-form-item label="Password" prop="password">
        <el-input
          v-model="form.password"
          type="password"
          show-password
          autocomplete="current-password"
          placeholder="••••••••"
        />
      </el-form-item>

      <el-button
        type="primary"
        native-type="submit"
        :loading="loading"
        class="w-full"
      >
        Sign in
      </el-button>
    </el-form>
  </div>
</template>
