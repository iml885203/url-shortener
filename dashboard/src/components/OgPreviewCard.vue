<template>
  <div class="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
    <!-- Image area: 16:9 aspect ratio -->
    <div class="w-full aspect-video bg-gray-900 flex items-center justify-center overflow-hidden">
      <img
        v-if="imageUrl && !imgErrored"
        :src="imageUrl"
        alt="OG image preview"
        class="w-full h-full object-cover"
        @error="onImgError"
      />
      <span v-else class="text-5xl opacity-40 select-none">🖼️</span>
    </div>
    <!-- Text content -->
    <div class="px-3 py-2.5 space-y-0.5">
      <p class="text-[11px] text-gray-500 uppercase tracking-wider font-medium">go.dotw.me</p>
      <p class="text-sm font-bold text-white leading-snug">
        {{ title || 'Link title will appear here' }}
      </p>
      <p v-if="description" class="text-xs text-gray-400 leading-relaxed line-clamp-2 pt-0.5">
        {{ description }}
      </p>
      <p v-else class="text-xs text-gray-600 leading-relaxed pt-0.5 italic">
        Description will appear here
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  title?: string;
  description?: string;
  imageUrl?: string;
}>();

// Reset error state when imageUrl changes so retries work
const imgErrored = ref(false);
watch(() => props.imageUrl, () => { imgErrored.value = false; });

function onImgError() {
  imgErrored.value = true;
}
</script>
