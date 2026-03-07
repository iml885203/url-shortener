<template>
  <div class="max-w-3xl space-y-6">
    <div class="flex flex-wrap items-center gap-3">
      <RouterLink to="/links" class="tool-btn-secondary h-9 px-3 text-xs">Back to links</RouterLink>
      <h1 class="tool-heading text-xl font-semibold text-slate-100">Click Stats</h1>
    </div>

    <div v-if="loading" class="rounded-lg border border-slate-800 bg-slate-900 py-16 text-center text-slate-400">Loading…</div>
    <div v-else-if="error" class="rounded-lg border border-slate-800 bg-slate-900 py-16 text-center text-red-400">{{ error }}</div>

    <div v-else class="space-y-6">
      <section class="tool-panel p-5">
        <h2 class="tool-heading mb-4 text-sm font-semibold text-slate-200">Clicks by Day (last 30)</h2>
        <div v-if="stats!.byDay.length === 0" class="text-sm text-slate-400">No data yet</div>
        <div v-else class="space-y-2">
          <div v-for="row in stats!.byDay" :key="row.date" class="flex items-center gap-3">
            <span class="w-24 flex-shrink-0 text-xs text-slate-400">{{ row.date }}</span>
            <div class="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
              <div
                class="h-2 rounded-full bg-blue-600 transition-all duration-200"
                :style="{ width: barWidth(row.count, maxDayCount) + '%' }"
              />
            </div>
            <span class="w-8 text-right text-xs font-medium text-slate-200">{{ row.count }}</span>
          </div>
        </div>
      </section>

      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section class="tool-panel p-5">
          <h2 class="tool-heading mb-4 text-sm font-semibold text-slate-200">Top Referrers</h2>
          <div v-if="stats!.byReferrer.length === 0" class="text-sm text-slate-400">No data</div>
          <div v-else class="space-y-2">
            <div v-for="row in stats!.byReferrer" :key="row.referrer ?? 'direct'" class="flex items-center justify-between gap-3">
              <span class="truncate text-xs text-slate-400">{{ row.referrer ?? '(direct)' }}</span>
              <span class="flex-shrink-0 text-xs font-medium text-slate-200">{{ row.count }}</span>
            </div>
          </div>
        </section>

        <section class="tool-panel p-5">
          <h2 class="tool-heading mb-4 text-sm font-semibold text-slate-200">Top Countries</h2>
          <div v-if="stats!.byCountry.length === 0" class="text-sm text-slate-400">No data</div>
          <div v-else class="space-y-2">
            <div v-for="row in stats!.byCountry" :key="row.country ?? 'unknown'" class="flex items-center justify-between gap-3">
              <span class="text-xs text-slate-400">{{ row.country ?? '(unknown)' }}</span>
              <span class="flex-shrink-0 text-xs font-medium text-slate-200">{{ row.count }}</span>
            </div>
          </div>
        </section>
      </div>

      <div>
        <RouterLink :to="`/links/${linkId}/edit`" class="tool-link text-sm">Edit this link</RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { getLinkStats, type Stats } from '@/api/client';

const route = useRoute();
const linkId = Number(route.params.id);

const stats = ref<Stats | null>(null);
const loading = ref(true);
const error = ref('');

onMounted(async () => {
  try {
    stats.value = await getLinkStats(linkId);
  } catch (e: unknown) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
});

const maxDayCount = computed(() =>
  stats.value ? Math.max(...stats.value.byDay.map((r) => r.count), 1) : 1
);

function barWidth(count: number, max: number): number {
  return Math.round((count / max) * 100);
}
</script>
