<script setup lang="ts">
const props = withDefaults(defineProps<{
  label?: string
}>(), {
  label: 'Loading…'
})
</script>

<template>
  <div class="loading-overlay">
    <div class="loading-card">
      <div class="spinner-wrap">
        <div class="spinner-core" />
        <div class="spinner-glow" />
      </div>
      <div class="label-wrap">
        <p class="label-main">{{ props.label }}</p>
        <p class="label-sub">請稍候，正在載入視覺效果</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  padding: 1.5rem;
}

.loading-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1.25rem 1.75rem;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow:
    0 24px 42px rgba(16, 185, 129, 0.15),
    0 8px 20px rgba(59, 130, 246, 0.12);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(16, 185, 129, 0.18);
  pointer-events: none;
}

.spinner-wrap {
  position: relative;
  width: 3rem;
  height: 3rem;
}

.spinner-core {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    rgba(16, 185, 129, 0.2),
    rgba(16, 185, 129, 0.8),
    rgba(59, 130, 246, 0.4),
    rgba(16, 185, 129, 0.2)
  );
  animation: spinner-rotate 1.4s linear infinite;
}

.spinner-core::after {
  content: '';
  position: absolute;
  inset: 0.3rem;
  border-radius: 50%;
  background: white;
  box-shadow: inset 0 0 18px rgba(16, 185, 129, 0.18);
}

.spinner-glow {
  position: absolute;
  inset: -0.35rem;
  border-radius: 50%;
  background: radial-gradient(circle at center, rgba(16, 185, 129, 0.45), rgba(16, 185, 129, 0));
  filter: blur(4px);
  opacity: 0.85;
  animation: glow-pulse 2.3s ease-in-out infinite;
}

.label-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  text-align: left;
}

.label-main {
  font-weight: 600;
  font-size: 1rem;
  color: #0f172a;
  letter-spacing: 0.02em;
}

.label-sub {
  font-size: 0.75rem;
  color: rgba(15, 23, 42, 0.55);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

@keyframes spinner-rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes glow-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.85;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.6;
  }
}
</style>
