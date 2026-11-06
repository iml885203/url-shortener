<template>
  <div class="space-y-5">
    <h1 class="tool-heading text-xl font-semibold text-ui-ink">Links</h1>

    <AppCard variant="compact" class="space-y-2">
      <label for="link-search" class="text-xs font-medium uppercase tracking-wide text-ui-secondary">Search</label>
      <input
        id="link-search"
        v-model="searchInput"
        type="search"
        class="app-input"
        placeholder="Search target URL, OG title/description, or ID..."
      />
    </AppCard>

    <AppCard v-if="loading" variant="compact" class="py-16 text-center text-ui-secondary">Loading…</AppCard>
    <AppCard v-else-if="error" variant="compact" class="py-16 text-center text-ui-danger">{{ error }}</AppCard>
    <AppCard v-else-if="links.length === 0" variant="compact" class="py-16 text-center text-ui-secondary">
      {{ searchQuery ? 'No matching links.' : 'No links yet.' }}
      <RouterLink v-if="!searchQuery" to="/links/new" class="text-ui-focus transition-colors duration-200 hover:text-ui-action-hover">Create one.</RouterLink>
    </AppCard>

    <!-- Mobile -->
    <div v-else class="flex flex-col gap-3 sm:hidden">
      <AppCard v-for="link in links" :key="link.id" variant="compact" class="space-y-3">
        <div class="flex items-start gap-3">
          <img v-if="link.ogImage" :src="link.ogImage" alt="" class="h-10 w-10 flex-shrink-0 rounded-md object-cover" />
          <div v-else class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md border border-ui-control-edge bg-ui-canvas text-ui-secondary">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 13.5l3-3m-6.75 7.5l-1.5 1.5a3.182 3.182 0 104.5 4.5l3-3a3.182 3.182 0 00-4.5-4.5l-1.5 1.5m9-9l1.5-1.5a3.182 3.182 0 10-4.5-4.5l-3 3a3.182 3.182 0 104.5 4.5l1.5-1.5" />
            </svg>
          </div>

          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-ui-ink">{{ link.ogTitle || link.url }}</p>
            <p v-if="link.ogTitle" class="mt-0.5 truncate text-xs text-ui-secondary">{{ link.url }}</p>
          </div>

          <div class="text-right">
            <p class="text-sm font-semibold text-ui-ink">{{ link.clickCount ?? 0 }}</p>
            <p class="text-xs text-ui-secondary">clicks</p>
          </div>
        </div>

        <div class="space-y-2">
          <AppCard variant="compact" class="bg-ui-canvas px-3 py-2">
            <div class="mb-1 text-[11px] uppercase tracking-wide text-ui-secondary">Short URL</div>
            <div class="flex items-center gap-2">
              <a :href="link.shortUrl" target="_blank" class="tool-link min-w-0 flex-1 truncate font-mono text-xs">{{ link.shortUrl }}</a>
              <AppButton variant="ghost" class="h-9 w-9 px-0" :aria-label="`Share short URL for link ${link.id}`" @click="shareUrl(link.shortUrl, link.ogTitle)">
                <template #icon>
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15m.75-3-3-3m0 0-3 3m3-3V15" />
                  </svg>
                </template>
              </AppButton>
            </div>
          </AppCard>

          <AppCard variant="compact" class="bg-ui-canvas px-3 py-2">
            <div class="mb-1 text-[11px] uppercase tracking-wide text-ui-secondary">Long URL</div>
            <div class="flex items-center gap-2">
              <a :href="link.longUrl" target="_blank" class="tool-link min-w-0 flex-1 truncate font-mono text-xs">{{ link.longUrl }}</a>
              <AppButton variant="ghost" class="h-9 w-9 px-0" :aria-label="`Share long URL for link ${link.id}`" @click="shareUrl(link.longUrl, link.ogTitle)">
                <template #icon>
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15m.75-3-3-3m0 0-3 3m3-3V15" />
                  </svg>
                </template>
              </AppButton>
            </div>
          </AppCard>

          <AppCard v-if="link.customUrl" variant="compact" class="border border-ui-control-edge bg-ui-canvas px-3 py-2">
            <div class="mb-1 text-[11px] uppercase tracking-wide text-ui-focus">Custom URL</div>
            <div class="flex items-center gap-2">
              <a :href="link.customUrl" target="_blank" class="tool-link min-w-0 flex-1 truncate font-mono text-xs">{{ link.customUrl }}</a>
              <AppButton variant="ghost" class="h-9 w-9 px-0" :aria-label="`Copy custom URL for link ${link.id}`" @click="shareUrl(link.customUrl!, link.ogTitle)">
                <template #icon>
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15m.75-3-3-3m0 0-3 3m3-3V15" />
                  </svg>
                </template>
              </AppButton>
            </div>
          </AppCard>
        </div>

        <div class="grid grid-cols-4 gap-1.5 pt-1">
          <AppButton type="button" variant="secondary" class="h-8 px-0 text-xs" @click="openQr(link)">QR</AppButton>
          <AppButton :to="`/links/${link.id}/stats`" variant="secondary" class="h-8 px-0 text-xs">Stats</AppButton>
          <AppButton :to="`/links/${link.id}/edit`" variant="secondary" class="h-8 px-0 text-xs">Edit</AppButton>
          <AppButton type="button" variant="danger" class="h-8 px-0 text-xs" @click="promptDelete(link)">Delete</AppButton>
        </div>
      </AppCard>
    </div>

    <!-- Desktop -->
    <AppCard v-if="links.length > 0" variant="compact" class="hidden divide-y divide-ui-edge p-0 sm:block">
      <div v-for="link in links" :key="link.id" class="flex items-start gap-4 p-4">
        <img v-if="link.ogImage" :src="link.ogImage" alt="" class="h-12 w-12 flex-shrink-0 rounded-md object-cover" />
        <div v-else class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md border border-ui-control-edge bg-ui-canvas text-ui-secondary">
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 13.5l3-3m-6.75 7.5l-1.5 1.5a3.182 3.182 0 104.5 4.5l3-3a3.182 3.182 0 00-4.5-4.5l-1.5 1.5m9-9l1.5-1.5a3.182 3.182 0 10-4.5-4.5l-3 3a3.182 3.182 0 104.5 4.5l1.5-1.5" />
          </svg>
        </div>

        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-ui-ink">{{ link.ogTitle || link.url }}</p>
          <p v-if="link.ogTitle" class="mt-0.5 truncate text-xs text-ui-secondary">{{ link.url }}</p>

          <div class="mt-2 flex flex-wrap items-center gap-2">
            <a :href="link.shortUrl" target="_blank" class="tool-link font-mono text-xs">{{ link.shortUrl }}</a>
            <AppButton variant="ghost" class="h-9 w-9 px-0" :aria-label="`Copy short URL for link ${link.id}`" @click="shareUrl(link.shortUrl, link.ogTitle)">
              <template #icon>
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                  <rect x="9" y="9" width="13" height="13" rx="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </template>
            </AppButton>

            <span class="text-ui-muted">|</span>

            <a :href="link.longUrl" target="_blank" :title="link.longUrl" class="tool-link max-w-[240px] truncate font-mono text-xs">
              {{ link.longUrl }}
            </a>
            <AppButton variant="ghost" class="h-9 w-9 px-0" :aria-label="`Copy long URL for link ${link.id}`" @click="shareUrl(link.longUrl, link.ogTitle)">
              <template #icon>
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                  <rect x="9" y="9" width="13" height="13" rx="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </template>
            </AppButton>

          </div>

          <!-- Custom slug — separate row to avoid overflow -->
          <div v-if="link.customUrl" class="mt-1 flex items-center gap-1.5">
            <span class="rounded bg-ui-hover px-1.5 py-0.5 text-[11px] font-medium text-ui-action-hover">Custom</span>
            <a :href="link.customUrl" target="_blank" :title="link.customUrl" class="tool-link font-mono text-xs text-ui-action-hover">
              {{ link.customUrl }}
            </a>
            <AppButton variant="ghost" class="h-7 w-7 px-0" :aria-label="`Copy custom URL for link ${link.id}`" @click="shareUrl(link.customUrl!, link.ogTitle)">
              <template #icon>
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                  <rect x="9" y="9" width="13" height="13" rx="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </template>
            </AppButton>
          </div>
        </div>

        <div class="text-right">
          <p class="text-sm font-semibold text-ui-ink">{{ link.clickCount ?? 0 }}</p>
          <p class="text-xs text-ui-secondary">clicks</p>
        </div>

        <div class="grid grid-cols-2 gap-1.5">
          <AppButton type="button" variant="secondary" class="h-8 px-2.5 text-xs" @click="openQr(link)">QR</AppButton>
          <AppButton :to="`/links/${link.id}/stats`" variant="secondary" class="h-8 px-2.5 text-xs">Stats</AppButton>
          <AppButton :to="`/links/${link.id}/edit`" variant="secondary" class="h-8 px-2.5 text-xs">Edit</AppButton>
          <AppButton type="button" variant="danger" class="h-8 px-2.5 text-xs" @click="promptDelete(link)">Delete</AppButton>
        </div>
      </div>
    </AppCard>

    <AppCard v-if="!loading && !error && total > 0" variant="compact" class="flex items-center justify-between">
      <p class="text-xs text-ui-secondary">Page {{ page }} / {{ totalPages }} · {{ total }} total</p>
      <div class="flex items-center gap-2">
        <AppButton type="button" variant="secondary" class="h-8 px-2.5 text-xs" :disabled="page <= 1 || loading" @click="goToPage(page - 1)">Prev</AppButton>
        <AppButton type="button" variant="secondary" class="h-8 px-2.5 text-xs" :disabled="page >= totalPages || loading" @click="goToPage(page + 1)">Next</AppButton>
      </div>
    </AppCard>

    <AppDialog v-model:visible="deleteDialogVisible" title="Delete this link?" :busy="deleteLoading">
          <p class="mt-1 text-sm text-ui-secondary">This action cannot be undone.</p>

          <AppCard variant="compact" class="mt-4 bg-ui-canvas px-3 py-2">
            <p class="text-xs uppercase tracking-wide text-ui-secondary">Target URL</p>
            <p class="mt-1 break-all text-sm text-ui-ink">{{ deleteTarget?.url }}</p>
          </AppCard>

          <div class="mt-5 flex gap-3">
            <AppButton type="button" variant="secondary" class="flex-1" @click="deleteTarget = null">Cancel</AppButton>
            <AppButton type="button" :disabled="deleteLoading" variant="danger" class="flex-1" @click="confirmDelete">
              {{ deleteLoading ? 'Deleting…' : 'Delete' }}
            </AppButton>
          </div>
    </AppDialog>

    <AppDialog v-model:visible="qrDialogVisible" title="QR Code">
      <div v-if="qrModal" class="space-y-4">
          <div class="flex gap-1 rounded-md bg-ui-hover p-1">
            <button
              class="flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors"
              :class="qrModal.activeType === 'short' ? 'bg-ui-control-edge text-ui-ink' : 'text-ui-secondary hover:text-ui-ink'"
              @click="switchQrType('short')"
            >Short</button>
            <button
              class="flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors"
              :class="qrModal.activeType === 'long' ? 'bg-ui-control-edge text-ui-ink' : 'text-ui-secondary hover:text-ui-ink'"
              @click="switchQrType('long')"
            >Long</button>
          </div>

          <p class="text-center font-mono text-xs text-ui-secondary select-all">{{ qrModal.activeType === 'short' ? qrModal.share.shortUrl : qrModal.share.longUrl }}</p>

          <div class="overflow-hidden rounded-md border border-ui-edge bg-white p-3">
            <div v-if="qrModal.loading" role="status" aria-label="Loading QR code" class="mx-auto h-64 w-full max-w-64 animate-pulse bg-ui-hover"></div>
            <img v-else :src="qrModal.imageUrl" alt="QR code" class="mx-auto block h-64 w-64" />
          </div>

          <div class="grid grid-cols-2 gap-2">
            <AppButton type="button" variant="secondary" class="w-full" :disabled="qrModal.loading" @click="downloadQr">Download</AppButton>
            <AppButton type="button" variant="secondary" class="w-full" :disabled="qrModal.loading" @click="shareQrImage">Share</AppButton>
          </div>
          <AppButton type="button" variant="ghost" class="w-full" @click="closeQrModal">Close</AppButton>
      </div>
    </AppDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject, watch, onBeforeUnmount } from 'vue';
