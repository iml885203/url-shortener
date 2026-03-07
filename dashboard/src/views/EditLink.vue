<template>
  <div class="max-w-4xl">
    <h1 class="text-xl font-semibold mb-6 text-white">Edit Link</h1>

    <div v-if="loading" class="text-center py-16 text-gray-500">Loading…</div>
    <div v-else-if="loadError" class="text-center py-16 text-red-400">{{ loadError }}</div>

    <div v-else class="md:flex md:gap-6 md:items-start">
      <!-- Form -->
      <form @submit.prevent="submit" class="flex-1 min-w-0 bg-gray-800 rounded-xl border border-gray-700 shadow-sm p-5 sm:p-6 space-y-5">
        <!-- Generated URLs display -->
        <div class="bg-gray-700/50 rounded-lg p-4 space-y-2 text-xs font-mono border border-gray-600">
          <div class="flex items-center gap-2">
            <span class="text-gray-400 w-14 flex-shrink-0">Short:</span>
            <a :href="link!.shortUrl" target="_blank" class="text-indigo-400 hover:underline flex-1 truncate">{{ link!.shortUrl }}</a>
            <button
              type="button"
              @click="copyUrl(link!.shortUrl)"
              class="text-gray-500 hover:text-gray-200 transition-colors ml-auto flex-shrink-0 p-1"
              title="Copy short URL"
            >📋</button>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-gray-400 w-14 flex-shrink-0">Long:</span>
            <a :href="link!.longUrl" target="_blank" class="text-gray-400 hover:underline truncate flex-1">{{ link!.longUrl }}</a>
            <button
              type="button"
              @click="copyUrl(link!.longUrl)"
              class="text-gray-500 hover:text-gray-200 transition-colors ml-auto flex-shrink-0 p-1"
              title="Copy long URL"
            >📋</button>
          </div>
        </div>

        <!-- Target URL -->
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Target URL <span class="text-red-400">*</span></label>
          <input
            v-model="form.url"
            type="url"
            required
            class="block w-full rounded-md bg-gray-700 border border-gray-600 text-white placeholder-gray-500 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <!-- OG Title -->
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">OG Title</label>
          <input
            v-model="form.ogTitle"
            type="text"
            class="block w-full rounded-md bg-gray-700 border border-gray-600 text-white placeholder-gray-500 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <!-- OG Description -->
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">OG Description</label>
          <textarea
            v-model="form.ogDesc"
            rows="2"
            class="block w-full rounded-md bg-gray-700 border border-gray-600 text-white placeholder-gray-500 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <!-- OG Image URL + upload -->
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">OG Image</label>
          <input
            v-model="form.ogImage"
            type="url"
            class="block w-full rounded-md bg-gray-700 border border-gray-600 text-white placeholder-gray-500 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-2"
            placeholder="https://…"
          />
          <!-- File upload -->
          <div class="mt-2">
            <label class="text-xs text-gray-400 font-medium">Upload image:</label>
            <input
              type="file"
              accept="image/*"
              @change="handleFileChange"
              class="block mt-1 text-xs text-gray-400 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-indigo-900/50 file:text-indigo-300 hover:file:bg-indigo-800/50"
            />
          </div>
          <p v-if="uploadError" class="text-xs text-red-400 mt-1">{{ uploadError }}</p>
          <p v-if="uploadLoading" class="text-xs text-gray-500 mt-1">Uploading…</p>
        </div>

        <p v-if="error" class="text-sm text-red-400">{{ error }}</p>
        <p v-if="saved" class="text-sm text-green-400">✓ Saved</p>

        <div class="flex flex-col sm:flex-row gap-3 pt-1">
          <button
            type="submit"
            :disabled="saving"
            class="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-5 py-2 rounded-md disabled:opacity-50 transition-colors"
          >
            {{ saving ? 'Saving…' : 'Save' }}
          </button>
          <RouterLink to="/links" class="w-full sm:w-auto text-center text-sm text-gray-500 hover:text-gray-300 px-4 py-2 transition-colors">← Back</RouterLink>
          <RouterLink :to="`/links/${link!.id}/stats`" class="w-full sm:w-auto text-center text-sm text-gray-500 hover:text-gray-300 px-4 py-2 sm:ml-auto transition-colors">Stats →</RouterLink>
        </div>
      </form>

      <!-- OG Preview Card -->
      <div class="w-full md:w-80 lg:w-96 flex-shrink-0 mt-6 md:mt-0">
        <p class="text-sm font-medium text-gray-400 mb-2">Preview</p>
        <OgPreviewCard
          :title="form.ogTitle"
          :description="form.ogDesc"
          :imageUrl="previewImageUrl"
        />
        <p v-if="uploadLoading" class="text-xs text-gray-500 mt-2 text-center">⏳ Uploading image…</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue';
import { useRoute } from 'vue-router';
import { listLinks, updateLink, uploadImage, type Link } from '@/api/client';
import OgPreviewCard from '@/components/OgPreviewCard.vue';

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

const showCopyToast = inject<() => void>('showCopyToast', () => {});

const form = ref({
  url: '',
  ogTitle: '',
  ogDesc: '',
  ogImage: '',
});

// Show local file preview immediately on select; fall back to saved URL
const previewImageUrl = computed(() => localFilePreview.value || form.value.ogImage || '');

onMounted(async () => {
  try {
    const links = await listLinks();
    link.value = links.find((l) => l.id === linkId) ?? null;
    if (link.value) {
      form.value = {
        url: link.value.url,
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

async function submit() {
  error.value = '';
  saved.value = false;
  saving.value = true;
  try {
    const updated = await updateLink(linkId, {
      url: form.value.url,
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

  // Show local preview immediately before upload completes
  if (localFilePreview.value) URL.revokeObjectURL(localFilePreview.value);
  localFilePreview.value = URL.createObjectURL(file);

  uploadError.value = '';
  uploadLoading.value = true;
  try {
    const url = await uploadImage(linkId, file);
    form.value.ogImage = url;
    // Switch to canonical URL and revoke blob
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
  navigator.clipboard.writeText(text).then(() => showCopyToast()).catch(() => {});
}
</script>
