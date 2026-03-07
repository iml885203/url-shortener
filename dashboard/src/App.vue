<template>
  <div class="min-h-screen">
    <nav v-if="isLoggedIn" class="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-6">
      <span class="font-semibold text-gray-800 text-lg">🔗 URL Shortener</span>
      <RouterLink to="/links" class="text-sm text-gray-600 hover:text-gray-900">Links</RouterLink>
      <RouterLink to="/links/new" class="text-sm text-gray-600 hover:text-gray-900">+ New</RouterLink>
      <button @click="logout" class="ml-auto text-sm text-gray-500 hover:text-red-600">Logout</button>
    </nav>
    <main class="max-w-5xl mx-auto px-4 py-8">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const isLoggedIn = computed(() => !!localStorage.getItem('api_key'));

function logout() {
  localStorage.removeItem('api_key');
  router.push('/login');
}
</script>
