<template lang="pug">
q-item
  q-item-section.text-caption(style='max-width: 280px;')
    strong.ellipsis(style='max-width: 280px;', :class='`text-` + props.color + `-4`') {{ props.nit.name }}
      q-tooltip {{ props.nit.name }}
    .text-blue-grey-2 {{ props.nit.message }}
    .text-blue-grey-1.q-mt-xs(v-if='props.nit.text') #[q-icon(name='mdi-transfer-right' color='white')] {{ props.nit.text }}
    .text-blue-grey-1.q-mt-xs(v-if='props.nit.path'): strong #[q-icon(name='mdi-transfer-right' color='white')]  {{ props.nit.path }}
    .text-blue-grey-1.q-mt-xs(v-if='props.nit.lines')
      q-icon.q-mr-xs(name='mdi-transfer-right' color='teal-4')
      q-badge.text-teal-1(
        v-for="(ln, lnIdx) of props.nit.lines"
        :key="lnIdx"
        color='teal-10'
        ) Ln {{ ln.line }}, Col {{ ln.pos }}
  q-item-section(side)
    q-btn(
      color='dark-2'
      text-color='white'
      icon='mdi-book-open-page-variant-outline'
      padding='xs xs'
      size='sm'
      unelevated
      @click='viewReference(props.nit.refUrl)'
      )
      q-tooltip View Reference
</template>

<script setup>
const props = defineProps({
  nit: {
    type: Object,
    required: true
  },
  color: {
    type: String,
    default: 'red'
  }
})

function viewReference (url) {
  window.ipcBridge.emit('launchBrowser', { url })
}
</script>
