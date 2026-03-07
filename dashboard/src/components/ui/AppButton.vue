<template>
  <component :is="componentTag" v-bind="componentProps" :class="buttonClass">
    <span v-if="$slots.icon" class="shrink-0"><slot name="icon" /></span>
    <span v-if="$slots.default"><slot /></span>
    <span v-if="$slots.trailingIcon" class="shrink-0"><slot name="trailingIcon" /></span>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, type RouteLocationRaw } from 'vue-router';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariant;
    to?: RouteLocationRaw;
    href?: string;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
  }>(),
  {
    variant: 'secondary',
    type: 'button',
    disabled: false,
  }
);

const componentTag = computed(() => {
  if (props.disabled && (props.to || props.href)) return 'span';
  if (props.to) return RouterLink;
  if (props.href) return 'a';
  return 'button';
});

const componentProps = computed(() => {
  if (componentTag.value === RouterLink) {
    return { to: props.to };
  }
  if (componentTag.value === 'a') {
    return { href: props.href };
  }
  return {
    type: props.type,
    disabled: props.disabled,
  };
});

const buttonClass = computed(() => {
  const base =
    'inline-flex h-10 select-none items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950';

  const variants: Record<ButtonVariant, string> = {
    primary: 'cursor-pointer bg-blue-600 text-slate-100 hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50',
    secondary:
      'cursor-pointer border border-slate-700 bg-slate-900 text-slate-200 hover:border-blue-500 hover:text-blue-400 disabled:cursor-not-allowed disabled:opacity-50',
    danger: 'cursor-pointer bg-red-600 text-red-50 hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50',
    ghost:
      'cursor-pointer border border-transparent bg-transparent text-slate-300 hover:bg-slate-800 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-50',
  };

  return [base, variants[props.variant], props.disabled && 'pointer-events-none'];
});
</script>
