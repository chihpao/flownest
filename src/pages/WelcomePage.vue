<script setup lang="ts">
import hero from '@/assets/hero.svg'
import BackgroundWaves from '@/components/BackgroundWaves.vue'

const highlights = [
  {
    title: '專注儀式',
    description: '四種經過設計的專注意圖，依任務提供不同節奏與提醒。',
  },
  {
    title: '可視呼吸',
    description: 'Three.js 呼吸球同步計時，讓你在視覺節奏中穩定前進。',
  },
  {
    title: '音景支持',
    description: '精挑細選的 Lo-Fi 與 Ambient 聲景，陪你打造沉浸環境。',
  },
]

const steps = [
  {
    label: 'STEP 1',
    title: '選擇專注意圖',
    description: '挑選最貼近今日任務的模式，系統會給出建議時長與休息。',
  },
  {
    label: 'STEP 2',
    title: '客製專注節奏',
    description: '自訂分鐘、調整休息與背景聲景，建立屬於你的專注儀式。',
  },
  {
    label: 'STEP 3',
    title: '進入心流狀態',
    description: '呼吸球、進度環與音景陪伴全程，完成後自動記錄成果。',
  },
]

const stats = [
  {
    value: '5 - 600',
    label: '分鐘自訂範圍',
    detail: '短衝或長程都能靈活安排專注長度。',
  },
  {
    value: '4',
    label: '專注意圖',
    detail: '從深度工作到柔和專注，精準對應任務需求。',
  },
  {
    value: '∞',
    label: '呼吸指引',
    detail: '3D 呼吸球與音景引導放鬆與專注的節奏。',
  },
]
</script>

<template>
  <div class="relative min-h-screen w-full overflow-hidden">
    <div class="fixed inset-0 -z-10">
      <BackgroundWaves />
    </div>

    <main class="relative z-10 flex min-h-screen flex-col items-center px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <section class="w-full max-w-6xl py-16 md:py-20">
        <div class="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div class="space-y-8">
            <div class="space-y-4">
              <span class="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold tracking-[0.3em] text-emerald-600">
                WELCOME TO FLOWNEST
              </span>
              <h1 class="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
                為專注打造的沉浸體驗
              </h1>
              <p class="max-w-xl text-lg leading-relaxed text-slate-600">
                FlowNest 結合呼吸節奏、專注儀式與音景支持，協助你在任何時間快速進入心流；設定專注意圖、調整節奏後即可一鍵啟動。
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-4">
              <router-link
                to="/setup"
                class="rounded-full bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-500 px-8 py-3 text-base font-semibold text-slate-900 shadow-lg transition hover:shadow-xl hover:brightness-110 active:scale-[0.98]"
              >
                立即開始專注
              </router-link>
              <router-link
                to="/setup"
                class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-6 py-3 text-sm font-semibold text-slate-600 backdrop-blur-sm transition hover:border-emerald-200 hover:text-emerald-600"
              >
                探索專注模式
                <span class="text-lg">→</span>
              </router-link>
            </div>

            <div class="grid gap-4 sm:grid-cols-3">
              <div
                v-for="item in highlights"
                :key="item.title"
                class="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm backdrop-blur-sm"
              >
                <h2 class="text-sm font-semibold text-emerald-600">{{ item.title }}</h2>
                <p class="mt-2 text-sm leading-relaxed text-slate-600">{{ item.description }}</p>
              </div>
            </div>
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

      <section class="w-full max-w-6xl space-y-10 pb-16">
        <header class="text-center">
          <h2 class="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">三步驟，建立專屬心流儀式</h2>
          <p class="mt-3 text-base leading-relaxed text-slate-600">
            FlowNest 將專注流程拆解成清晰步驟，幫助你快速進入狀態並穩定維持。
          </p>
        </header>
        <div class="grid gap-6 md:grid-cols-3">
          <article
            v-for="step in steps"
            :key="step.title"
            class="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-lg shadow-slate-200/40 backdrop-blur-sm"
          >
            <span class="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-500">{{ step.label }}</span>
            <h3 class="mt-3 text-lg font-semibold text-slate-900">{{ step.title }}</h3>
            <p class="mt-3 text-sm leading-relaxed text-slate-600">{{ step.description }}</p>
          </article>
        </div>
      </section>

      <section class="w-full max-w-6xl pb-20">
        <div class="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-8 shadow-xl shadow-emerald-100">
          <div class="grid gap-6 sm:grid-cols-3">
            <div
              v-for="item in stats"
              :key="item.label"
              class="space-y-2 text-center"
            >
              <span class="text-3xl font-black tracking-tight text-emerald-600">{{ item.value }}</span>
              <h4 class="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-500">{{ item.label }}</h4>
              <p class="text-sm leading-relaxed text-emerald-700">{{ item.detail }}</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>
