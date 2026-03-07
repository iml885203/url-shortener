<template>
  <div class="max-w-4xl space-y-5">
    <h1 class="tool-heading text-xl font-semibold text-slate-100">Edit Link</h1>

    <AppCard v-if="loading" variant="compact" class="py-16 text-center text-slate-400">Loading…</AppCard>
    <AppCard v-else-if="loadError" variant="compact" class="py-16 text-center text-red-400">{{ loadError }}</AppCard>

    <div v-else class="md:flex md:items-start md:gap-6">
      <form @submit.prevent="submit" class="flex-1 min-w-0">
        <AppCard class="space-y-5">
          <AppCard variant="compact" class="space-y-2 bg-slate-950 text-xs font-mono">
            <div class="flex items-center gap-2">
              <span class="w-14 flex-shrink-0 text-slate-400">Short:</span>
              <a :href="link!.shortUrl" target="_blank" class="tool-link min-w-0 flex-1 truncate">{{ link!.shortUrl }}</a>
              <AppButton type="button" variant="ghost" aria-label="Copy short URL" class="h-9 w-9 px-0" @click="copyUrl(link!.shortUrl)">
                <template #icon>
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                    <rect x="9" y="9" width="13" height="13" rx="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </template>
              </AppButton>
            </div>

            <div class="flex items-center gap-2">
              <span class="w-14 flex-shrink-0 text-slate-400">Long:</span>
              <a
                :href="link!.longUrl"
                target="_blank"
                class="min-w-0 flex-1 truncate text-slate-400 transition-colors duration-200 hover:text-slate-200"
              >
                {{ link!.longUrl }}
              </a>
              <AppButton type="button" variant="ghost" aria-label="Copy long URL" class="h-9 w-9 px-0" @click="copyUrl(link!.longUrl)">
                <template #icon>
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                    <rect x="9" y="9" width="13" height="13" rx="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </template>
              </AppButton>
            </div>
          </AppCard>

          <div>
            <label class="mb-1 block text-sm font-medium text-slate-200">Target URL <span class="text-red-400">*</span></label>
            <input v-model="form.url" type="url" required class="app-input" />
          </div>

          <label class="flex cursor-pointer items-center justify-between rounded-md border border-slate-800 bg-slate-950 px-3 py-2.5">
            <span class="text-sm font-medium text-slate-200">Use custom OG preview</span>
            <input
              v-model="form.ogEnabled"
              type="checkbox"
              class="h-4 w-4 rounded border-slate-600 bg-slate-900 text-blue-600 focus:ring-2 focus:ring-blue-500"
            />
          </label>

          <p v-if="!form.ogEnabled" class="text-sm text-slate-400">Will use destination website preview</p>

          <template v-if="form.ogEnabled">
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-200">OG Title</label>
              <input v-model="form.ogTitle" type="text" class="app-input" />
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-slate-200">OG Description</label>
              <textarea v-model="form.ogDesc" rows="2" class="app-input" />
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-slate-200">OG Image</label>
              <input v-model="form.ogImage" type="url" class="app-input mb-2" placeholder="https://…" />

              <div class="mt-2">
                <label class="text-xs font-medium text-slate-400">Upload image:</label>
                <input
                  type="file"
                  accept="image/*"
                  @change="handleFileChange"
                  class="mt-1 block cursor-pointer text-xs text-slate-400 file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-slate-700 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-200 hover:file:border-blue-500 hover:file:text-blue-400"
                />
              </div>

              <p v-if="uploadError" class="mt-1 text-xs text-red-400">{{ uploadError }}</p>
              <p v-if="uploadLoading" class="mt-1 text-xs text-slate-400">Uploading…</p>
            </div>
          </template>

          <p v-if="error" class="text-sm text-red-400">{{ error }}</p>
          <p v-if="saved" class="text-sm text-blue-400">Saved</p>

          <div class="flex flex-col gap-3 pt-1 sm:flex-row">
            <AppButton type="submit" :disabled="saving" variant="primary" class="w-full sm:w-auto">
              {{ saving ? 'Saving…' : 'Save' }}
            </AppButton>
            <AppButton to="/links" variant="secondary" class="w-full sm:w-auto">Back to links</AppButton>
            <AppButton :to="`/links/${link!.id}/stats`" variant="secondary" class="w-full sm:ml-auto sm:w-auto">View stats</AppButton>
          </div>
        </AppCard>
      </form>

      <div class="mt-6 w-full flex-shrink-0 md:mt-0 md:w-80 lg:w-96">
        <p class="mb-2 text-sm font-medium text-slate-400">Preview</p>

        <OgPreviewCard
          :title="cardTitle"
          :description="cardDescription"
          :imageUrl="cardImageUrl"
          :showDescriptionPlaceholder="false"
        />
        <p v-if="!form.ogEnabled" class="mt-2 text-xs text-slate-400">Preview from destination website</p>
        <p v-if="uploadLoading" class="mt-2 text-center text-xs text-slate-400">Uploading image…</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { copyToClipboard } from '@/utils/clipboard';
