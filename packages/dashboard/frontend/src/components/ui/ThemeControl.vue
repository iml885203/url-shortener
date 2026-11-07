<script setup lang="ts">
import { ref } from 'vue';
import Select from 'primevue/select';
import { theme } from '@/ui/theme';
import type { ThemePreference } from '@/ui/foundation/theme';
const preference = ref<ThemePreference>(theme.preference);
const choices = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];
const icons: Record<string, string> = {
  system: 'M4 4.5h16v12H4z M8 20h8 M12 16.5V20',
  light: 'M15.5 12a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0 M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1.5 1.5 M17.5 17.5 19 19 M5 19l1.5-1.5 M17.5 6.5 19 5',
  dark: 'M20 14a8 8 0 0 1-10-10 8.25 8.25 0 1 0 10 10Z',
};
function change() { theme.setPreference(preference.value); }
</script>
<template>
  <Select v-model="preference" :options="choices" option-label="label" option-value="value" aria-label="Appearance" @change="change"
    :pt="{ root: 'theme-select', label: 'theme-select-label', dropdown: 'theme-select-chevron', dropdownIcon: 'theme-select-chevron-icon', overlay: 'theme-menu', listContainer: 'theme-menu-scroll', list: 'theme-menu-list', option: 'theme-menu-option' }">
    <template #value="{ value }">
      <svg class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="icons[value]" /></svg>
      <span>{{ choices.find(choice => choice.value === value)?.label }}</span>
    </template>
    <template #header><div class="theme-menu-heading">Appearance</div></template>
    <template #option="{ option, selected }">
      <svg class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="icons[option.value]" /></svg>
      <span>{{ option.label }}</span>
      <svg v-if="selected" class="theme-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
    </template>
  </Select>
</template>
