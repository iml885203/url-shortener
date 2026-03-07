<template>
  <div class="min-h-screen bg-slate-950 text-slate-100">
    <nav
      v-if="isLoggedIn"
      class="flex items-center gap-4 border-b border-slate-800 bg-slate-900 px-4 py-3 sm:gap-6"
    >
      <span class="text-lg font-semibold text-slate-100">URL Shortener</span>
      <RouterLink to="/overview" :class="tabClass('overview')" class="text-sm transition-colors">Overview</RouterLink>
      <RouterLink to="/links" :class="tabClass('links')" class="text-sm transition-colors">Links</RouterLink>
      <RouterLink to="/links/new" :class="tabClass('create')" class="text-sm transition-colors">Create</RouterLink>
      <button
        @click="logout"
        class="ml-auto text-sm text-slate-400 transition-colors hover:text-slate-100"
      >
        Logout
      </button>
    </nav>
    <main class="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <RouterView />
    </main>

    <!-- Toast -->
    <Transition name="toast">
      <div
        v-if="toastVisible"
        class="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100"
      >
        Copied
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, provide } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const router = useRouter();
const route = useRoute();
const isLoggedIn = computed(() => {
  route.fullPath;
  return !!localStorage.getItem('api_key');
});

function logout() {
  localStorage.removeItem('api_key');
  router.push('/login');
}

function tabClass(tab: 'overview' | 'links' | 'create'): string {
  const path = route.path;
  const active =
    (tab === 'overview' && path === '/overview') ||
    (tab === 'links' && path.startsWith('/links') && path !== '/links/new') ||
    (tab === 'create' && path === '/links/new');
  return active ? 'text-blue-400' : 'text-slate-400 hover:text-slate-100';
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
