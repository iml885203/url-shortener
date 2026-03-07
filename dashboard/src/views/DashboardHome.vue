<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between gap-3">
      <h1 class="text-xl font-semibold tracking-tight text-slate-100">Overview</h1>
      <RouterLink
        to="/links/new"
        class="inline-flex items-center border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-medium text-slate-100 hover:border-blue-500 hover:text-blue-400 transition-colors"
      >
        New link
      </RouterLink>
    </div>

    <div v-if="loading" class="space-y-5">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div v-for="n in 3" :key="n" class="border border-slate-800 bg-slate-900 p-4">
          <div class="mb-3 h-3 w-24 bg-slate-800"></div>
          <div class="h-7 w-20 bg-slate-800"></div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div class="border border-slate-800 bg-slate-900 p-4">
          <div class="mb-3 h-4 w-24 bg-slate-800"></div>
          <div v-for="n in 4" :key="`top-${n}`" class="mb-2 h-10 bg-slate-800/80"></div>
        </div>

        <div class="border border-slate-800 bg-slate-900 p-4">
          <div class="mb-3 h-4 w-28 bg-slate-800"></div>
          <div v-for="n in 6" :key="`trend-${n}`" class="mb-2 h-4 bg-slate-800/80"></div>
        </div>
      </div>
    </div>

    <div v-else-if="error" class="border border-slate-800 bg-slate-900 py-10 text-center text-sm text-red-400">
      {{ error }}
    </div>

    <div v-else-if="isEmpty" class="border border-slate-800 bg-slate-900 p-8 text-center">
      <h2 class="text-base font-medium text-slate-100">No analytics yet</h2>
      <p class="mt-2 text-sm text-slate-400">Create links and share them to start seeing activity here.</p>
      <RouterLink
        to="/links/new"
        class="mt-5 inline-flex items-center border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-medium text-slate-100 hover:border-blue-500 hover:text-blue-400 transition-colors"
      >
        Create first link
      </RouterLink>
    </div>

    <div v-else class="space-y-5">
      <section class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div class="border border-slate-800 bg-slate-900 p-4">
          <p class="text-xs uppercase tracking-wide text-slate-400">Today clicks</p>
          <p class="mt-1 text-3xl font-semibold text-slate-100">{{ stats!.todayClicks }}</p>
        </div>
        <div class="border border-slate-800 bg-slate-900 p-4">
          <p class="text-xs uppercase tracking-wide text-slate-400">7-day clicks</p>
          <p class="mt-1 text-3xl font-semibold text-slate-100">{{ stats!.weekClicks }}</p>
        </div>
        <div class="border border-slate-800 bg-slate-900 p-4">
          <p class="text-xs uppercase tracking-wide text-slate-400">Total links</p>
          <p class="mt-1 text-3xl font-semibold text-slate-100">{{ stats!.totalLinks }}</p>
        </div>
      </section>

      <section class="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div class="border border-slate-800 bg-slate-900 p-4">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-sm font-semibold text-slate-200">Top links</h2>
            <RouterLink to="/links" class="text-xs text-blue-400 hover:text-blue-300">View all</RouterLink>
          </div>

          <div v-if="stats!.topLinks.length === 0" class="text-sm text-slate-500">No link activity yet.</div>

          <div v-else class="space-y-3">
            <div
              v-for="link in stats!.topLinks"
              :key="link.id"
              class="border border-slate-800 bg-slate-950 px-3 py-2"
            >
              <div class="flex items-start justify-between gap-3">
                <p class="break-all text-sm text-slate-200">{{ link.url }}</p>
                <span class="whitespace-nowrap text-xs text-slate-400">{{ link.clickCount }} clicks</span>
              </div>

              <div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div class="flex min-w-0 items-center gap-2 border border-slate-800 bg-slate-900 px-2 py-1.5">
                  <a
                    :href="link.shortUrl"
                    target="_blank"
                    class="truncate font-mono text-xs text-blue-400 hover:text-blue-300"
                    >{{ link.shortUrl }}</a
                  >
                  <button
                    type="button"
                    class="text-xs text-slate-400 hover:text-slate-100"
                    @click="copyUrl(link.shortUrl)"
                    title="Copy short URL"
                  >
                    Copy
                  </button>
                </div>

                <div class="flex min-w-0 items-center gap-2 border border-slate-800 bg-slate-900 px-2 py-1.5">
                  <a
                    :href="link.longUrl"
                    target="_blank"
                    class="truncate font-mono text-xs text-slate-400 hover:text-slate-200"
                    >{{ link.longUrl }}</a
                  >
                  <button
                    type="button"
                    class="text-xs text-slate-400 hover:text-slate-100"
                    @click="copyUrl(link.longUrl)"
                    title="Copy long URL"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="border border-slate-800 bg-slate-900 p-4">
          <h2 class="mb-4 text-sm font-semibold text-slate-200">Clicks by day (14 days)</h2>
          <div v-if="stats!.clicksByDay.length === 0" class="text-sm text-slate-500">No data yet</div>
          <div v-else class="space-y-2">
            <div v-for="row in stats!.clicksByDay" :key="row.date" class="flex items-center gap-3">
              <span class="w-14 shrink-0 text-xs text-slate-500">{{ shortDate(row.date) }}</span>
              <div class="h-2 flex-1 overflow-hidden bg-slate-800">
                <div
                  class="h-2 bg-blue-500 transition-all"
                  :style="{ width: barWidth(row.count, maxDayCount) + '%' }"
                />
              </div>
              <span class="w-8 text-right text-xs font-medium text-slate-300">{{ row.count }}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, ref } from 'vue';
import { getOverviewStats, type OverviewStats } from '@/api/client';

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
  navigator.clipboard.writeText(text).then(() => showCopyToast()).catch(() => {});
}
</script>
