<template>
  <component :is="as" :class="cardClass">
    <slot />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type CardVariant = 'default' | 'compact' | 'elevated';

const props = withDefaults(
  defineProps<{
    variant?: CardVariant;
    as?: string;
  }>(),
  {
    variant: 'default',
    as: 'div',
  }
);

const cardClass = computed(() => {
  const base = 'rounded-lg border border-slate-800 bg-slate-900';
  const variants: Record<CardVariant, string> = {
    default: 'p-5 sm:p-6',
    compact: 'p-4',
    elevated: 'p-6 shadow-2xl',
  };
  return [base, variants[props.variant]];
});
</script>
