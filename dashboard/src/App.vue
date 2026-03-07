<template>
  <div class="tool-shell min-h-screen bg-slate-950 text-slate-100">
    <nav
      v-if="isLoggedIn"
      class="flex items-center gap-4 border-b border-slate-800 bg-slate-900 px-4 py-3 sm:gap-6"
    >
      <span class="tool-heading text-lg font-semibold text-slate-100">URL Shortener</span>
      <AppButton to="/overview" :variant="tabVariant('overview')" class="h-9 px-3">Overview</AppButton>
      <AppButton to="/links" :variant="tabVariant('links')" class="h-9 px-3">Links</AppButton>
      <AppButton to="/links/new" :variant="tabVariant('create')" class="h-9 px-3">Create</AppButton>
      <AppButton variant="ghost" class="ml-auto h-9 px-3" @click="logout">Logout</AppButton>
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
