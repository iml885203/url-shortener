<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <div class="flex flex-wrap items-center gap-3">
      <AppButton to="/links" variant="secondary">
        <template #icon>
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </template>
        Back to links
      </AppButton>
      <h1 class="tool-heading text-xl font-semibold text-ui-ink">Click Stats</h1>
    </div>

    <AppCard v-if="loading" variant="compact" class="py-16 text-center text-ui-secondary">Loading…</AppCard>
    <AppCard v-else-if="error" variant="compact" class="py-16 text-center text-ui-danger">{{ error }}</AppCard>

    <div v-else class="space-y-6">
      <AppCard variant="compact">
        <h2 class="tool-heading mb-4 text-sm font-semibold text-ui-ink">Clicks by Day (last 30)</h2>
        <div v-if="stats!.byDay.length === 0" class="text-sm text-ui-secondary">No data yet</div>
        <div v-else class="space-y-2">
          <div v-for="row in stats!.byDay" :key="row.date" class="flex items-center gap-3">
            <span class="w-24 flex-shrink-0 text-xs text-ui-secondary">{{ row.date }}</span>
            <div class="h-2 flex-1 overflow-hidden rounded-full bg-ui-hover">
              <div
                class="h-2 rounded-full bg-ui-focus transition-[width] duration-200"
                :style="{ width: barWidth(row.count, maxDayCount) + '%' }"
              />
            </div>
            <span class="w-8 text-right text-xs font-medium text-ui-ink">{{ row.count }}</span>
          </div>
        </div>
      </AppCard>

      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        <AppCard variant="compact">
          <h2 class="tool-heading mb-4 text-sm font-semibold text-ui-ink">Top Referrers</h2>
          <div v-if="stats!.byReferrer.length === 0" class="text-sm text-ui-secondary">No data</div>
          <div v-else class="space-y-2">
            <div v-for="row in stats!.byReferrer" :key="row.referrer ?? 'direct'" class="flex items-center justify-between gap-3">
              <span class="truncate text-xs text-ui-secondary">{{ row.referrer ?? '(direct)' }}</span>
              <span class="flex-shrink-0 text-xs font-medium text-ui-ink">{{ row.count }}</span>
            </div>
          </div>
        </AppCard>

        <AppCard variant="compact">
          <h2 class="tool-heading mb-4 text-sm font-semibold text-ui-ink">Top Countries</h2>
          <div v-if="stats!.byCountry.length === 0" class="text-sm text-ui-secondary">No data</div>
          <div v-else class="space-y-2">
            <div v-for="row in stats!.byCountry" :key="row.country ?? 'unknown'" class="flex items-center justify-between gap-3">
              <span class="text-xs text-ui-secondary">{{ row.country ?? '(unknown)' }}</span>
              <span class="flex-shrink-0 text-xs font-medium text-ui-ink">{{ row.count }}</span>
            </div>
          </div>
        </AppCard>
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
import AppButton from '@/components/ui/AppButton.vue';
import AppCard from '@/components/ui/AppCard.vue';

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
