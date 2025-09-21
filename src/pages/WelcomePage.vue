<script setup lang="ts">
import hero from '@/assets/hero.svg'
import BackgroundWaves from '@/components/BackgroundWaves.vue'
</script>

<template>
  <div class="relative min-h-screen w-full overflow-hidden">
    <div class="fixed inset-0 -z-10">
      <BackgroundWaves />
    </div>

    <main class="relative z-10 flex min-h-screen flex-col items-center px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <section class="w-full max-w-5xl py-16 md:py-20">
        <div class="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div class="space-y-8">
            <div class="space-y-4">
              <span class="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold tracking-[0.3em] text-emerald-600">
                WELCOME TO FLOWNEST
              </span>
              <h1 class="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
                專注的節奏，由你決定
              </h1>
              <p class="max-w-xl text-lg leading-relaxed text-slate-600">
                FlowNest 為你準備了合適的專注模式與氛圍，只要一個按鈕，就能安排下一段理想的專注時光。
              </p>
            </div>

            <router-link
              to="/setup"
              class="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-500 px-8 py-3 text-base font-semibold text-slate-900 shadow-lg transition hover:shadow-xl hover:brightness-110 active:scale-[0.98]"
            >
              立即開始專注
            </router-link>
          </div>

          <div class="relative flex justify-center">
            <div class="absolute -inset-10 -z-10 rounded-[48px] bg-gradient-to-br from-emerald-200/60 via-white/40 to-slate-100/40 blur-3xl"></div>
            <img
              :src="hero"
              alt="FlowNest preview"
              class="w-full max-w-xl rounded-[48px] border border-white/40 bg-white/70 shadow-2xl shadow-emerald-200/40"
              draggable="false"
            />
          </div>
        </div>
      </section>
    </main>
  </div>
</template>
