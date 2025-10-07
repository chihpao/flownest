<script setup lang="ts">
import { RouterView } from 'vue-router'
import NavBar from '@/components/NavBar.vue'
import SessionSyncBanner from '@/components/SessionSyncBanner.vue'
import BgmControl from '@/components/BgmControl.vue'
</script>

<template>
  <div class="relative flex min-h-screen flex-col bg-gradient-to-br from-emerald-50/70 via-white/80 to-slate-100/70 text-slate-900">
    <div class="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_55%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.12),_transparent_50%)]"></div>
    <NavBar />
    <SessionSyncBanner />
    <div class="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <RouterView v-slot="{ Component }">
        <Transition name="page-fade" mode="out-in">
          <Suspense>
            <component :is="Component" />
            <template #fallback>
              <div class="grid min-h-full place-content-center bg-white/80 text-slate-400">
                載入中...
              </div>
            </template>
          </Suspense>
        </Transition>
      </RouterView>
    </div>
    <BgmControl />
  </div>
</template>
