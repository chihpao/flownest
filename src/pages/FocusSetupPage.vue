<script setup lang="ts">
import { ref, computed } from 'vue'
import TimePill from '@/components/TimePill.vue'
import PrimaryButton from '@/components/PrimaryButton.vue'
import BgmControl from '@/components/BgmControl.vue'
import { useBgm } from '@/components/useBgm'
const choices = [30, 45, 60]
const selected = ref<number | null>(null)
const handleSelect = (m: number) => { selected.value = m }

// 自訂分鐘輸入（即時驗證 + Start 直接採用）
const custom = ref<string>('')
const customNumber = computed(() => {
  const n = Number(custom.value)
  return Number.isFinite(n) ? Math.round(n) : NaN
})
const isCustomValid = computed(() => custom.value !== '' && customNumber.value >= 1 && customNumber.value <= 300)
const effective = computed<number | null>(() => {
  if (isCustomValid.value) return customNumber.value
  return selected.value ?? null
})

// Ensure audio starts under direct user gesture when pressing Start
const { play: playBgm } = useBgm()
const onStartClick = () => {
  try { playBgm() } catch {}
}
</script>

<template>
  <main class="min-h-screen grid place-items-center p-6 bg-gradient-to-b from-white to-blue-50 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] relative">
    <div class="absolute top-4 right-4 z-20">
      <BgmControl />
    </div>
    <section class="w-full max-w-[520px] space-y-6 sm:space-y-8">
      <header class="space-y-1.5 sm:space-y-2 text-center">
        <h2 class="text-2xl md:text-3xl font-semibold tracking-wide">Choose Focus Time</h2>
        <p class="text-gray-500 text-sm leading-relaxed tracking-wide">Pick a session length to begin</p>
      </header>

      <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
        <TimePill
          v-for="m in choices"
          :key="m"
          :label="String(m)"
          :active="!isCustomValid && selected===m"
          @click="handleSelect(m)"
        />
        <!-- 自訂：與 pill 同尺寸、並排顯示 -->
        <div>
          <input
            v-model="custom"
            type="number"
            inputmode="numeric"
            placeholder="自訂"
            min="1"
            max="300"
            class="w-full py-3 rounded-full border text-lg transition bg-white text-center
                   focus:outline-none focus:ring-2 hover:shadow-sm active:scale-[0.99]"
            :class="isCustomValid ? 'border-blue-500 text-blue-700 bg-blue-50 focus:ring-blue-400' : 'border-gray-300 text-gray-800 focus:ring-blue-400'"
          />
        </div>
      </div>

      <div class="pt-2">
        <PrimaryButton
          label="Start"
          :disabled="!effective"
          :to="effective ? { path: '/timer', query: { m: effective } } : undefined"
          @click="onStartClick"
        />
        <p class="mt-2 text-center text-sm text-gray-500 leading-relaxed tracking-wide">
          <span v-if="!effective">Select or enter minutes to continue</span>
          <span v-else>Ready to start a {{ effective }} min session</span>
        </p>
      </div>
    </section>
  </main>
  
</template>
