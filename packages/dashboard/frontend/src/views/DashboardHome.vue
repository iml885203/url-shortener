<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between gap-3">
      <h1 class="tool-heading text-xl font-semibold tracking-tight text-ui-ink">Overview</h1>
      <AppButton to="/links/new" variant="secondary">
        <template #icon>
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </template>
        New link
      </AppButton>
    </div>

    <div v-if="loading" class="space-y-5">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <AppCard v-for="n in 3" :key="n" variant="compact">
          <div class="mb-3 h-3 w-24 bg-ui-hover"></div>
          <div class="h-7 w-20 bg-ui-hover"></div>
        </AppCard>
      </div>

      <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <AppCard variant="compact">
          <div class="mb-3 h-4 w-24 bg-ui-hover"></div>
          <div v-for="n in 4" :key="`top-${n}`" class="mb-2 h-10 bg-ui-hover/80"></div>
        </AppCard>

        <AppCard variant="compact">
          <div class="mb-3 h-4 w-28 bg-ui-hover"></div>
          <div v-for="n in 6" :key="`trend-${n}`" class="mb-2 h-4 bg-ui-hover/80"></div>
        </AppCard>
      </div>
    </div>

    <AppCard v-else-if="error" variant="compact" class="py-10 text-center text-sm text-ui-danger">
      {{ error }}
    </AppCard>

    <AppCard v-else-if="isEmpty" class="text-center">
      <h2 class="text-base font-medium text-ui-ink">No analytics yet</h2>
      <p class="mt-2 text-sm text-ui-secondary">Create links and share them to start seeing activity here.</p>
      <AppButton to="/links/new" variant="secondary" class="mt-5">
        <template #icon>
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </template>
        Create first link
      </AppButton>
    </AppCard>

    <div v-else class="space-y-5">
      <section class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <AppCard variant="compact">
          <p class="text-xs uppercase tracking-wide text-ui-secondary">Today clicks</p>
          <p class="mt-1 text-3xl font-semibold text-ui-ink">{{ stats!.todayClicks }}</p>
        </AppCard>
        <AppCard variant="compact">
          <p class="text-xs uppercase tracking-wide text-ui-secondary">7-day clicks</p>
          <p class="mt-1 text-3xl font-semibold text-ui-ink">{{ stats!.weekClicks }}</p>
        </AppCard>
        <AppCard variant="compact">
          <p class="text-xs uppercase tracking-wide text-ui-secondary">Total links</p>
          <p class="mt-1 text-3xl font-semibold text-ui-ink">{{ stats!.totalLinks }}</p>
        </AppCard>
      </section>

      <section class="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <AppCard variant="compact">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="tool-heading text-sm font-semibold text-ui-ink">Top links</h2>
            <RouterLink to="/links" class="text-xs text-ui-focus hover:text-ui-action-hover">View all</RouterLink>
          </div>

          <div v-if="stats!.topLinks.length === 0" class="text-sm text-ui-muted">No link activity yet.</div>

          <div v-else class="space-y-3">
            <AppCard
              v-for="link in stats!.topLinks"
              :key="link.id"
              variant="compact"
              class="bg-ui-canvas"
            >
              <div class="flex items-start justify-between gap-3">
                <p class="break-all text-sm text-ui-ink">{{ link.url }}</p>
                <span class="whitespace-nowrap text-xs text-ui-secondary">{{ link.clickCount }} clicks</span>
              </div>

              <div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <AppCard variant="compact" class="bg-ui-raised px-2 py-1.5">
                  <div class="flex min-w-0 items-center gap-2">
                    <a
                      :href="link.shortUrl"
                      target="_blank"
                      class="truncate font-mono text-xs text-ui-focus hover:text-ui-action-hover"
                      >{{ link.shortUrl }}</a
                    >
                    <AppButton
                      variant="ghost"
                      class="h-7 px-2 text-xs"
                      @click="copyUrl(link.shortUrl)"
                      title="Copy short URL"
                    >
                      Copy
                    </AppButton>
                  </div>
                </AppCard>

                <AppCard variant="compact" class="bg-ui-raised px-2 py-1.5">
                  <div class="flex min-w-0 items-center gap-2">
                    <a
                      :href="link.longUrl"
                      target="_blank"
                      class="truncate font-mono text-xs text-ui-secondary hover:text-ui-ink"
                      >{{ link.longUrl }}</a
                    >
                    <AppButton
                      variant="ghost"
                      class="h-7 px-2 text-xs"
                      @click="copyUrl(link.longUrl)"
                      title="Copy long URL"
                    >
                      Copy
                    </AppButton>
                  </div>
                </AppCard>
              </div>
            </AppCard>
          </div>
        </AppCard>

        <AppCard variant="compact">
          <h2 class="tool-heading mb-4 text-sm font-semibold text-ui-ink">Clicks by day (14 days)</h2>
          <div v-if="stats!.clicksByDay.length === 0" class="text-sm text-ui-muted">No data yet</div>
          <div v-else class="space-y-2">
            <div v-for="row in stats!.clicksByDay" :key="row.date" class="flex items-center gap-3">
              <span class="w-14 shrink-0 text-xs text-ui-muted">{{ shortDate(row.date) }}</span>
              <div class="h-2 flex-1 overflow-hidden bg-ui-hover">
                <div
                  class="h-2 bg-ui-action-hover transition-[width]"
                  :style="{ width: barWidth(row.count, maxDayCount) + '%' }"
                />
              </div>
              <span class="w-8 text-right text-xs font-medium text-ui-secondary">{{ row.count }}</span>
            </div>
          </div>
        </AppCard>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, ref } from 'vue';
import { copyToClipboard } from '@/utils/clipboard';
import { getOverviewStats, type OverviewStats } from '@/api/client';
import AppButton from '@/components/ui/AppButton.vue';
import AppCard from '@/components/ui/AppCard.vue';

const stats = ref<OverviewStats | null>(null);
const loading = ref(true);
const error = ref('');
const showCopyToast = inject<() => void>('showCopyToast', () => {});

onMounted(async () => {
  try {
    stats.value = await getOverviewStats();
  } catch (e: unknown) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
});

const maxDayCount = computed(() =>
  stats.value ? Math.max(...stats.value.clicksByDay.map((r) => r.count), 1) : 1
);

const isEmpty = computed(() => {
  if (!stats.value) return false;
  const totalClicks = stats.value.clicksByDay.reduce((sum, row) => sum + row.count, 0);
  return stats.value.totalLinks === 0 && stats.value.topLinks.length === 0 && totalClicks === 0;
});

function barWidth(count: number, max: number): number {
  return Math.round((count / max) * 100);
}

function shortDate(date: string): string {
  return date.slice(5);
}

function copyUrl(text: string) {
  copyToClipboard(text).then(() => showCopyToast());
}
</script>
