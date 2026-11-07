<template>
  <div class="mx-auto max-w-4xl space-y-5">
    <h1 class="tool-heading text-xl font-semibold text-ui-ink">Edit Link</h1>

    <AppCard v-if="loading" variant="compact" class="py-16 text-center text-ui-secondary">Loading…</AppCard>
    <AppCard v-else-if="loadError" variant="compact" class="py-16 text-center text-ui-danger">{{ loadError }}</AppCard>

    <div v-else class="md:flex md:items-start md:gap-6">
      <form @submit.prevent="submit" class="flex-1 min-w-0">
        <AppCard class="space-y-5">
          <AppCard variant="compact" class="space-y-2 bg-ui-canvas text-xs font-mono">
            <div v-if="link!.customUrl" class="flex items-center gap-2">
              <span class="w-14 flex-shrink-0 text-ui-focus">Custom:</span>
              <a :href="link!.customUrl" target="_blank" class="tool-link min-w-0 flex-1 truncate">{{ link!.customUrl }}</a>
              <AppButton type="button" variant="ghost" aria-label="Copy custom URL" size="icon" @click="copyUrl(link!.customUrl!)">
                <template #icon>
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                    <rect x="9" y="9" width="13" height="13" rx="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </template>
              </AppButton>
            </div>

            <div class="flex items-center gap-2">
              <span class="w-14 flex-shrink-0 text-ui-secondary">Short:</span>
              <a :href="link!.shortUrl" target="_blank" class="tool-link min-w-0 flex-1 truncate">{{ link!.shortUrl }}</a>
              <AppButton type="button" variant="ghost" aria-label="Copy short URL" size="icon" @click="copyUrl(link!.shortUrl)">
                <template #icon>
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                    <rect x="9" y="9" width="13" height="13" rx="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </template>
              </AppButton>
            </div>

            <div class="flex items-center gap-2">
              <span class="w-14 flex-shrink-0 text-ui-secondary">Long:</span>
              <a
                :href="link!.longUrl"
                target="_blank"
                class="min-w-0 flex-1 truncate text-ui-secondary transition-colors duration-200 hover:text-ui-ink"
              >
                {{ link!.longUrl }}
              </a>
              <AppButton type="button" variant="ghost" aria-label="Copy long URL" size="icon" @click="copyUrl(link!.longUrl)">
                <template #icon>
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                    <rect x="9" y="9" width="13" height="13" rx="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </template>
              </AppButton>
            </div>

            <div class="flex items-center gap-2">
              <span class="w-14 flex-shrink-0 text-ui-secondary">Debug:</span>
              <a
                :href="debugOgUrl"
                target="_blank"
                class="tool-link min-w-0 flex-1 truncate"
              >
                {{ debugOgUrl }}
              </a>
              <AppButton type="button" variant="ghost" aria-label="Copy debug OG URL" size="icon" @click="copyUrl(debugOgUrl)">
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
            <label for="link-url" class="mb-1 block text-sm font-medium text-ui-ink">Target URL <span class="text-ui-danger">*</span></label>
            <input id="link-url" v-model="form.url" type="url" required class="app-input" />
          </div>

          <div>
            <label for="link-customSlug" class="mb-1 block text-sm font-medium text-ui-ink">Custom Slug <span class="text-ui-secondary font-normal">(optional — leave blank to clear)</span></label>
            <div class="flex items-center">
              <span class="flex min-h-control items-center rounded-l-md border border-r-0 border-ui-control-edge bg-ui-raised px-3 text-xs text-ui-secondary select-none">{{ baseUrlShort }}/</span>
              <input
                id="link-customSlug" v-model="form.customSlug"
                type="text"
                class="app-input rounded-l-none"
                placeholder="e.g. github"
                maxlength="64"
                @input="slugError = ''"
              />
            </div>
            <p v-if="slugError" role="alert" class="mt-1 text-xs text-ui-danger">{{ slugError }}</p>
            <p v-else-if="form.customSlug.trim()" class="mt-1 text-xs" :class="slugValid ? 'text-ui-success' : 'text-ui-danger'">
              {{ slugValid ? `✓ ${baseUrl}/${form.customSlug.trim()}` : 'Only letters, numbers, hyphens, underscores (1–64 chars)' }}
            </p>
          </div>

          <label class="flex cursor-pointer items-center justify-between rounded-md border border-ui-edge bg-ui-canvas px-3 py-2.5">
            <span class="text-sm font-medium text-ui-ink">Use custom OG preview</span>
            <input
              v-model="form.ogEnabled"
              type="checkbox"
              class="h-4 w-4 rounded border-ui-control-edge bg-ui-raised text-ui-focus focus:ring-2 focus:ring-ui-focus"
            />
          </label>

          <p v-if="!form.ogEnabled" class="text-sm text-ui-secondary">Will use destination website preview</p>

          <template v-if="form.ogEnabled">
            <div>
              <label for="link-ogTitle" class="mb-1 block text-sm font-medium text-ui-ink">OG Title</label>
              <input id="link-ogTitle" v-model="form.ogTitle" type="text" class="app-input" />
            </div>

            <div>
              <label for="link-ogDesc" class="mb-1 block text-sm font-medium text-ui-ink">OG Description</label>
              <textarea id="link-ogDesc" v-model="form.ogDesc" rows="2" class="app-input" />
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-ui-ink">OG Image</label>
              <input id="link-ogImage" v-model="form.ogImage" type="url" class="app-input mb-2" placeholder="https://…" />

              <div class="mt-2">
                <label class="text-xs font-medium text-ui-secondary">Upload image:</label>
                <input
                  type="file"
                  accept="image/*"
                  @change="handleFileChange"
                  class="mt-1 block cursor-pointer text-xs text-ui-secondary file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-ui-control-edge file:bg-ui-raised file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ui-ink hover:file:border-ui-focus hover:file:text-ui-focus"
                />
                <p class="mt-1 text-xs text-ui-muted">
                  System auto-optimizes OG images to 1200×630. Max upload 1MB, optimized target ~600KB.
                </p>
              </div>

              <p v-if="uploadError" class="mt-1 text-xs text-ui-danger">{{ uploadError }}</p>
              <p v-if="uploadLoading" class="mt-1 text-xs text-ui-secondary">Uploading…</p>
              <p v-if="uploadSuccess" class="mt-1 text-xs text-ui-focus">Optimized and uploaded.</p>
            </div>
          </template>

          <p v-if="error" role="alert" class="text-sm text-ui-danger">{{ error }}</p>
          <p v-if="saved" class="text-sm text-ui-focus">Saved</p>

          <div class="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap">
            <AppButton type="submit" :disabled="saving" variant="primary" class="w-full sm:w-auto">
              <template #icon>
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </template>
              {{ saving ? 'Saving…' : 'Save Changes' }}
            </AppButton>

            <AppButton to="/links" variant="secondary" class="w-full sm:w-auto">
              <template #icon>
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                </svg>
              </template>
              Back to links
            </AppButton>
            <AppButton :to="`/links/${link!.id}/stats`" variant="secondary" class="w-full sm:ml-auto sm:w-auto">
              <template #icon>
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                </svg>
              </template>
              View stats
            </AppButton>
          </div>
        </AppCard>
      </form>

      <div class="mt-6 w-full flex-shrink-0 md:mt-0 md:w-80 lg:w-96">
        <p class="mb-2 text-sm font-medium text-ui-secondary">Preview</p>

        <OgPreviewCard
          :title="cardTitle"
          :description="cardDescription"
          :imageUrl="cardImageUrl"
          :showDescriptionPlaceholder="false"
        />
        <p v-if="!form.ogEnabled" class="mt-2 text-xs text-ui-secondary">Preview from destination website</p>
        <p v-if="uploadLoading" class="mt-2 text-center text-xs text-ui-secondary">Uploading image…</p>
      </div>
    </div>


  </div>
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { copyToClipboard } from '@/utils/clipboard';
import { useRoute } from 'vue-router';
import {
  fetchDestinationOgPreview,
  getLink,
  updateLink,
  uploadImage,
  type DestinationOgPreview,
  type Link,
} from '@/api/client';
import OgPreviewCard from '@/components/OgPreviewCard.vue';
import AppButton from '@/components/ui/AppButton.vue';
import AppCard from '@/components/ui/AppCard.vue';
import { config } from '@/config';

