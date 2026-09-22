<script lang="ts" setup>
/**
 * Login screen (issue #19). Real form mechanics against the mocked
 * `/auth/login` contract: blur-triggered validation, a loading submit
 * button, a password-visibility toggle, and a non-blaming inline error on
 * rejected credentials. Styled as a minimal centred card — issue #20 wraps
 * this in the actual auth layout later.
 */

interface ILoginForm {
  email: string
  password: string
}

const GENERIC_SIGN_IN_ERROR_MESSAGE = 'Something went wrong. Please try again.'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const formRef = useElFormRef<IElementPlus['FormInstance']>(null)
const form = useElFormModel<ILoginForm>({ email: '', password: '' })

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

/**
 * Only an internal, relative path is a safe redirect target — never an
 * absolute URL, which would let a crafted `?redirect=` query param send a
 * signed-in administrator off-site (open redirect).
 */
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

  if (isValid !== true) {
    return
  }

  submitError.value = null
  loading.value = true

  try {
    await authStore.signIn(form.email, form.password)

    const redirect = safeRedirectTarget()

    if (redirect !== null) {
      // The one legitimate exception to "always navigate by name": the
      // destination is a path string carried on the query param itself
      // (validated safe above), not a hardcoded literal — there is no route
      // name available for an arbitrary preserved deep link.
      await router.push(redirect)
    } else {
      await router.push({ name: routeNames.home })
    }
  } catch (error) {
    submitError.value = error instanceof Error ? error.message : GENERIC_SIGN_IN_ERROR_MESSAGE
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-surface p-4">
    <div class="w-full max-w-sm rounded-lg border border-border bg-surface-raised p-8 shadow-token-md">
      <h1 class="text-screen-heading text-text-primary mb-1">
        Sign in
      </h1>
      <p class="text-body text-text-muted mb-6">
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
  </div>
</template>