import { useRoute } from 'vue-router';
import { fetchDestinationOgPreview, listLinks, updateLink, uploadImage, type DestinationOgPreview, type Link } from '@/api/client';
import OgPreviewCard from '@/components/OgPreviewCard.vue';
import AppButton from '@/components/ui/AppButton.vue';
import AppCard from '@/components/ui/AppCard.vue';

const DEFAULT_OG_IMAGE = 'https://go.dotw.me/assets/og-default.png';
const PREVIEW_UNAVAILABLE_DESC = 'Preview unavailable';

const route = useRoute();
const linkId = Number(route.params.id);

const link = ref<Link | null>(null);
const loading = ref(true);
const loadError = ref('');
const saving = ref(false);
const error = ref('');
const saved = ref(false);
const uploadLoading = ref(false);
const uploadError = ref('');
const localFilePreview = ref('');
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
const previewImageUrl = computed(() => localFilePreview.value || form.value.ogImage.trim() || DEFAULT_OG_IMAGE);
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

onMounted(async () => {
  try {
    const links = await listLinks();
    link.value = links.find((l) => l.id === linkId) ?? null;
    if (link.value) {
      form.value = {
        url: link.value.url,
        ogEnabled: link.value.ogEnabled ?? false,
        ogTitle: link.value.ogTitle ?? '',
        ogDesc: link.value.ogDesc ?? '',
        ogImage: link.value.ogImage ?? '',
      };
    } else {
      loadError.value = 'Link not found';
    }
  } catch (e: unknown) {
    loadError.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
});

onBeforeUnmount(() => {
  if (previewDebounceTimer) clearTimeout(previewDebounceTimer);
  if (localFilePreview.value) {
    URL.revokeObjectURL(localFilePreview.value);
  }
});

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

async function submit() {
  error.value = '';
  saved.value = false;
  saving.value = true;
  try {
    const updated = await updateLink(linkId, {
      url: form.value.url,
      ogEnabled: form.value.ogEnabled,
      ogTitle: form.value.ogTitle || null,
      ogDesc: form.value.ogDesc || null,
      ogImage: form.value.ogImage || null,
    });
    link.value = updated;
    saved.value = true;
    setTimeout(() => (saved.value = false), 2000);
  } catch (e: unknown) {
    error.value = (e as Error).message;
  } finally {
    saving.value = false;
  }
}

async function handleFileChange(evt: Event) {
  const file = (evt.target as HTMLInputElement).files?.[0];
  if (!file) return;

  if (localFilePreview.value) URL.revokeObjectURL(localFilePreview.value);
  localFilePreview.value = URL.createObjectURL(file);

  uploadError.value = '';
  uploadLoading.value = true;
  try {
    const url = await uploadImage(linkId, file);
    form.value.ogImage = url;
    URL.revokeObjectURL(localFilePreview.value);
    localFilePreview.value = '';
  } catch (e: unknown) {
    uploadError.value = (e as Error).message;
    URL.revokeObjectURL(localFilePreview.value);
    localFilePreview.value = '';
  } finally {
    uploadLoading.value = false;
  }
}

function copyUrl(text: string) {
  copyToClipboard(text).then(() => showCopyToast());
}
</script>
