<script setup lang="ts">
import { RouterView } from 'vue-router'
import NavBar from '@/components/NavBar.vue'
import SessionSyncBanner from '@/components/SessionSyncBanner.vue'
</script>

<template>
  <div class="flex min-h-screen flex-col bg-white text-slate-900">
    <NavBar />
    <SessionSyncBanner />
    <div class="flex-1">
      <RouterView v-slot="{ Component }">
        <Suspense>
          <component :is="Component" />
          <template #fallback>
            <div class="grid min-h-full place-content-center bg-white/80 text-slate-400">
              載入中...
            </div>
          </template>
        </Suspense>
      </RouterView>
    </div>
  </div>
</template>
