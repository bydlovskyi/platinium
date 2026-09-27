<script lang="ts" setup>
import type { IStatusDistributionEntry } from './components/status-distribution-bar.types'

const router = useRouter()
const { canDo } = useCapability()
const { isMobile } = useBreakpoint()

const { data, loading, error, retry } = useDashboardStats()

// 1 column on mobile so a third currency stacks instead of overflowing the card.
const grossInventoryValueColumns = computed(() => isMobile.value ? 1 : 3)

const draftEvents = computed(() => data.value?.eventStatusBreakdown.find(entry => entry.status === 'draft')?.count ?? 0)

const runningEventsPercentage = computed(() => {
  const totalEvents = data.value?.totalEvents ?? 0

  return totalEvents === 0 ? 0 : Math.round(((data.value?.runningEvents ?? 0) / totalEvents) * 100)
})
const draftEventsPercentage = computed(() => {
  const totalEvents = data.value?.totalEvents ?? 0

  return totalEvents === 0 ? 0 : Math.round((draftEvents.value / totalEvents) * 100)
})

const eventsDistributionEntries = computed<IStatusDistributionEntry[]>(() => (
  data.value?.eventStatusBreakdown ?? []
).map(entry => ({
  status: entry.status,
  count: entry.count,
  to: { name: routeNames.events, query: { status: entry.status } }
})))
const ticketsDistributionEntries = computed<IStatusDistributionEntry[]>(() => (
  data.value?.ticketStatusBreakdown ?? []
).map(entry => ({
  status: entry.status,
  count: entry.count,
  to: { name: routeNames.tickets, query: { status: entry.status } }
})))

const totalEventsDisplay = useCountUp(computed(() => data.value?.totalEvents ?? 0))
const runningEventsDisplay = useCountUp(computed(() => data.value?.runningEvents ?? 0))
const draftEventsDisplay = useCountUp(draftEvents)
const totalTicketsDisplay = useCountUp(computed(() => data.value?.totalTickets ?? 0))
const totalAvailableQuantityDisplay = useCountUp(computed(() => data.value?.totalAvailableQuantity ?? 0))

// The edit route is capability-gated, so a viewer's row click is a no-op rather than a 403.
function onUpcomingEventRowClick (row: TEvent): void {
  if (!canDo('events', 'update')) {
    return
  }

  void router.push({ name: routeNames.eventEdit, params: { id: row.id } })
}

