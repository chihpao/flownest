<script setup lang="ts">
import { onMounted, onUnmounted, ref, nextTick } from 'vue';
import * as THREE from 'three';
import WAVES from 'vanta/dist/vanta.waves.min';

// 擴展 Window 介面以包含 THREE
declare global {
  interface Window {
    THREE: typeof THREE;
  }
}

const bgEl = ref<HTMLElement | null>(null);
let vanta: any = null;

const initVanta = () => {
  if (!bgEl.value) return;
  
  // 確保 Three.js 已載入到 window 物件
  if (typeof window !== 'undefined') {
    window.THREE = window.THREE || THREE;
  }

  // 移除任何現有的 canvas 元素
  const existingCanvas = bgEl.value.querySelector('canvas');
  if (existingCanvas && existingCanvas.parentNode) {
    existingCanvas.parentNode.removeChild(existingCanvas);
  }

  try {
    vanta = WAVES({
      el: bgEl.value,
      THREE: window.THREE || THREE,
      mouseControls: true,
      touchControls: true,
      gyroControls: false,
      minHeight: 200.0,
      minWidth: 200.0,
      scale: 1.0,
      scaleMobile: 1.0,
      color: 0x3b82f6,
      shininess: 50,
      waveHeight: 15.0,
      waveSpeed: 0.8,
      zoom: 0.7,
      forceAnimate: true,
      backgroundColor: 0xffffff00,
    });

    // 強制重繪
    setTimeout(() => {
      if (vanta && vanta.renderer) {
        vanta.renderer.setSize(window.innerWidth, window.innerHeight);
      }
    }, 100);
  } catch (error) {
    console.error('Error initializing Vanta.js:', error);
  }
};

onMounted(() => {
  if (typeof window === 'undefined') return;
  
  nextTick(() => {
    // 延遲初始化以確保 DOM 完全載入
    const timer = setTimeout(() => {
      initVanta();
      // 監聽窗口大小變化
      window.addEventListener('resize', initVanta);
    }, 100);

    // 清理計時器
    return () => clearTimeout(timer);
  });
});

onUnmounted(() => {
  if (vanta) {
    vanta.destroy();
    vanta = null;
  }
  window.removeEventListener('resize', initVanta);
});
</script>

<template>
  <div ref="bgEl" class="fixed inset-0 w-full h-full"></div>
</template>

<style scoped>
div {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: -1;
}

:deep(canvas) {
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  display: block !important;
  z-index: -1 !important;
}
</style>
