<template>
  <div class="tool-shell min-h-screen bg-slate-950 text-slate-100">
    <nav
      v-if="isLoggedIn"
      class="flex items-center gap-2 border-b border-slate-800 bg-slate-900 px-3 py-2.5 sm:gap-4 sm:px-4 sm:py-3"
    >
      <span class="tool-heading hidden text-lg font-semibold text-slate-100 sm:inline">URL Shortener</span>
      <span class="tool-heading text-base font-semibold text-slate-100 sm:hidden">URLs</span>
      <AppButton to="/overview" :variant="tabVariant('overview')" class="h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm">Overview</AppButton>
      <AppButton to="/links" :variant="tabVariant('links')" class="h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm">Links</AppButton>
      <AppButton to="/links/new" :variant="tabVariant('create')" class="h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm">Create</AppButton>
      <AppButton variant="ghost" class="ml-auto h-8 w-8 px-0 sm:h-9 sm:w-auto sm:px-3" @click="logout" aria-label="Logout">
        <template #icon>
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
          </svg>
        </template>
        <span class="hidden sm:inline">Logout</span>
      </AppButton>
    </nav>

    <main class="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <RouterView />
    </main>

    <Transition name="toast">
      <div
        v-if="toastVisible"
        class="pointer-events-none fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100"
      >
        Copied
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, provide } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppButton from '@/components/ui/AppButton.vue';

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

function tabVariant(tab: 'overview' | 'links' | 'create'): 'secondary' | 'ghost' {
  const path = route.path;
  const active =
    (tab === 'overview' && path === '/overview') ||
    (tab === 'links' && path.startsWith('/links') && path !== '/links/new') ||
    (tab === 'create' && path === '/links/new');
  return active ? 'secondary' : 'ghost';
}

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
