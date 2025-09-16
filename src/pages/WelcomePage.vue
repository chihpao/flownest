<script setup lang="ts">
import { ref, onMounted } from 'vue';
import hero from '@/assets/hero.svg';
import BackgroundWaves from '@/components/BackgroundWaves.vue';
</script>

<template>
  <div class="relative min-h-screen w-full overflow-hidden">
    <!-- 背景效果 -->
    <div class="fixed inset-0 -z-10">
      <BackgroundWaves />
    </div>
    
    <!-- 內容區塊 -->
    <main class="relative min-h-screen flex flex-col items-center p-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div class="flex-1 w-full max-w-4xl flex flex-col items-center justify-center">
      <!-- 標題區 -->
      <header class="text-center mb-0">
        <h1 class="text-5xl md:text-6xl font-bold tracking-tight mb-4">
          <span class="bg-clip-text text-transparent bg-gradient-to-r from-gray-400 to-gray-900">FlowNest</span>
        </h1>
        <p class="text-xl text-zinc-600 max-w-md mx-auto">
          進入你的心流，保持專注
        </p>
      </header>

      <!-- 主要插圖 -->
      <div class="relative w-full max-w-2xl aspect-square mb-12">
        <img 
          :src="hero" 
          alt="Focus illustration" 
          class="w-full h-full object-contain"
          draggable="false"
        />
      </div>
      

      <!-- 按鈕區 -->
      <div class="flex flex-col sm:flex-row gap-4 mt-">
        <router-link 
          to="/setup"
          class="px-8 py-3 rounded-full bg-gradient-to-r from-orange-300 to-orange-600 text-black font-medium shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
        >
          開始
        </router-link>
      </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* 確保背景層在內容層下方 */
:deep(canvas) {
  position: fixed !important;
  top: 0;
  left: 0;
  z-index: 0;
  width: 100% !important;
  height: 100% !important;
}
</style>
