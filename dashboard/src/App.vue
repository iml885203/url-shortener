<template>
  <div class="min-h-screen bg-gray-900 text-gray-100">
    <nav v-if="isLoggedIn" class="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center gap-4 sm:gap-6">
      <span class="font-semibold text-white text-lg">🔗 URL Shortener</span>
      <RouterLink to="/links" class="text-sm text-gray-400 hover:text-white transition-colors">Links</RouterLink>
      <RouterLink to="/links/new" class="text-sm text-gray-400 hover:text-white transition-colors">+ New</RouterLink>
      <button @click="logout" class="ml-auto text-sm text-gray-500 hover:text-red-400 transition-colors">Logout</button>
    </nav>
    <main class="max-w-5xl mx-auto px-4 py-6 sm:py-8">
      <RouterView />
    </main>

    <!-- Toast -->
    <Transition name="toast">
      <div
        v-if="toastVisible"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-700 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50 pointer-events-none"
      >
        ✓ Copied!
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, provide } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const isLoggedIn = computed(() => !!localStorage.getItem('api_key'));

function logout() {
  localStorage.removeItem('api_key');
  router.push('/login');
}

// Global copy toast
const toastVisible = ref(false);
let toastTimer: ReturnType<typeof setTimeout> | null = null;

function showCopyToast() {
  if (toastTimer) clearTimeout(toastTimer);
  toastVisible.value = true;
  toastTimer = setTimeout(() => {
    toastVisible.value = false;
  }, 1800);
}

provide('showCopyToast', showCopyToast);
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}
</style>
