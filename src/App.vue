<script setup lang="ts">
import { RouterView } from 'vue-router'
import NavBar from '@/components/NavBar.vue'
import SessionSyncBanner from '@/components/SessionSyncBanner.vue'
import BgmControl from '@/components/BgmControl.vue'
</script>

<template>
  <div class="flex min-h-screen flex-col bg-white text-slate-900">
    <NavBar />
    <SessionSyncBanner />
    <!-- GlobalBgmDockMarker -->
    <div class="pointer-events-none fixed left-0 right-0 top-[calc(env(safe-area-inset-top)+76px)] z-40 flex justify-center px-4 sm:justify-end sm:px-6">
      <div class="pointer-events-auto drop-shadow-lg">
        <BgmControl />
      </div>
    </div>
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
