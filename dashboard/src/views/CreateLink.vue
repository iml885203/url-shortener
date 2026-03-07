<template>
  <div class="max-w-4xl">
    <h1 class="text-xl font-semibold mb-6 text-white">New Link</h1>

    <div class="md:flex md:gap-6 md:items-start">
      <!-- Form -->
      <form @submit.prevent="submit" class="flex-1 min-w-0 bg-gray-800 rounded-xl border border-gray-700 shadow-sm p-5 sm:p-6 space-y-5">
        <!-- Target URL -->
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Target URL <span class="text-red-400">*</span></label>
          <input
            v-model="form.url"
            type="url"
            required
            class="block w-full rounded-md bg-gray-700 border border-gray-600 text-white placeholder-gray-500 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="https://example.com/article"
          />
        </div>

        <!-- OG Toggle -->
        <label class="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-700/30 px-3 py-2.5">
          <span class="text-sm font-medium text-gray-200">Use custom OG preview</span>
          <input
            v-model="form.ogEnabled"
            type="checkbox"
            class="h-4 w-4 rounded border-gray-500 bg-gray-700 text-indigo-500 focus:ring-indigo-500"
          />
        </label>

        <p v-if="!form.ogEnabled" class="text-sm text-gray-400">
          Will use destination website preview
        </p>

        <template v-if="form.ogEnabled">
          <!-- OG Title -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">OG Title</label>
            <input
              v-model="form.ogTitle"
              type="text"
              class="block w-full rounded-md bg-gray-700 border border-gray-600 text-white placeholder-gray-500 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Article title for social preview"
            />
          </div>

          <!-- OG Description -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">OG Description</label>
            <textarea
              v-model="form.ogDesc"
              rows="2"
              class="block w-full rounded-md bg-gray-700 border border-gray-600 text-white placeholder-gray-500 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Description shown in social previews"
            />
          </div>

          <!-- OG Image URL -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">OG Image URL</label>
            <input
              v-model="form.ogImage"
              type="url"
              class="block w-full rounded-md bg-gray-700 border border-gray-600 text-white placeholder-gray-500 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="https://… (or upload after creating)"
            />
          </div>

          <p class="text-xs text-gray-500">
            💡 To upload an OG image, create the link first, then edit it to upload.
          </p>
        </template>

        <p v-if="error" class="text-sm text-red-400">{{ error }}</p>

        <div class="flex flex-col sm:flex-row gap-3 pt-1">
          <button
            type="submit"
            :disabled="loading"
            class="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-5 py-2 rounded-md disabled:opacity-50 transition-colors"
          >
            {{ loading ? 'Creating…' : 'Create Link' }}
          </button>
          <RouterLink to="/links" class="w-full sm:w-auto text-center text-sm text-gray-500 hover:text-gray-300 px-4 py-2 transition-colors">Cancel</RouterLink>
        </div>
      </form>

      <!-- OG Preview Card -->
      <div class="w-full md:w-80 lg:w-96 flex-shrink-0 mt-6 md:mt-0">
        <p class="text-sm font-medium text-gray-400 mb-2">Preview</p>

        <OgPreviewCard
          :title="cardTitle"
          :description="cardDescription"
          :imageUrl="cardImageUrl"
          :showDescriptionPlaceholder="false"
        />
        <p v-if="!form.ogEnabled" class="text-xs text-gray-500 mt-2">
          Preview from destination website
        </p>
      </div>
    </div>

    <!-- Success Modal -->
    <Teleport to="body">
      <div
        v-if="createdLink"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm"
      >
        <div class="w-full max-w-md bg-gray-800 rounded-2xl border border-gray-700 shadow-2xl p-6 space-y-5">
          <!-- Header -->
          <div class="text-center">
            <p class="text-2xl mb-1">✅</p>
            <h2 class="text-lg font-semibold text-white">Link Created!</h2>
            <p class="text-sm text-gray-400 mt-1 break-all">{{ createdLink.url }}</p>
          </div>

          <!-- Short URL -->
          <div>
            <p class="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Short URL</p>
            <div class="flex items-center gap-2 bg-gray-700 rounded-lg px-3 py-2">
              <a :href="createdLink.shortUrl" target="_blank" class="flex-1 text-sm text-indigo-400 hover:underline font-mono truncate">{{ createdLink.shortUrl }}</a>
              <button
                type="button"
                @click="copyUrl(createdLink.shortUrl)"
                class="text-gray-400 hover:text-white transition-colors flex-shrink-0 text-base"
                title="Copy short URL"
              >📋</button>
            </div>
          </div>

          <!-- Long URL -->
          <div>
            <p class="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Long URL</p>
            <div class="flex items-center gap-2 bg-gray-700 rounded-lg px-3 py-2">
              <a :href="createdLink.longUrl" target="_blank" class="flex-1 text-sm text-gray-300 hover:underline font-mono truncate" :title="createdLink.longUrl">{{ createdLink.longUrl }}</a>
              <button
                type="button"
                @click="copyUrl(createdLink.longUrl)"
                class="text-gray-400 hover:text-white transition-colors flex-shrink-0 text-base"
                title="Copy long URL"
              >📋</button>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex flex-col sm:flex-row gap-3 pt-1">
            <button
              type="button"
              @click="createAnother"
              class="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
            >
              Create Another
            </button>
            <RouterLink
              to="/links"
              class="flex-1 text-center bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium px-4 py-2 rounded-md transition-colors"
            >
              Back to List
            </RouterLink>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, ref, watch } from 'vue';
