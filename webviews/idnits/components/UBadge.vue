<template>
  <span class="font-medium inline-flex items-center text-xs px-2 py-1 gap-1 rounded-sm font-mono bg-black/50 text-white dark:text-error-100">{{ props.label }}</span>
</template>

<script setup>
const props = defineProps({
  label: {
    type: 'string'
  }
})
</script>
