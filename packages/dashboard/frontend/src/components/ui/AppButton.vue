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

type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariant;
    size?: ButtonSize;
    to?: RouteLocationRaw;
    href?: string;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
  }>(),
  {
    variant: 'secondary',
    size: 'md',
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
    'inline-flex shrink-0 select-none items-center justify-center gap-2 rounded-control text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ui-canvas';

  const variants: Record<ButtonVariant, string> = {
    primary: 'cursor-pointer bg-ui-focus text-ui-action-contrast hover:bg-ui-action-hover disabled:cursor-not-allowed disabled:opacity-50',
    secondary:
      'cursor-pointer border border-ui-control-edge bg-ui-raised text-ui-ink hover:border-ui-focus hover:text-ui-focus disabled:cursor-not-allowed disabled:opacity-50',
    danger: 'cursor-pointer bg-ui-danger text-ui-danger-contrast hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50',
    ghost:
      'cursor-pointer border border-transparent bg-transparent text-ui-secondary hover:bg-ui-hover hover:text-ui-ink disabled:cursor-not-allowed disabled:opacity-50',
  };

  const sizes: Record<ButtonSize, string> = {
    sm: 'h-control-sm min-h-control-sm px-2.5 text-xs',
    md: 'h-control min-h-control px-3',
    lg: 'h-control-lg min-h-control-lg px-4',
    icon: 'h-control min-h-control w-control px-0',
  };

  return [base, sizes[props.size], variants[props.variant], props.disabled && 'pointer-events-none'];
});
</script>
