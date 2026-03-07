<template>
  <div class="flex items-center justify-center min-h-[60vh]">
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full max-w-sm">
      <h1 class="text-xl font-semibold mb-6 text-center">🔗 URL Shortener</h1>
      <form @submit.prevent="submit">
        <label class="block text-sm font-medium text-gray-700 mb-1">API Key</label>
        <input
          v-model="key"
          type="password"
          autocomplete="current-password"
          class="block w-full rounded-md border-gray-300 shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Enter your API key"
          required
        />
        <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>
        <button
          type="submit"
          :disabled="loading"
          class="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-md py-2 text-sm font-medium disabled:opacity-50"
        >
          {{ loading ? 'Verifying…' : 'Sign in' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { verifyKey } from '@/api/client';

const router = useRouter();
const key = ref('');
const error = ref('');
const loading = ref(false);

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    const ok = await verifyKey(key.value);
    if (ok) {
      localStorage.setItem('api_key', key.value);
      router.push('/links');
    } else {
      error.value = 'Invalid API key';
    }
  } catch {
    error.value = 'Connection error';
  } finally {
    loading.value = false;
  }
}
</script>