function onNearlySoldOutTicketRowClick (row: TTicket): void {
  if (!canDo('tickets', 'update')) {
    return
  }

  void router.push({ name: routeNames.ticketEdit, params: { id: row.id } })
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <PageHeader title="Dashboard" />

    <Transition name="skeleton-fade" mode="out-in">
      <div v-if="loading && !data" key="skeleton" class="flex flex-col gap-5">
        <div class="stat-cards-row">
          <div v-for="n in 5" :key="n" class="stat-card">
            <el-card shadow="never" class="h-full">
              <el-skeleton animated :rows="0">
                <template #template>
                  <el-skeleton-item variant="text" class="!w-2/3" />
                  <el-skeleton-item variant="h3" class="!mt-3 !w-1/2" />
                </template>
              </el-skeleton>
            </el-card>
          </div>
        </div>

        <el-row :gutter="16">
          <el-col :xs="24" :md="12" class="mb-4">
            <el-card shadow="never">
              <el-skeleton animated :rows="3" />
            </el-card>
          </el-col>
          <el-col :xs="24" :md="6" class="mb-4">
            <el-skeleton animated :rows="4" />
          </el-col>
          <el-col :xs="24" :md="6" class="mb-4">
            <el-skeleton animated :rows="4" />
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :xs="24" :md="12" class="mb-4">
            <el-skeleton animated :rows="5" />
          </el-col>
          <el-col :xs="24" :md="12" class="mb-4">
            <el-skeleton animated :rows="5" />
          </el-col>
        </el-row>
      </div>

      <div v-else-if="error" key="error" class="rounded-token-md border border-border">
        <el-result
          icon="warning"
          title="Couldn't load the dashboard"
          sub-title="Something went wrong while fetching the latest statistics."
        >
          <template #extra>
            <el-button type="primary" @click="retry">
              Retry
            </el-button>
          </template>
        </el-result>
      </div>

      <div v-else-if="data" key="content" class="flex flex-col gap-5">
        <div class="stat-cards-row">
          <div class="stat-card">
            <el-card shadow="never" class="h-full">
              <router-link :to="{ name: routeNames.events }" class="block hover:text-accent">
                <el-statistic
                  title="Total events"
                  :value="totalEventsDisplay"
                  class="headline-statistic tabular-nums"
                />
              </router-link>
            </el-card>
          </div>

          <div class="stat-card">
            <el-card shadow="never" class="h-full">
              <router-link
                :to="{ name: routeNames.events, query: { status: 'published' } }"
                class="block hover:text-accent"
              >
                <el-statistic
                  title="Currently running"
                  :value="runningEventsDisplay"
                  class="headline-statistic tabular-nums"
                >
                  <template #suffix>
                    <span class="text-caption text-text-muted align-middle">({{ runningEventsPercentage }}%)</span>
                  </template>
                </el-statistic>
              </router-link>
            </el-card>
          </div>

          <div class="stat-card">
            <el-card shadow="never" class="h-full">
              <router-link
                :to="{ name: routeNames.events, query: { status: 'draft' } }"
                class="block hover:text-accent"
              >
                <el-statistic title="Draft events" :value="draftEventsDisplay" class="headline-statistic tabular-nums">
                  <template #suffix>
                    <span class="text-caption text-text-muted align-middle">({{ draftEventsPercentage }}%)</span>
                  </template>
                </el-statistic>
              </router-link>
            </el-card>
          </div>

          <div class="stat-card">
            <el-card shadow="never" class="h-full">
              <router-link :to="{ name: routeNames.tickets }" class="block hover:text-accent">
                <el-statistic
                  title="Total tickets"
                  :value="totalTicketsDisplay"
                  class="headline-statistic tabular-nums"
                />
              </router-link>
            </el-card>
          </div>

          <div class="stat-card">
            <el-card shadow="never" class="h-full">
              <router-link :to="{ name: routeNames.tickets }" class="block hover:text-accent">
                <el-statistic
                  title="Total available quantity"
                  :value="totalAvailableQuantityDisplay"
                  class="headline-statistic tabular-nums"
                />
              </router-link>
            </el-card>
          </div>
        </div>

        <!-- Gross inventory value per currency — one labelled block, never summed across currencies. -->
        <el-row :gutter="16">
          <el-col :span="24" class="mb-4">
            <el-card shadow="never">
              <el-descriptions title="Gross inventory value" :column="grossInventoryValueColumns" border>
                <el-descriptions-item
                  v-for="currencyTotal in data.grossInventoryValue"
                  :key="currencyTotal.currency"
                  :label="currencyTotal.currency"
                >
                  <span class="tabular-nums">
                    {{ filters.formatMoney(currencyTotal.totalMinorUnits, currencyTotal.currency) }}
                  </span>
                </el-descriptions-item>

                <el-descriptions-item v-if="data.grossInventoryValue.length === 0" label="No inventory">
                  —
                </el-descriptions-item>
              </el-descriptions>
            </el-card>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :xs="24" :md="12" class="mb-4">
            <section aria-labelledby="events-status-heading">
              <h2 id="events-status-heading" class="text-section-heading text-text-primary mb-3">Events by status</h2>
              <StatusDistributionBar :entries="eventsDistributionEntries" />
            </section>
          </el-col>

          <el-col :xs="24" :md="12" class="mb-4">
            <section aria-labelledby="tickets-status-heading">
              <h2 id="tickets-status-heading" class="text-section-heading text-text-primary mb-3">Tickets by status</h2>
              <StatusDistributionBar :entries="ticketsDistributionEntries" />
            </section>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :xs="24" :md="12" class="mb-4">
            <section aria-labelledby="upcoming-events-heading">
              <h2 id="upcoming-events-heading" class="text-section-heading text-text-primary mb-3">
                Next events starting
              </h2>
              <el-table :data="data.upcomingEvents" size="small" @row-click="onUpcomingEventRowClick">
                <el-table-column label="Name">
                  <template #default="{ row }">
                    <router-link
                      v-if="canDo('events', 'update')"
                      :to="{ name: routeNames.eventEdit, params: { id: (row as TEvent).id } }"
                      class="text-accent hover:underline"
                    >
                      {{ (row as TEvent).name }}
                    </router-link>
                    <span v-else>{{ (row as TEvent).name }}</span>
                  </template>
                </el-table-column>
                <el-table-column label="Starts">
                  <template #default="{ row }">
                    {{ filters.formatDate((row as TEvent).startDate) }}
                  </template>
                </el-table-column>
                <el-table-column label="Status">
                  <template #default="{ row }">
                    <StatusTag :status="(row as TEvent).status" />
                  </template>
                </el-table-column>
                <template #empty>
                  No upcoming events.
                </template>
              </el-table>
            </section>
          </el-col>

          <el-col :xs="24" :md="12" class="mb-4">
            <section aria-labelledby="nearly-sold-out-heading">
              <h2 id="nearly-sold-out-heading" class="text-section-heading text-text-primary mb-3">
                Tickets nearly sold out
              </h2>
              <el-table :data="data.nearlySoldOutTickets" size="small" @row-click="onNearlySoldOutTicketRowClick">
                <el-table-column label="Name">
                  <template #default="{ row }">
                    <router-link
                      v-if="canDo('tickets', 'update')"
                      :to="{ name: routeNames.ticketEdit, params: { id: (row as TTicket).id } }"
                      class="text-accent hover:underline"
                    >
                      {{ (row as TTicket).name }}
                    </router-link>
                    <span v-else>{{ (row as TTicket).name }}</span>
                  </template>
                </el-table-column>
                <el-table-column label="Quantity">
                  <template #default="{ row }">
                    <span class="tabular-nums">{{ (row as TTicket).quantity }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="eventName" label="Event" />
                <template #empty>
                  No tickets are running low.
                </template>
              </el-table>
            </section>
          </el-col>
        </el-row>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
@reference "@/assets/styles/main.css";

/* Below `md` the stat cards become a swipeable row (bleeding past el-main's 20px padding) so five figures
   don't take five screens; the next card peeks in to show the row scrolls. */
.stat-cards-row {
  @apply -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-1;
  @apply md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 md:pb-0 xl:grid-cols-5;

  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.stat-card {
  @apply w-[72%] shrink-0 snap-start md:w-auto;
}

/* el-statistic uses Element Plus's own extra-large size step, not the screen-heading token, so size it via :deep(). */
.headline-statistic :deep(.el-statistic__content) {
  font-size: var(--text-screen-heading);
  line-height: var(--text-screen-heading--line-height);
}

.headline-statistic :deep(.el-statistic__number) {
  font-weight: var(--text-screen-heading--font-weight);
}

.headline-statistic :deep(.el-statistic__head) {
  font-size: var(--text-caption);
  line-height: var(--text-caption--line-height);
  font-weight: var(--text-caption--font-weight);
}
</style>
