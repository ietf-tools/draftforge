<template>
  <span :class="'inline-flex items-center text-xs px-2 py-1 gap-1 rounded-sm bg-black/50 text-error-100 ' + (props.bold ? 'font-bold' : 'font-medium')">{{ props.label }}</span>
</template>

<script setup>
const props = defineProps({
  label: {
    type: String
  },
  bold: {
    type: Boolean,
    default: false
  }
})
</script>
