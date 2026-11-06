import { ref } from 'vue';
export const authenticated = ref(false);
export const sessionAuthenticated = ref(false);
export const oidc = ref({ enabled: false, label: 'SSO' });
export const authError = ref('');
export function apiKey(): string {
  try { return localStorage.getItem('api_key') ?? ''; } catch { return ''; }
}
export async function refreshAuth(): Promise<boolean> {
  authError.value = '';
  try {
    const key = apiKey();
    const response = await fetch('/api/auth/session', { headers: key ? { 'X-API-Key': key } : {}, credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) throw new Error('Sign-in is temporarily unavailable. Please retry.');
    const state = await response.json();
    oidc.value = state.oidc;
    authenticated.value = state.authenticated === true;
    sessionAuthenticated.value = state.sessionAuthenticated === true;
    if (!authenticated.value) try { localStorage.removeItem('api_key'); } catch { /* Storage may be disabled. */ }
  } catch (error) {
    authenticated.value = false;
    authError.value = (error as Error).message;
  }
  return authenticated.value;
}
export async function logout(): Promise<void> {
  if (sessionAuthenticated.value) {
    const response = await fetch('/auth/logout', { method: 'POST', credentials: 'same-origin' });
    if (!response.ok) throw new Error('Sign-out failed. Please try again.');
  }
  localStorage.removeItem('api_key');
  authenticated.value = false;
  sessionAuthenticated.value = false;
}
