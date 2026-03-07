<template>
  <div class="flex items-center justify-center min-h-[70vh] px-4">
    <div class="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-8 w-full max-w-sm">
      <h1 class="text-xl font-semibold mb-6 text-center text-white">🔗 URL Shortener</h1>
      <form @submit.prevent="submit">
        <label class="block text-sm font-medium text-gray-300 mb-1">API Key</label>
        <input
          v-model="key"
          type="password"
          autocomplete="current-password"
          class="block w-full rounded-md bg-gray-700 border border-gray-600 text-white placeholder-gray-500 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="Enter your API key"
          required
        />
        <p v-if="error" class="mt-2 text-sm text-red-400">{{ error }}</p>
        <button
          type="submit"
          :disabled="loading"
          class="mt-4 w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-md py-2 text-sm font-medium disabled:opacity-50 transition-colors"
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
