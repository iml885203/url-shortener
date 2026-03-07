<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-xl font-semibold">Links</h1>
      <RouterLink
        to="/links/new"
        class="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-md"
      >
        + New Link
      </RouterLink>
    </div>

    <div v-if="loading" class="text-center py-16 text-gray-400">Loading…</div>
    <div v-else-if="error" class="text-center py-16 text-red-500">{{ error }}</div>
    <div v-else-if="links.length === 0" class="text-center py-16 text-gray-400">
      No links yet. <RouterLink to="/links/new" class="text-indigo-600 hover:underline">Create one.</RouterLink>
    </div>

    <div v-else class="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 shadow-sm">
      <div v-for="link in links" :key="link.id" class="p-4 flex items-start gap-4">
        <!-- OG image thumbnail -->
        <img
          v-if="link.ogImage"
          :src="link.ogImage"
          alt=""
          class="w-12 h-12 rounded object-cover flex-shrink-0"
        />
        <div v-else class="w-12 h-12 rounded bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-400 text-xl">
          🔗
        </div>

        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 truncate">{{ link.ogTitle || link.url }}</p>
          <p class="text-xs text-gray-500 truncate mt-0.5">{{ link.url }}</p>
          <div class="flex items-center gap-3 mt-2">
            <a :href="link.shortUrl" target="_blank" class="text-xs text-indigo-600 hover:underline font-mono">{{ link.shortUrl }}</a>
            <span class="text-gray-300">|</span>
            <a :href="link.longUrl" target="_blank" class="text-xs text-indigo-400 hover:underline font-mono truncate max-w-[200px]" :title="link.longUrl">{{ link.longUrl }}</a>
          </div>
        </div>

        <div class="text-right flex-shrink-0">
          <p class="text-sm font-semibold text-gray-700">{{ link.clickCount ?? 0 }}</p>
          <p class="text-xs text-gray-400">clicks</p>
        </div>

        <div class="flex flex-col gap-1 flex-shrink-0">
          <RouterLink :to="`/links/${link.id}/stats`" class="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100">Stats</RouterLink>
          <RouterLink :to="`/links/${link.id}/edit`" class="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100">Edit</RouterLink>
          <button @click="remove(link.id)" class="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { listLinks, deleteLink, type Link } from '@/api/client';

const links = ref<Link[]>([]);
const loading = ref(true);
const error = ref('');

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
</script>
