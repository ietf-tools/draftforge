<template lang="pug">
.q-px-md.q-pt-md.q-pb-sm
  .flex.items-center
    .text-caption.text-light-blue-3
      strong Snippets Library
q-list
  q-item(clickable @click='insertAuthorBlock' disabled)
    q-item-section(side)
      q-icon(name='mdi-card-account-details' size='xs' color='teal-2')
    q-item-section
      q-item-label Insert Author Block
      q-item-label.text-teal-2(caption) Add new author element to document
</template>

<script setup>

function insertAuthorBlock () {

}

</script>
