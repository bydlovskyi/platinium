<script lang="ts" setup>
/**
 * Shared status badge (GitHub issue #24, PRD-003 "Status tag"). Wraps
 * `el-tag` and maps every Event and Ticket lifecycle status to one
 * consistent `type` + `effect` + text label, so a `draft` event and a
 * `draft` ticket render identically anywhere in the portal instead of each
 * entity screen inventing its own colour.
 *
 * The portal has exactly four status colour tokens
 * (`--color-status-published/draft/cancelled/completed` in theme.css, itself
 * riding Element Plus's success/warning/danger/info slots) and two status
 * universes that don't share every member (`TEventStatus`: draft, published,
 * cancelled, completed; `TTicketStatus`: draft, on_sale, sold_out,
 * archived). `draft` is the only literal overlap and maps identically in
 * both. The remaining ticket values are assigned to the closest semantic
 * analogue of the four tokens: `on_sale` reads as the ticket's "live" state,
 * matching `published`'s success token; `archived` reads as the ticket's
 * "no longer active" state, matching `completed`'s info token; `sold_out` is
 * a state that needs to stand out from both, so it takes the danger token
 * (distinct from PRD-006's separate zero-quantity indicator elsewhere on the
 * row, which flags a different concern).
 *
 * Colour is never the only signal: the mapped text label always renders
 * alongside the tag's colour/effect, satisfying the greyscale requirement.
 *
 * Tolerates a `status` that isn't (yet) one of the known values — rendering
 * nothing rather than throwing — as defensive handling for an
 * unrecognised/undefined status (GitHub issue #26), e.g. new backend values
 * this component hasn't been taught yet, rather than crashing the row's
 * render over it.
 */
type TStatus = TEventStatus | TTicketStatus

interface IStatusPresentation {
  label: string
  type: 'success' | 'warning' | 'danger' | 'info'
}

const STATUS_PRESENTATION: Record<TStatus, IStatusPresentation> = {
  draft: { label: 'Draft', type: 'warning' },
  published: { label: 'Published', type: 'success' },
  cancelled: { label: 'Cancelled', type: 'danger' },
  completed: { label: 'Completed', type: 'info' },
  on_sale: { label: 'On sale', type: 'success' },
  sold_out: { label: 'Sold out', type: 'danger' },
  archived: { label: 'Archived', type: 'info' }
}

const props = defineProps<{
  status: TStatus
}>()

const presentation = computed<IStatusPresentation | undefined>(() => STATUS_PRESENTATION[props.status])
</script>

<template>
  <el-tag v-if="presentation" :type="presentation.type" effect="light" round>
    {{ presentation.label }}
  </el-tag>
</template>