import { createLink, fetchDestinationOgPreview, type DestinationOgPreview, type Link } from '@/api/client';
import OgPreviewCard from '@/components/OgPreviewCard.vue';

const DEFAULT_OG_IMAGE = 'https://go.dotw.me/assets/og-default.png';
const PREVIEW_UNAVAILABLE_DESC = 'Preview unavailable';

const loading = ref(false);
const error = ref('');
const createdLink = ref<Link | null>(null);
const destinationPreview = ref<DestinationOgPreview | null>(null);
const destinationPreviewLoading = ref(false);
const previewFetchSeq = ref(0);
let previewDebounceTimer: ReturnType<typeof setTimeout> | null = null;

const showCopyToast = inject<() => void>('showCopyToast', () => {});

const form = ref({
  url: '',
  ogEnabled: false,
  ogTitle: '',
  ogDesc: '',
  ogImage: '',
});

const destinationHost = computed(() => {
  if (!form.value.url) return 'destination website';
  try {
    return new URL(form.value.url).hostname;
  } catch {
    return 'destination website';
  }
});

const previewTitle = computed(() => form.value.ogTitle.trim() || destinationHost.value);
const previewDescription = computed(() => form.value.ogDesc.trim());
const previewImageUrl = computed(() => form.value.ogImage.trim() || DEFAULT_OG_IMAGE);
const hasDestinationPreview = computed(() => {
  const preview = destinationPreview.value;
  return Boolean(preview?.title || preview?.description || preview?.image);
});
const destinationFallbackTitle = computed(() => destinationPreview.value?.domain || destinationHost.value);
const destinationCardTitle = computed(() => {
  if (destinationPreviewLoading.value) return 'Loading preview...';
  return destinationPreview.value?.title || destinationFallbackTitle.value;
});
const destinationCardDescription = computed(() => {
  if (destinationPreviewLoading.value) return 'Fetching destination metadata';
  if (hasDestinationPreview.value) return destinationPreview.value?.description || '';
  return PREVIEW_UNAVAILABLE_DESC;
});
const destinationCardImage = computed(() => {
  if (destinationPreviewLoading.value) return null;
  if (hasDestinationPreview.value) return destinationPreview.value?.image || null;
  return null;
});
const cardTitle = computed(() => (form.value.ogEnabled ? previewTitle.value : destinationCardTitle.value));
const cardDescription = computed(() => (form.value.ogEnabled ? previewDescription.value : destinationCardDescription.value));
const cardImageUrl = computed(() => (form.value.ogEnabled ? previewImageUrl.value : destinationCardImage.value));

watch(
  () => [form.value.url, form.value.ogEnabled] as const,
  ([url, ogEnabled]) => {
    if (previewDebounceTimer) clearTimeout(previewDebounceTimer);

    if (ogEnabled) {
      destinationPreviewLoading.value = false;
      return;
    }

    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      destinationPreview.value = null;
      destinationPreviewLoading.value = false;
      return;
    }

    let parsed: URL;
    try {
      parsed = new URL(trimmedUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        destinationPreview.value = null;
        destinationPreviewLoading.value = false;
        return;
      }
    } catch {
      destinationPreview.value = null;
      destinationPreviewLoading.value = false;
      return;
    }

    previewDebounceTimer = setTimeout(async () => {
      const seq = ++previewFetchSeq.value;
      destinationPreviewLoading.value = true;
      try {
        const preview = await fetchDestinationOgPreview(parsed.toString());
        if (seq === previewFetchSeq.value) {
          destinationPreview.value = preview;
        }
      } catch {
        if (seq === previewFetchSeq.value) {
          destinationPreview.value = { title: null, description: null, image: null, domain: parsed.hostname };
        }
      } finally {
        if (seq === previewFetchSeq.value) {
          destinationPreviewLoading.value = false;
        }
      }
    }, 500);
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  if (previewDebounceTimer) clearTimeout(previewDebounceTimer);
});

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    const link = await createLink({
      url: form.value.url,
      ogEnabled: form.value.ogEnabled,
      ogTitle: form.value.ogTitle || undefined,
      ogDesc: form.value.ogDesc || undefined,
      ogImage: form.value.ogImage || undefined,
    });
    createdLink.value = link;
  } catch (e: unknown) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}

function createAnother() {
  createdLink.value = null;
  form.value = { url: '', ogEnabled: false, ogTitle: '', ogDesc: '', ogImage: '' };
  error.value = '';
}

function copyUrl(text: string) {
  navigator.clipboard.writeText(text).then(() => showCopyToast()).catch(() => {});
}
</script>
