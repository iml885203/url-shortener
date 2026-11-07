<template>
  <div class="overflow-hidden rounded-lg border border-ui-edge bg-ui-raised">
    <div class="flex aspect-video w-full items-center justify-center overflow-hidden bg-ui-canvas">
      <img
        v-if="imageUrl && !imgErrored"
        :src="imageUrl"
        alt="OG image preview"
        class="h-full w-full object-cover"
        @error="onImgError"
      />
      <svg
        v-else
        class="h-10 w-10 text-ui-muted"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.75"
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="16" rx="2"></rect>
        <circle cx="9" cy="10" r="1.5"></circle>
        <path stroke-linecap="round" stroke-linejoin="round" d="m21 16-5.5-5.5L7 19"></path>
      </svg>
    </div>

    <div class="space-y-1 px-3 py-3">
      <p class="text-[11px] font-medium uppercase tracking-wider text-ui-secondary">{{ domain }}</p>
      <p class="text-sm font-semibold leading-snug text-ui-ink">
        {{ title || 'Link title will appear here' }}
      </p>
      <p v-if="description" class="line-clamp-2 pt-0.5 text-xs leading-relaxed text-ui-secondary">
        {{ description }}
      </p>
      <p v-else-if="showDescriptionPlaceholder" class="pt-0.5 text-xs italic leading-relaxed text-ui-muted">
        Description will appear here
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { config } from '@/config';

const domain = computed(() => {
  try {
    return new URL(config.baseUrl).hostname;
  } catch {
    return '';
  }
});

const props = withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    imageUrl?: string;
    showDescriptionPlaceholder?: boolean;
  }>(),
  {
    showDescriptionPlaceholder: true,
  }
);

const imgErrored = ref(false);
watch(() => props.imageUrl, () => {
  imgErrored.value = false;
});

function onImgError() {
  imgErrored.value = true;
}
</script>
