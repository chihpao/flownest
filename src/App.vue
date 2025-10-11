<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import SessionSyncBanner from '@/components/SessionSyncBanner.vue'
import BgmControl from '@/components/BgmControl.vue'
</script>

<template>
  <AppLayout>
    <template #banner>
      <SessionSyncBanner />
    </template>

    <RouterView v-slot="{ Component }">
      <Transition name="page-fade" mode="out-in">
        <Suspense>
          <component :is="Component" />
          <template #fallback>
            <div class="card animate-fade-scale p-8 text-center text-ink-500">
              Loading...
            </div>
          </template>
        </Suspense>
      </Transition>
    </RouterView>
  </AppLayout>

  <BgmControl />
</template>
