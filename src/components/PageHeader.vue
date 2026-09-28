<script lang="ts" setup>
interface IBreadcrumb {
  label: string
  routeName?: string
}

defineProps<{
  title: string
  breadcrumbs?: IBreadcrumb[]
}>()
</script>

<template>
  <div class="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
    <div>
      <nav
        v-if="breadcrumbs && breadcrumbs.length > 0"
        aria-label="Breadcrumb"
        class="mb-1"
      >
        <el-breadcrumb>
          <template #separator>
            <Icon name="chevron-right" class="size-3.5" />
          </template>
          <el-breadcrumb-item
            v-for="(crumb, index) in breadcrumbs"
            :key="`${crumb.label}-${index}`"
            :to="crumb.routeName ? { name: crumb.routeName } : undefined"
          >
            {{ crumb.label }}
          </el-breadcrumb-item>
        </el-breadcrumb>
      </nav>

      <h1 class="text-screen-heading text-text-primary">
        {{ title }}
      </h1>
    </div>

    <!-- Below `sm` the actions take their own full-width row of equal buttons. The `.el-button` selector is
         layout only: Element Plus exposes no variable for a button's flex basis or the sibling margin it adds. -->
    <div
      v-if="$slots.actions"
      class="
        flex w-full items-center gap-2 sm:w-auto
        [&>.el-button]:flex-1 sm:[&>.el-button]:flex-none [&>.el-button+.el-button]:ml-0
      "
    >
      <slot name="actions" />
    </div>
  </div>
</template>
