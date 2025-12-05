<template>
  <div class="bg-zinc-900 flex flex-col gap-2 flex-1 overflow-y-auto p-2">
    <div v-for="grp of state.results" :key="grp.key" class="pb-2 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-700 rounded-md shadow-sm dark:shadow-white/5">
      <div class="p-3 flex items-center justify-between sm:flex-nowrap">
        <div class="flex items-center justify-between px-1 truncate">
          <IconLucideListTree class="mr-2" />
          <h3 class="text-base font-semibold truncate text-zinc-500 dark:text-zinc-200">{{ grp.title }}</h3>
        </div>
        <div class="shrink-0 text-xs flex items-center">
          <span class="hidden md:block mr-2">{{ grp.perf }} ms</span>
          <UBadge :variant="grp.nitsTotal > 0 ? 'solid' : 'soft'" :color="grp.nitsTotal > 0 ? 'error' : 'success'" :label="grp.nitsTotal || '0'" />
        </div>
      </div>
      <div class="overflow-y-auto divide-y divide-none bg-zinc-50 dark:bg-zinc-800">
        <div v-for="task of grp.tasks" :key="task.key">
          <div
            class="p-3 text-sm border-l-2 transition-colors flex items-center"
            :class="[
              task.nits.length > 0 || task.state === 'failed' ? 'border-2 text-white dark:text-red-50 border-red-500 bg-red-600/70 dark:bg-red-500/50' : 'text-green-700 dark:text-green-200 border-green-500 bg-green-500/10'
            ]"
          >
            <IconLucideTriangleAlert v-if="task.nits.length > 0 || task.state === 'failed'" size="18" class="mr-2" />
            <IconLucideCircleCheck v-else size="18" class="mr-2 text-green-500" />
            <span class="font-semibold">{{ task.title }}</span>
            <div class="flex-auto" />
            <IconLucideCircleDashed v-if="task.state === 'pending'" class="animate-spin mr-2" />
            <span v-if="task.state === 'completed'" class="hidden md:block text-xs mr-2 text-black/60 dark:text-white/60">{{ task.perf }} ms</span>
            <UBadge :variant="task.nits.length > 0 || task.state === 'failed' ? 'solid' : 'soft'" :color="task.nits.length > 0 || task.state === 'failed' ? 'error' : 'success'" :label="task.nits.length || '0'" />
          </div>
          <div v-if="task.state === 'completed' && task.nits.length > 0" class="flex flex-col gap-2 bg-red-500/20 py-2 px-2 text-sm">
            <div v-for="(nit, idx) of task.nits" :key="idx" class="bg-white/50 dark:bg-black/20 rounded-md p-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center pr-2">
                  <UBadge :label="getNitType(nit).name" :class="'mr-2 font-bold ' + getNitType(nit).css" bold />
                  <UBadge :label="nit.name" class="mr-2 bg-red-500/10 text-red-800 dark:text-red-200" />
                  <span>{{ nit.message }}</span>
                </div>
                <button v-if="nit.refUrl" @click="viewRef(nit.refUrl)" class="cursor-pointer rounded-md font-medium inline-flex items-center text-sm bg-neutral-800 hover:bg-neutral-800/75 gap-1.5 px-2.5 py-1.5 ring ring-inset ring-neutral-800">
                  <IconLucideBookText />
                  Ref
                  <IconLucideArrowUpRight />
                </button>
              </div>
              <div v-if="nit.lines" class="flex items-center gap-2 mt-2 pl-2">
                <span class="text-red-600 dark:text-red-100 text-xs">LINES |</span>
                <UBadge v-for="(ln, lnIdx) of nit.lines" :key="lnIdx" size="sm" class="bg-black/50 text-white dark:text-red-100" :label="'Ln ' + ln.line + ', Col ' + ln.pos" />
              </div>
              <div v-if="nit.path" class="flex items-center mt-2 pl-2">
                <span class="text-red-600 dark:text-red-100 text-xs mr-1">PATH |</span>
                <UBadge class="font-mono bg-black/50 text-white dark:text-red-100" :label="nit.path" />
              </div>
              <div v-if="nit.text" class="flex items-center mt-2 pl-2">
                <span class="text-red-600 dark:text-red-100 text-xs mr-1">TEXT |</span>
                <div class="font-mono">{{ nit.text }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'

import UBadge from './components/UBadge.vue'
import IconLucideListTree from '~icons/lucide/list-tree'
import IconLucideTriangleAlert from '~icons/lucide/triangle-alert'
import IconLucideCircleCheck from '~icons/lucide/circle-check'
import IconLucideCircleDashed from '~icons/lucide/circle-dashed'
import IconLucideBookText from '~icons/lucide/book-text'
import IconLucideArrowUpRight from '~icons/lucide/arrow-up-right'

const vscode = acquireVsCodeApi()

const state = reactive({
  results: []
})

function viewRef(url) {
  vscode.postMessage({
    command: 'openRef',
    url
  })
}

function getNitType(nit) {
  if (nit.result === 'comment') {
    return {
      name: 'Comment',
      css: 'bg-blue-500/10 text-blue-400'
    }
  } else if (nit.result === 'error') {
    return {
      name: 'Error',
      css: 'bg-red-500/10 text-red-400'
    }
  } else if (nit.result === 'warning') {
    return {
      name: 'Warning',
      css: 'bg-amber-500/10 text-amber-400'
    }
  } else {
    return {
      name: 'Unknown',
      css: ''
    }
  }
}

window.addEventListener('message', event => {
  state.results = event.data.results ?? []
})

</script>

<style lang="scss">
body {
  padding: 0;
  margin: 0;
}
</style>
