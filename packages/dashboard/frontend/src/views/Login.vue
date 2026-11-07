<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppButton from '@/components/ui/AppButton.vue';
import { verifyKey } from '@/api/client';
import { oidc, authError, refreshAuth } from '@/auth';
const router = useRouter();
const logoUrl = import.meta.env.BASE_URL + 'logo.svg';
const key = ref(''), error = ref('');
const loading = ref(false), redirecting = ref(false);
const failed = new URLSearchParams(location.search).get('error') === 'oidc';
function reset() { redirecting.value = false; }
onMounted(() => window.addEventListener('pageshow', reset));
onUnmounted(() => window.removeEventListener('pageshow', reset));
function sso() {
  if (redirecting.value) return;
  redirecting.value = true;
  location.assign('/auth/oidc?returnTo=' + encodeURIComponent('/dashboard/overview'));
}
async function submit() {
  if (loading.value || !key.value.trim()) return;
  loading.value = true; error.value = '';
  try {
    if (!await verifyKey(key.value.trim())) throw new Error('This token was not accepted. Check it and try again.');
    localStorage.setItem('api_key', key.value.trim());
    key.value = '';
    if (await refreshAuth()) await router.replace('/overview');
  } catch (e) { error.value = (e as Error).message; }
  finally { loading.value = false; }
}
</script>
<template>
  <section class="login-panel" aria-labelledby="login-title">
    <img class="login-icon" :src="logoUrl" alt="" width="48" height="48" />
    <div><h1 id="login-title" class="font-semibold">Sign in to URL Shortener</h1><p class="mt-3 text-ui-secondary">Manage your links and see how they’re used.</p></div>
    <div v-if="authError" class="space-y-3" role="alert"><p class="text-ui-danger">{{ authError }}</p><AppButton @click="refreshAuth">Retry connection</AppButton></div>
    <template v-if="oidc.enabled">
      <p v-if="failed" class="text-ui-danger" role="alert">Sign-in was not completed, or access was denied. Please try again.</p>
      <AppButton variant="primary" class="w-full" :disabled="redirecting" @click="sso">{{ redirecting ? 'Opening sign-in…' : `Sign in with ${oidc.label}` }}</AppButton>
    </template>
    <form class="space-y-4" @submit.prevent="submit" :aria-busy="loading">
      <div class="space-y-2"><label for="api-token" class="block font-medium">{{ oidc.enabled ? 'Or use an API token' : 'API token' }}</label>
        <input id="api-token" v-model="key" type="password" autocomplete="current-password" class="app-input" required :disabled="loading" aria-describedby="token-help" />
        <p id="token-help" class="text-xs text-ui-secondary">Use the token configured by this service’s administrator.</p>
      </div>
      <p v-if="error" class="text-ui-danger" role="alert">{{ error }}</p>
      <AppButton type="submit" :variant="oidc.enabled ? 'secondary' : 'primary'" class="w-full" :disabled="loading || !key.trim()">{{ loading ? 'Checking token…' : 'Sign in with token' }}</AppButton>
    </form>
  </section>
</template>
<style scoped>
.login-panel { width: 100%; max-width: 380px; margin: clamp(40px, 10vh, 120px) auto; display: grid; gap: 24px; }
.login-icon { width: 48px; height: 48px; }
</style>
