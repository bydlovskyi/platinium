<script lang="ts" setup>
/**
 * Account menu (PRD-002 user story 14/17, issue #20): shows the signed-in
 * administrator's name and role, with a sign-out action. An Element Plus
 * dropdown rather than a hand-built popover, per "check Element Plus first
 * for every UI primitive."
 */
const authStore = useAuthStore()

async function onSignOut (): Promise<void> {
  await authStore.signOut()
}
</script>

<template>
  <el-dropdown trigger="click" placement="bottom-end">
    <button
      type="button"
      class="flex items-center gap-2 rounded-token-md px-2 py-1.5 text-left transition-colors hover:bg-surface-raised"
    >
      <span class="flex size-8 items-center justify-center rounded-full bg-accent/10 text-accent">
        <Icon name="user" class="size-4.5" />
      </span>

      <span class="hidden flex-col leading-tight sm:flex">
        <span class="text-label text-text-primary">{{ authStore.user?.name }}</span>
        <span class="text-caption text-text-muted">{{ authStore.user?.role }}</span>
      </span>
    </button>

    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item disabled>
          <div class="flex flex-col">
            <span class="text-label text-text-primary">{{ authStore.user?.name }}</span>
            <span class="text-caption text-text-muted">{{ authStore.user?.email }}</span>
          </div>
        </el-dropdown-item>
        <el-dropdown-item divided @click="onSignOut">
          <Icon name="logout" class="mr-2 size-4" />
          Sign out
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>
