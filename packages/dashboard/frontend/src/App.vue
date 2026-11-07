<template>
  <div class="tool-shell min-h-screen bg-ui-canvas text-ui-ink">
    <header class="border-b border-ui-edge bg-ui-canvas">
      <div class="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
        <span class="tool-heading shrink-0 text-base font-semibold text-ui-ink">URL Shortener</span>
        <nav v-if="isLoggedIn" aria-label="Main navigation" class="hidden items-center gap-2 sm:flex">
          <AppButton to="/overview" :variant="tabVariant('overview')" class="h-9 px-3">Overview</AppButton>
          <AppButton to="/links" :variant="tabVariant('links')" class="h-9 px-3">Links</AppButton>
          <AppButton to="/links/new" :variant="tabVariant('create')" class="h-9 px-3">Create</AppButton>
        </nav>
        <div class="ml-auto flex items-center gap-2">
          <ThemeControl />
      <AppButton variant="ghost" class="hidden h-9 px-3 sm:inline-flex" @click="logout" aria-label="Logout">
        <template #icon>
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
          </svg>
        </template>
        Logout
      </AppButton>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-5xl px-4 py-6 pb-24 sm:py-8 sm:pb-8">
      <p v-if="logoutError" role="alert" class="mb-4 text-ui-danger">{{ logoutError }}</p>
      <RouterView />
    </main>

    <!-- Mobile bottom nav -->
    <nav
      v-if="isLoggedIn"
      class="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-ui-edge bg-ui-raised/95  sm:hidden"
    >
      <RouterLink
        v-for="tab in tabs"
        :key="tab.id"
        :to="tab.to"
        class="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors"
        :class="isActiveTab(tab.id) ? 'text-ui-focus' : 'text-ui-secondary'"
      >
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" :d="tab.icon" />
        </svg>
        {{ tab.label }}
      </RouterLink>
      <button
        class="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium text-ui-secondary transition-colors"
        @click="logout"
      >
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
        </svg>
        Logout
      </button>
    </nav>

    <Transition name="toast">
      <div
        v-if="toastVisible"
        class="pointer-events-none fixed bottom-20 left-1/2 z-[60] -translate-x-1/2 rounded-md border border-ui-control-edge bg-ui-raised px-4 py-2 text-sm text-ui-ink sm:bottom-6"
      >
        Copied
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, provide } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import AppButton from '@/components/ui/AppButton.vue';
import ThemeControl from '@/components/ui/ThemeControl.vue';
import { authenticated as isLoggedIn, logout as signOut } from '@/auth';

const router = useRouter();
const route = useRoute();
const logoutError = ref('');

const tabs = [
  {
    id: 'overview' as const,
    to: '/overview',
    label: 'Overview',
    icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z',
  },
  {
    id: 'links' as const,
    to: '/links',
    label: 'Links',
    icon: 'M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244',
  },
  {
    id: 'create' as const,
    to: '/links/new',
    label: 'Create',
    icon: 'M12 4.5v15m7.5-7.5h-15',
  },
];

function isActiveTab(tab: 'overview' | 'links' | 'create'): boolean {
  const path = route.path;
  return (
    (tab === 'overview' && path === '/overview') ||
    (tab === 'links' && path.startsWith('/links') && path !== '/links/new') ||
    (tab === 'create' && path === '/links/new')
  );
}

function tabVariant(tab: 'overview' | 'links' | 'create'): 'secondary' | 'ghost' {
  return isActiveTab(tab) ? 'secondary' : 'ghost';
}

async function logout() {
  try { await signOut(); await router.replace('/login'); }
  catch (error) { logoutError.value = (error as Error).message; }
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
