<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between gap-3">
      <h1 class="tool-heading text-xl font-semibold text-slate-100">Links</h1>
      <AppButton to="/links/new" variant="primary">
        <template #icon>
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </template>
        New Link
      </AppButton>
    </div>

    <AppCard v-if="loading" variant="compact" class="py-16 text-center text-slate-400">Loading…</AppCard>
    <AppCard v-else-if="error" variant="compact" class="py-16 text-center text-red-400">{{ error }}</AppCard>
    <AppCard v-else-if="links.length === 0" variant="compact" class="py-16 text-center text-slate-400">
      No links yet.
      <RouterLink to="/links/new" class="text-blue-400 transition-colors duration-200 hover:text-blue-300">Create one.</RouterLink>
    </AppCard>

    <!-- Mobile -->
    <div v-else class="flex flex-col gap-3 sm:hidden">
      <AppCard v-for="link in links" :key="link.id" variant="compact" class="space-y-3">
        <div class="flex items-start gap-3">
          <img v-if="link.ogImage" :src="link.ogImage" alt="" class="h-10 w-10 flex-shrink-0 rounded-md object-cover" />
          <div v-else class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md border border-slate-700 bg-slate-950 text-slate-400">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 13.5l3-3m-6.75 7.5l-1.5 1.5a3.182 3.182 0 104.5 4.5l3-3a3.182 3.182 0 00-4.5-4.5l-1.5 1.5m9-9l1.5-1.5a3.182 3.182 0 10-4.5-4.5l-3 3a3.182 3.182 0 104.5 4.5l1.5-1.5" />
            </svg>
          </div>

          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-slate-100">{{ link.ogTitle || link.url }}</p>
            <p v-if="link.ogTitle" class="mt-0.5 truncate text-xs text-slate-400">{{ link.url }}</p>
          </div>

          <div class="text-right">
            <p class="text-sm font-semibold text-slate-100">{{ link.clickCount ?? 0 }}</p>
            <p class="text-xs text-slate-400">clicks</p>
          </div>
        </div>

        <div class="space-y-2">
          <AppCard variant="compact" class="bg-slate-950 px-3 py-2">
            <div class="mb-1 text-[11px] uppercase tracking-wide text-slate-400">Short URL</div>
            <div class="flex items-center gap-2">
              <a :href="link.shortUrl" target="_blank" class="tool-link min-w-0 flex-1 truncate font-mono text-xs">{{ link.shortUrl }}</a>
              <AppButton
                variant="ghost"
                class="h-9 w-9 px-0"
                :aria-label="`Copy short URL for link ${link.id}`"
                @click="copyUrl(link.shortUrl)"
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

          <AppCard variant="compact" class="bg-slate-950 px-3 py-2">
            <div class="mb-1 text-[11px] uppercase tracking-wide text-slate-400">Long URL</div>
            <div class="flex items-center gap-2">
              <a :href="link.longUrl" target="_blank" class="truncate font-mono text-xs text-slate-400 transition-colors duration-200 hover:text-slate-200">{{ link.longUrl }}</a>
              <AppButton
                variant="ghost"
                class="h-9 w-9 px-0"
                :aria-label="`Copy long URL for link ${link.id}`"
                @click="copyUrl(link.longUrl)"
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

        <div class="grid grid-cols-3 gap-2 pt-1">
          <AppButton :to="`/links/${link.id}/stats`" variant="secondary" class="px-0">
            <template #icon>
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
              </svg>
            </template>
            Stats
          </AppButton>
          <AppButton :to="`/links/${link.id}/edit`" variant="secondary" class="px-0">
            <template #icon>
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
              </svg>
            </template>
            Edit
          </AppButton>
          <AppButton type="button" variant="secondary" class="px-0" @click="promptDelete(link)">
            <template #icon>
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </template>
            Delete
          </AppButton>
        </div>
      </AppCard>
    </div>

    <!-- Desktop -->
    <AppCard v-if="links.length > 0" variant="compact" class="hidden divide-y divide-slate-800 p-0 sm:block">
      <div v-for="link in links" :key="link.id" class="flex items-start gap-4 p-4">
        <img v-if="link.ogImage" :src="link.ogImage" alt="" class="h-12 w-12 flex-shrink-0 rounded-md object-cover" />
        <div v-else class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md border border-slate-700 bg-slate-950 text-slate-400">
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 13.5l3-3m-6.75 7.5l-1.5 1.5a3.182 3.182 0 104.5 4.5l3-3a3.182 3.182 0 00-4.5-4.5l-1.5 1.5m9-9l1.5-1.5a3.182 3.182 0 10-4.5-4.5l-3 3a3.182 3.182 0 104.5 4.5l1.5-1.5" />
          </svg>
        </div>

        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-slate-100">{{ link.ogTitle || link.url }}</p>
          <p v-if="link.ogTitle" class="mt-0.5 truncate text-xs text-slate-400">{{ link.url }}</p>

          <div class="mt-2 flex flex-wrap items-center gap-2">
            <a :href="link.shortUrl" target="_blank" class="tool-link font-mono text-xs">{{ link.shortUrl }}</a>
            <AppButton
              variant="ghost"
              class="h-9 w-9 px-0"
              :aria-label="`Copy short URL for link ${link.id}`"
              @click="copyUrl(link.shortUrl)"
            >
              <template #icon>
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                  <rect x="9" y="9" width="13" height="13" rx="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </template>
            </AppButton>

            <span class="text-slate-600">|</span>

            <a
              :href="link.longUrl"
              target="_blank"
              :title="link.longUrl"
              class="max-w-[240px] truncate font-mono text-xs text-slate-400 transition-colors duration-200 hover:text-slate-200"
            >
              {{ link.longUrl }}
            </a>
            <AppButton
              variant="ghost"
              class="h-9 w-9 px-0"
              :aria-label="`Copy long URL for link ${link.id}`"
              @click="copyUrl(link.longUrl)"
            >
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
          <p class="text-sm font-semibold text-slate-100">{{ link.clickCount ?? 0 }}</p>
          <p class="text-xs text-slate-400">clicks</p>
        </div>

        <div class="flex items-center gap-1.5">
          <AppButton :to="`/links/${link.id}/stats`" variant="secondary" class="h-8 px-2.5 text-xs">
            <template #icon>
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
              </svg>
            </template>
            Stats
          </AppButton>
          <AppButton :to="`/links/${link.id}/edit`" variant="secondary" class="h-8 px-2.5 text-xs">
            <template #icon>
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
              </svg>
            </template>
            Edit
          </AppButton>
          <AppButton type="button" variant="secondary" class="h-8 px-2.5 text-xs" @click="promptDelete(link)">
            <template #icon>
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </template>
            Delete
          </AppButton>
        </div>
      </div>
    </AppCard>

    <Teleport to="body">
      <div
        v-if="deleteTarget"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
        @click.self="deleteTarget = null"
      >
        <AppCard variant="elevated" class="w-full max-w-sm">
          <h2 class="tool-heading text-base font-semibold text-slate-100">Delete this link?</h2>
          <p class="mt-1 text-sm text-slate-400">This action cannot be undone.</p>

          <AppCard variant="compact" class="mt-4 bg-slate-950 px-3 py-2">
            <p class="text-xs uppercase tracking-wide text-slate-400">Target URL</p>
            <p class="mt-1 break-all text-sm text-slate-200">{{ deleteTarget.url }}</p>
          </AppCard>

          <div class="mt-5 flex gap-3">
            <AppButton type="button" variant="secondary" class="flex-1" @click="deleteTarget = null">
              <template #icon>
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </template>
              Cancel
            </AppButton>
            <AppButton type="button" :disabled="deleteLoading" variant="danger" class="flex-1" @click="confirmDelete">
              <template #icon>
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </template>
              {{ deleteLoading ? 'Deleting…' : 'Delete' }}
            </AppButton>
          </div>
        </AppCard>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, inject } from 'vue';
import { copyToClipboard } from '@/utils/clipboard';
import { listLinks, deleteLink, type Link } from '@/api/client';
import AppButton from '@/components/ui/AppButton.vue';
import AppCard from '@/components/ui/AppCard.vue';

const links = ref<Link[]>([]);
const loading = ref(true);
const error = ref('');
const deleteTarget = ref<Link | null>(null);
const deleteLoading = ref(false);

const showCopyToast = inject<() => void>('showCopyToast', () => {});

onMounted(load);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    links.value = await listLinks();
  } catch (e: unknown) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}

function promptDelete(link: Link) {
  deleteTarget.value = link;
}

async function confirmDelete() {
  if (!deleteTarget.value) return;
  deleteLoading.value = true;
  try {
    await deleteLink(deleteTarget.value.id);
    links.value = links.value.filter((l) => l.id !== deleteTarget.value!.id);
    deleteTarget.value = null;
  } catch (e: unknown) {
    alert((e as Error).message);
  } finally {
    deleteLoading.value = false;
  }
}

function copyUrl(text: string) {
  copyToClipboard(text).then(() => showCopyToast());
}
</script>
