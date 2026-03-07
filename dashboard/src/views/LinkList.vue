<template>
  <div>
    <div class="flex items-center justify-between mb-6 gap-3">
      <h1 class="text-xl font-semibold text-white">Links</h1>
      <RouterLink
        to="/links/new"
        class="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors whitespace-nowrap"
      >
        + New Link
      </RouterLink>
    </div>

    <div v-if="loading" class="text-center py-16 text-gray-500">Loading…</div>
    <div v-else-if="error" class="text-center py-16 text-red-400">{{ error }}</div>
    <div v-else-if="links.length === 0" class="text-center py-16 text-gray-500">
      No links yet.
      <RouterLink to="/links/new" class="text-indigo-400 hover:underline">Create one.</RouterLink>
    </div>

    <!-- Mobile: card list -->
    <div v-else class="flex flex-col gap-3 sm:hidden">
      <div
        v-for="link in links"
        :key="link.id"
        class="bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-3"
      >
        <div class="flex items-start gap-3">
          <img
            v-if="link.ogImage"
            :src="link.ogImage"
            alt=""
            class="w-10 h-10 rounded object-cover flex-shrink-0"
          />
          <div v-else class="w-10 h-10 rounded bg-gray-700 flex items-center justify-center flex-shrink-0 text-gray-500 text-lg">
            🔗
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-100 truncate">{{ link.ogTitle || link.url }}</p>
            <p class="text-xs text-gray-500 truncate mt-0.5">{{ link.url }}</p>
          </div>
          <div class="text-right flex-shrink-0">
            <p class="text-sm font-semibold text-gray-200">{{ link.clickCount ?? 0 }}</p>
            <p class="text-xs text-gray-500">clicks</p>
          </div>
        </div>

        <!-- Short URL -->
        <div class="flex items-center gap-2 bg-gray-700/50 rounded-md px-3 py-1.5">
          <span class="text-xs text-gray-400 flex-shrink-0">Short:</span>
          <a :href="link.shortUrl" target="_blank" class="text-xs text-indigo-400 hover:underline font-mono flex-1 truncate">{{ link.shortUrl }}</a>
          <button
            type="button"
            @click="copyUrl(link.shortUrl)"
            class="text-gray-500 hover:text-gray-200 transition-colors flex-shrink-0 p-1"
            title="Copy short URL"
          >📋</button>
        </div>

        <!-- Long URL -->
        <div class="flex items-center gap-2 bg-gray-700/50 rounded-md px-3 py-1.5">
          <span class="text-xs text-gray-400 flex-shrink-0">Long:</span>
          <a :href="link.longUrl" target="_blank" class="text-xs text-gray-400 hover:underline font-mono flex-1 truncate">{{ link.longUrl }}</a>
          <button
            type="button"
            @click="copyUrl(link.longUrl)"
            class="text-gray-500 hover:text-gray-200 transition-colors flex-shrink-0 p-1"
            title="Copy long URL"
          >📋</button>
        </div>

        <!-- Actions -->
        <div class="flex gap-2 pt-1">
          <RouterLink :to="`/links/${link.id}/stats`" class="flex-1 text-center text-xs text-gray-400 hover:text-white px-2 py-1.5 rounded bg-gray-700 hover:bg-gray-600 transition-colors">Stats</RouterLink>
          <RouterLink :to="`/links/${link.id}/edit`" class="flex-1 text-center text-xs text-gray-400 hover:text-white px-2 py-1.5 rounded bg-gray-700 hover:bg-gray-600 transition-colors">Edit</RouterLink>
          <button @click="remove(link.id)" class="flex-1 text-xs text-red-400 hover:text-red-300 px-2 py-1.5 rounded bg-gray-700 hover:bg-red-900/30 transition-colors">Delete</button>
        </div>
      </div>
    </div>

    <!-- Desktop: row list -->
    <div v-if="links.length > 0" class="hidden sm:block bg-gray-800 rounded-xl border border-gray-700 divide-y divide-gray-700 shadow-sm">
      <div v-for="link in links" :key="link.id" class="p-4 flex items-start gap-4">
        <!-- OG image thumbnail -->
        <img
          v-if="link.ogImage"
          :src="link.ogImage"
          alt=""
          class="w-12 h-12 rounded object-cover flex-shrink-0"
        />
        <div v-else class="w-12 h-12 rounded bg-gray-700 flex items-center justify-center flex-shrink-0 text-gray-500 text-xl">
          🔗
        </div>

        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-100 truncate">{{ link.ogTitle || link.url }}</p>
          <p class="text-xs text-gray-500 truncate mt-0.5">{{ link.url }}</p>
          <div class="flex items-center gap-2 mt-2 flex-wrap">
            <a :href="link.shortUrl" target="_blank" class="text-xs text-indigo-400 hover:underline font-mono">{{ link.shortUrl }}</a>
            <button
              type="button"
              @click="copyUrl(link.shortUrl)"
              class="text-gray-600 hover:text-gray-300 transition-colors text-xs p-0.5"
              title="Copy short URL"
            >📋</button>
            <span class="text-gray-600">|</span>
            <a :href="link.longUrl" target="_blank" class="text-xs text-gray-500 hover:underline font-mono truncate max-w-[200px]" :title="link.longUrl">{{ link.longUrl }}</a>
            <button
              type="button"
              @click="copyUrl(link.longUrl)"
              class="text-gray-600 hover:text-gray-300 transition-colors text-xs p-0.5"
              title="Copy long URL"
            >📋</button>
          </div>
        </div>

        <div class="text-right flex-shrink-0">
          <p class="text-sm font-semibold text-gray-200">{{ link.clickCount ?? 0 }}</p>
          <p class="text-xs text-gray-500">clicks</p>
        </div>

        <div class="flex flex-col gap-1 flex-shrink-0">
          <RouterLink :to="`/links/${link.id}/stats`" class="text-xs text-gray-500 hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-700 transition-colors">Stats</RouterLink>
          <RouterLink :to="`/links/${link.id}/edit`" class="text-xs text-gray-500 hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-700 transition-colors">Edit</RouterLink>
          <button @click="remove(link.id)" class="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-900/30 transition-colors">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, inject } from 'vue';
import { listLinks, deleteLink, type Link } from '@/api/client';

const links = ref<Link[]>([]);
const loading = ref(true);
const error = ref('');

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

async function remove(id: number) {
  if (!confirm('Delete this link?')) return;
  try {
    await deleteLink(id);
    links.value = links.value.filter((l) => l.id !== id);
  } catch (e: unknown) {
    alert((e as Error).message);
  }
}

function copyUrl(text: string) {
  navigator.clipboard.writeText(text).then(() => showCopyToast()).catch(() => {});
}
</script>
