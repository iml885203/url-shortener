<template>
  <div class="mx-auto max-w-4xl space-y-5">
    <h1 class="tool-heading text-xl font-semibold text-ui-ink">New Link</h1>

    <div class="md:flex md:items-start md:gap-6">
      <form @submit.prevent="submit" class="flex-1 min-w-0">
        <AppCard class="space-y-5">
          <div>
            <label for="link-url" class="mb-1 block text-sm font-medium text-ui-ink">Target URL <span class="text-ui-danger">*</span></label>
            <input
              id="link-url" v-model="form.url"
              type="url"
              required
              class="app-input"
              placeholder="https://example.com/article"
            />
          </div>

          <div>
            <label for="link-customSlug" class="mb-1 block text-sm font-medium text-ui-ink">Custom Slug <span class="text-ui-secondary font-normal">(optional)</span></label>
            <div class="flex items-center">
              <span class="flex min-h-11 items-center rounded-l-md border border-r-0 border-ui-control-edge bg-ui-raised px-3 text-xs text-ui-secondary select-none">{{ baseUrlShort }}/</span>
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
              <input
                id="link-ogTitle" v-model="form.ogTitle"
                type="text"
                class="app-input"
                placeholder="Article title for social preview"
              />
            </div>

            <div>
              <label for="link-ogDesc" class="mb-1 block text-sm font-medium text-ui-ink">OG Description</label>
              <textarea
                id="link-ogDesc" v-model="form.ogDesc"
                rows="2"
                class="app-input"
                placeholder="Description shown in social previews"
              />
            </div>

            <div>
              <label for="link-ogImage" class="mb-1 block text-sm font-medium text-ui-ink">OG Image URL</label>
              <input
                id="link-ogImage" v-model="form.ogImage"
                type="url"
                class="app-input"
                placeholder="https://… (or upload after creating)"
              />
            </div>

            <p class="text-xs text-ui-secondary">To upload an OG image, create the link first, then edit it to upload.</p>
          </template>

          <p v-if="error" role="alert" class="text-sm text-ui-danger">{{ error }}</p>

          <div class="flex flex-col gap-3 pt-1 sm:flex-row">
            <AppButton type="submit" :disabled="loading" variant="primary" class="w-full sm:w-auto">
              <template #icon>
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </template>
              {{ loading ? 'Creating…' : 'Create Link' }}
            </AppButton>
            <AppButton to="/links" variant="secondary" class="w-full sm:w-auto">
              <template #icon>
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </template>
              Cancel
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
      </div>
    </div>

    <AppDialog v-model:visible="createdDialogVisible" title="Link created">
      <div v-if="createdLink">
          <div class="text-center">
            <svg
              class="mx-auto mb-2 h-8 w-8 text-ui-focus"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9"></circle>
              <path stroke-linecap="round" stroke-linejoin="round" d="m8.5 12.5 2.2 2.2 4.8-5.1"></path>
            </svg>
            <p class="mt-1 break-all text-sm text-ui-secondary">{{ createdLink.url }}</p>
          </div>

          <div class="mt-5 space-y-4">
            <div v-if="createdLink.customUrl">
              <p class="mb-1 text-xs font-medium uppercase tracking-wide text-ui-secondary">Custom URL</p>
              <AppCard variant="compact" class="bg-ui-canvas px-3 py-2 border border-ui-control-edge">
                <div class="flex items-center gap-2">
                  <a :href="createdLink.customUrl" target="_blank" class="tool-link min-w-0 flex-1 truncate font-mono text-sm">{{ createdLink.customUrl }}</a>
                  <AppButton
                    type="button"
                    variant="ghost"
                    aria-label="Copy custom URL"
                    class="h-9 w-9 px-0"
                    @click="copyUrl(createdLink.customUrl!)"
                  >
                    <template #icon>
                      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                        <rect x="9" y="9" width="13" height="13" rx="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    </template>
                  </AppButton>
                </div>
              </AppCard>
            </div>

            <div>
              <p class="mb-1 text-xs font-medium uppercase tracking-wide text-ui-secondary">Short URL</p>
              <AppCard variant="compact" class="bg-ui-canvas px-3 py-2">
                <div class="flex items-center gap-2">
                  <a :href="createdLink.shortUrl" target="_blank" class="tool-link min-w-0 flex-1 truncate font-mono text-sm">{{ createdLink.shortUrl }}</a>
                  <AppButton
                    type="button"
                    variant="ghost"
                    aria-label="Copy short URL"
                    class="h-9 w-9 px-0"
                    @click="copyUrl(createdLink.shortUrl)"
                  >
                    <template #icon>
                      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                        <rect x="9" y="9" width="13" height="13" rx="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    </template>
                  </AppButton>
                </div>
              </AppCard>
            </div>

            <div>
              <p class="mb-1 text-xs font-medium uppercase tracking-wide text-ui-secondary">Long URL</p>
              <AppCard variant="compact" class="bg-ui-canvas px-3 py-2">
                <div class="flex items-center gap-2">
                  <a
                    :href="createdLink.longUrl"
                    target="_blank"
                    :title="createdLink.longUrl"
                    class="min-w-0 flex-1 truncate font-mono text-sm text-ui-secondary transition-colors duration-200 hover:text-ui-ink"
                  >
                    {{ createdLink.longUrl }}
                  </a>
                  <AppButton
                    type="button"
                    variant="ghost"
                    aria-label="Copy long URL"
                    class="h-9 w-9 px-0"
                    @click="copyUrl(createdLink.longUrl)"
                  >
                    <template #icon>
                      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                        <rect x="9" y="9" width="13" height="13" rx="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    </template>
                  </AppButton>
                </div>
              </AppCard>
            </div>
          </div>

          <div class="mt-5 flex flex-col gap-3 pt-1 sm:flex-row">
            <AppButton type="button" @click="createAnother" variant="primary" class="flex-1">
              <template #icon>
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </template>
              Create Another
            </AppButton>
            <AppButton to="/links" variant="secondary" class="flex-1">
              <template #icon>
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                </svg>
              </template>
              Back to List
            </AppButton>
          </div>
      </div>
    </AppDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, ref, watch } from 'vue';
