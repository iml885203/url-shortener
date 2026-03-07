<template>
  <div class="max-w-xl">
    <h1 class="text-xl font-semibold mb-6">New Link</h1>
    <form @submit.prevent="submit" class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
      <!-- Target URL -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Target URL <span class="text-red-500">*</span></label>
        <input
          v-model="form.url"
          type="url"
          required
          class="block w-full rounded-md border-gray-300 shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="https://example.com/article"
        />
      </div>

      <!-- OG Title -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">OG Title</label>
        <input
          v-model="form.ogTitle"
          type="text"
          class="block w-full rounded-md border-gray-300 shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Article title for social preview"
        />
      </div>

      <!-- OG Description -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">OG Description</label>
        <textarea
          v-model="form.ogDesc"
          rows="2"
          class="block w-full rounded-md border-gray-300 shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Description shown in social previews"
        />
      </div>

      <!-- OG Image URL -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">OG Image URL</label>
        <input
          v-model="form.ogImage"
          type="url"
          class="block w-full rounded-md border-gray-300 shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="https://… (or upload below)"
        />
      </div>

      <!-- Image upload note -->
      <p class="text-xs text-gray-400">
        💡 To upload an OG image, create the link first, then edit it to upload.
      </p>

      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

      <div class="flex gap-3">
        <button
          type="submit"
          :disabled="loading"
          class="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2 rounded-md disabled:opacity-50"
        >
          {{ loading ? 'Creating…' : 'Create Link' }}
        </button>
        <RouterLink to="/links" class="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">Cancel</RouterLink>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { createLink } from '@/api/client';

const router = useRouter();
const loading = ref(false);
const error = ref('');

const form = ref({
  url: '',
  ogTitle: '',
  ogDesc: '',
  ogImage: '',
});

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    const link = await createLink({
      url: form.value.url,
      ogTitle: form.value.ogTitle || undefined,
      ogDesc: form.value.ogDesc || undefined,
      ogImage: form.value.ogImage || undefined,
    });
    router.push(`/links/${link.id}/edit`);
  } catch (e: unknown) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}
</script>
