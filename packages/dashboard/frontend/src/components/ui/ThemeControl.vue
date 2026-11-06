<script setup lang="ts">
import { ref } from 'vue';
import { theme } from '@/ui/theme';
import type { ThemePreference } from '@/ui/foundation/theme';
const preference = ref<ThemePreference>(theme.preference);
function change() { theme.setPreference(preference.value); }
</script>
<template>
  <label class="theme-control">
    <span class="sr-only">Appearance</span>
    <select v-model="preference" @change="change" aria-label="Appearance">
      <option value="system">System</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>
</template>
