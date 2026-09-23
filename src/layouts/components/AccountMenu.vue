<script lang="ts" setup>
const authStore = useAuthStore()

async function onSignOut (): Promise<void> {
  await authStore.signOut()
}
</script>

<template>
  <el-dropdown trigger="click" placement="bottom-end">
    <el-button text class="!h-auto !px-2 !py-1">
      <div class="flex items-center gap-2 text-left">
        <el-avatar :size="32" class="!bg-accent/10 !text-accent">
          <Icon name="user" class="size-4.5" />
        </el-avatar>

        <span class="hidden flex-col items-start gap-0.5 leading-tight sm:flex">
          <span class="text-label text-text-primary">{{ authStore.user?.name }}</span>
          <el-tag v-if="authStore.user?.role" size="small" type="info" effect="plain">
            {{ authStore.user.role }}
          </el-tag>
        </span>
      </div>
    </el-button>

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