import { copyToClipboard } from '@/utils/clipboard';
import { listLinks, deleteLink, getLinkShare, getLinkQrBlob, type Link, type LinkSharePayload } from '@/api/client';
import AppButton from '@/components/ui/AppButton.vue';
import AppCard from '@/components/ui/AppCard.vue';
import AppDialog from '@/components/ui/AppDialog.vue';

interface QrModalState {
  linkId: number;
  activeType: 'short' | 'long';
  imageUrl: string;
  blob: Blob;
  share: LinkSharePayload;
  loading: boolean;
}

const links = ref<Link[]>([]);
const loading = ref(true);
const error = ref('');
const deleteTarget = ref<Link | null>(null);
const deleteLoading = ref(false);
const searchInput = ref('');
const searchQuery = ref('');
const page = ref(1);
const pageSize = 20;
const total = ref(0);
const totalPages = ref(1);
const qrModal = ref<QrModalState | null>(null);
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

const deleteDialogVisible = computed({ get: () => !!deleteTarget.value, set: value => { if (!value) deleteTarget.value = null; } });
const qrDialogVisible = computed({ get: () => !!qrModal.value, set: value => { if (!value) closeQrModal(); } });

const showCopyToast = inject<() => void>('showCopyToast', () => {});

onMounted(load);

