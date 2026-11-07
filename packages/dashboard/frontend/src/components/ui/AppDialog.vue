<script setup lang="ts">
import Dialog from 'primevue/dialog';
const visible = defineModel<boolean>('visible', { required: true });
defineProps<{ title: string; busy?: boolean }>();
</script>
<template>
  <Dialog v-model:visible="visible" :header="title" modal :closable="!busy" :close-on-escape="!busy" :dismissable-mask="!busy"
    :pt="{ root: 'app-dialog', mask: 'app-dialog-mask', header: 'app-dialog-header', title: 'app-dialog-title', headerActions: 'flex', pcCloseButton: { root: 'app-dialog-close' }, content: 'app-dialog-content' }">
    <slot />
  </Dialog>
</template>
