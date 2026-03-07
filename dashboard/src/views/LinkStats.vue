<template>
  <div class="max-w-3xl">
    <div class="flex items-center gap-3 mb-6">
      <RouterLink to="/links" class="text-gray-400 hover:text-gray-600">← Links</RouterLink>
      <h1 class="text-xl font-semibold">Click Stats</h1>
    </div>

    <div v-if="loading" class="text-center py-16 text-gray-400">Loading…</div>
    <div v-else-if="error" class="text-center py-16 text-red-500">{{ error }}</div>

    <div v-else class="space-y-6">
      <!-- By day -->
      <section class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 class="text-sm font-semibold text-gray-700 mb-4">Clicks by Day (last 30)</h2>
        <div v-if="stats!.byDay.length === 0" class="text-gray-400 text-sm">No data yet</div>
        <div v-else class="space-y-2">
          <div v-for="row in stats!.byDay" :key="row.date" class="flex items-center gap-3">
            <span class="text-xs text-gray-500 w-24 flex-shrink-0">{{ row.date }}</span>
            <div class="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                class="bg-indigo-500 h-2 rounded-full"
                :style="{ width: barWidth(row.count, maxDayCount) + '%' }"
              />
            </div>
            <span class="text-xs font-medium text-gray-700 w-8 text-right">{{ row.count }}</span>
          </div>
        </div>
      </section>

      <!-- By referrer + by country, side by side -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- By referrer -->
        <section class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 class="text-sm font-semibold text-gray-700 mb-4">Top Referrers</h2>
          <div v-if="stats!.byReferrer.length === 0" class="text-gray-400 text-sm">No data</div>
          <div v-else class="space-y-2">
            <div v-for="row in stats!.byReferrer" :key="row.referrer ?? 'direct'" class="flex items-center justify-between">
              <span class="text-xs text-gray-600 truncate max-w-[200px]">{{ row.referrer ?? '(direct)' }}</span>
              <span class="text-xs font-medium text-gray-700 ml-3">{{ row.count }}</span>
            </div>
          </div>
        </section>

        <!-- By country -->
        <section class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 class="text-sm font-semibold text-gray-700 mb-4">Top Countries</h2>
          <div v-if="stats!.byCountry.length === 0" class="text-gray-400 text-sm">No data</div>
          <div v-else class="space-y-2">
            <div v-for="row in stats!.byCountry" :key="row.country ?? 'unknown'" class="flex items-center justify-between">
              <span class="text-xs text-gray-600">{{ row.country ?? '(unknown)' }}</span>
              <span class="text-xs font-medium text-gray-700 ml-3">{{ row.count }}</span>
            </div>
          </div>
        </section>
      </div>

      <!-- Edit link -->
      <div class="flex gap-3">
        <RouterLink :to="`/links/${linkId}/edit`" class="text-sm text-indigo-600 hover:underline">Edit this link →</RouterLink>
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