import { copyToClipboard } from '@/utils/clipboard';
import { createLink, fetchDestinationOgPreview, type DestinationOgPreview, type Link } from '@/api/client';
import OgPreviewCard from '@/components/OgPreviewCard.vue';
import AppButton from '@/components/ui/AppButton.vue';
import AppCard from '@/components/ui/AppCard.vue';
import AppDialog from '@/components/ui/AppDialog.vue';
import { config } from '@/config';

const SLUG_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

const DEFAULT_OG_IMAGE = computed(() => `${config.baseUrl}/dashboard/og-default.svg`);
const PREVIEW_UNAVAILABLE_DESC = 'Preview unavailable';

const baseUrl = config.baseUrl;
const baseUrlShort = baseUrl.replace(/^https?:\/\//, '');

const loading = ref(false);
const error = ref('');
const slugError = ref('');
const createdLink = ref<Link | null>(null);
const createdDialogVisible = computed({ get: () => !!createdLink.value, set: value => { if (!value) createAnother(); } });
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
const previewImageUrl = computed(() => form.value.ogImage.trim() || DEFAULT_OG_IMAGE.value);
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
  slugError.value = '';

  const customSlug = form.value.customSlug.trim();
  if (customSlug && !SLUG_PATTERN.test(customSlug)) {
    slugError.value = 'Only letters, numbers, hyphens, underscores (1–64 chars)';
    return;
  }

  loading.value = true;
  try {
    const link = await createLink({
      url: form.value.url,
      ogEnabled: form.value.ogEnabled,
      ogTitle: form.value.ogTitle || undefined,
      ogDesc: form.value.ogDesc || undefined,
      ogImage: form.value.ogImage || undefined,
      customSlug: customSlug || undefined,
    });
    createdLink.value = link;
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg === 'Slug already taken') {
      slugError.value = 'This slug is already taken. Please choose another.';
    } else {
      error.value = msg;
    }
  } finally {
    loading.value = false;
  }
}

function createAnother() {
  createdLink.value = null;
  form.value = { url: '', ogEnabled: false, ogTitle: '', ogDesc: '', ogImage: '', customSlug: '' };
  error.value = '';
  slugError.value = '';
}

function copyUrl(text: string) {
  copyToClipboard(text).then(() => showCopyToast());
}
</script>
