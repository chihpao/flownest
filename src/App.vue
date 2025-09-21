<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <RouterView v-slot="{ Component }">
    <Suspense>
      <component :is="Component" />
      <template #fallback>
        <div class="grid min-h-screen place-content-center bg-white text-slate-400">
          載入中...
        </div>
      </template>
    </Suspense>
  </RouterView>
</template>
