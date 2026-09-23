<script lang="ts" setup>
/**
 * Reusable page header (PRD-002 "Page header (deep module)") — every
 * feature screen uses this for its title/breadcrumbs/actions row so heading
 * hierarchy, spacing and action placement are consistent by construction.
 * `Home.vue` is the first consumer, proving the pattern.
 */

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
  <div class="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
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

    <div v-if="$slots.actions" class="flex items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
