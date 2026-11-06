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
  const base = 'rounded-control border border-ui-edge bg-ui-raised';
  const variants: Record<CardVariant, string> = {
    default: 'p-5 sm:p-6',
    compact: 'p-4',
    elevated: 'p-6 ',
  };
  return [base, variants[props.variant]];
});
</script>