watch(searchInput, (value) => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    searchQuery.value = value.trim();
    page.value = 1;
    void load();
  }, 400);
});

onBeforeUnmount(() => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  closeQrModal();
});

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const result = await listLinks({
      q: searchQuery.value,
      page: page.value,
      pageSize,
    });
    links.value = result.items;
    total.value = result.total;
    totalPages.value = result.totalPages;
    if (page.value > result.totalPages) {
      page.value = result.totalPages;
      return await load();
    }
  } catch (e: unknown) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}

function goToPage(nextPage: number) {
  if (nextPage < 1 || nextPage > totalPages.value || nextPage === page.value) return;
  page.value = nextPage;
  void load();
}

function promptDelete(link: Link) {
  deleteTarget.value = link;
}

async function confirmDelete() {
  if (!deleteTarget.value) return;
  deleteLoading.value = true;
  try {
    await deleteLink(deleteTarget.value.id);
    deleteTarget.value = null;
    await load();
  } catch (e: unknown) {
    alert((e as Error).message);
  } finally {
    deleteLoading.value = false;
  }
}

function isMobile(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

async function shareUrl(url: string, title?: string | null) {
  try {
    if (isMobile() && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      await navigator.share({ title: title || 'Shared link', url });
      return;
    }
    await copyToClipboard(url);
    showCopyToast();
  } catch (e: unknown) {
    if ((e as Error).name === 'AbortError') return;
    alert((e as Error).message);
  }
}

async function openQr(link: Link) {
  try {
    const [share, blob] = await Promise.all([getLinkShare(link.id), getLinkQrBlob(link.id, 'short')]);
    const imageUrl = URL.createObjectURL(blob);
    closeQrModal();
    qrModal.value = {
      linkId: link.id,
      activeType: 'short',
      imageUrl,
      blob,
      share,
      loading: false,
    };
  } catch (e: unknown) {
    alert((e as Error).message);
  }
}

async function switchQrType(type: 'short' | 'long') {
  if (!qrModal.value || qrModal.value.activeType === type) return;
  qrModal.value.activeType = type;
  qrModal.value.loading = true;
  try {
    const blob = await getLinkQrBlob(qrModal.value.linkId, type);
    if (qrModal.value.imageUrl) URL.revokeObjectURL(qrModal.value.imageUrl);
    qrModal.value.imageUrl = URL.createObjectURL(blob);
    qrModal.value.blob = blob;
  } catch (e: unknown) {
    alert((e as Error).message);
  } finally {
    if (qrModal.value) qrModal.value.loading = false;
  }
}

function closeQrModal() {
  if (qrModal.value) {
    URL.revokeObjectURL(qrModal.value.imageUrl);
  }
  qrModal.value = null;
}

function downloadQr() {
  if (!qrModal.value) return;
  const a = document.createElement('a');
  a.href = qrModal.value.imageUrl;
  a.download = `link-${qrModal.value.linkId}-qr-${qrModal.value.activeType}.png`;
  a.click();
}

async function shareQrImage() {
  if (!qrModal.value) return;
  const activeUrl = qrModal.value.activeType === 'short' ? qrModal.value.share.shortUrl : qrModal.value.share.longUrl;

  try {
    const file = new File([qrModal.value.blob], `link-${qrModal.value.linkId}-qr-${qrModal.value.activeType}.png`, {
      type: 'image/png',
    });

    const canShareFiles =
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] });

    if (canShareFiles) {
      await navigator.share({ files: [file] });
      return;
    }

    window.open(qrModal.value.imageUrl, '_blank', 'noopener,noreferrer');
    await copyToClipboard(activeUrl);
    showCopyToast();
  } catch (e: unknown) {
    if ((e as Error).name === 'AbortError') return;
    alert((e as Error).message);
  }
}
</script>
