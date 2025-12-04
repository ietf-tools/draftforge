<template>
  <div class="bg-black text-white">{{ state.results }}</div>
</template>

<script setup>
import { reactive } from 'vue'

const state = reactive({
  results: 'Vue loaded'
})

function test() {
  vscode.postMessage({
    command: 'openRef',
    url: Date.now()
  })
}
window.addEventListener('message', event => {
  state.results = JSON.stringify(event.data.results, null, 2)
})

</script>

<style lang="scss">
body {
  padding: 0;
  margin: 0;
}
</style>