const SLUG_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

const DEFAULT_OG_IMAGE = computed(() => `${config.baseUrl}/dashboard/og-default.svg`);
const PREVIEW_UNAVAILABLE_DESC = 'Preview unavailable';

const baseUrl = config.baseUrl;
const baseUrlShort = baseUrl.replace(/^https?:\/\//, '');

const route = useRoute();
const linkId = Number(route.params.id);

const link = ref<Link | null>(null);
const loading = ref(true);
const loadError = ref('');
const saving = ref(false);
const error = ref('');
const slugError = ref('');
const saved = ref(false);
const uploadLoading = ref(false);
const uploadError = ref('');
const uploadSuccess = ref(false);
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
  customSlug: '',
});

const slugValid = computed(() => {
  const s = form.value.customSlug.trim();
  return s.length > 0 && SLUG_PATTERN.test(s);
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
const previewImageUrl = computed(() => localFilePreview.value || form.value.ogImage.trim() || DEFAULT_OG_IMAGE.value);
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
const debugOgUrl = computed(() => {
  const short = link.value?.shortUrl;
  if (!short) return '';
  try {
    const u = new URL(short);
    u.searchParams.set('og', '1');
    return u.toString();
  } catch {
    return `${short}?og=1`;
  }
});

onMounted(async () => {
  try {
    link.value = await getLink(linkId);
    form.value = {
      url: link.value.url,
      ogEnabled: link.value.ogEnabled ?? false,
      ogTitle: link.value.ogTitle ?? '',
      ogDesc: link.value.ogDesc ?? '',
      ogImage: link.value.ogImage ?? '',
      customSlug: link.value.customSlug ?? '',
    };
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
  slugError.value = '';
  saved.value = false;

  const customSlug = form.value.customSlug.trim();
  if (customSlug && !SLUG_PATTERN.test(customSlug)) {
    slugError.value = 'Only letters, numbers, hyphens, underscores (1–64 chars)';
    return;
  }

  saving.value = true;
  try {
    const updated = await updateLink(linkId, {
      url: form.value.url,
      ogEnabled: form.value.ogEnabled,
      ogTitle: form.value.ogTitle || null,
      ogDesc: form.value.ogDesc || null,
      ogImage: form.value.ogImage || null,
      customSlug: customSlug || null, // empty string → null (clear slug)
    });
    link.value = updated;
    form.value.customSlug = updated.customSlug ?? '';
    saved.value = true;
    setTimeout(() => (saved.value = false), 2000);
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg === 'Slug already taken') {
      slugError.value = 'This slug is already taken. Please choose another.';
    } else {
      error.value = msg;
    }
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
  uploadSuccess.value = false;
  uploadLoading.value = true;
  try {
    const url = await uploadImage(linkId, file);
    form.value.ogImage = url;
    uploadSuccess.value = true;
    setTimeout(() => {
      uploadSuccess.value = false;
    }, 2500);
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
