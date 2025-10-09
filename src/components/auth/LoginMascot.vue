<template>
  <div class="mascot-container" :class="`state-${mood}`">
    <div class="mascot-blob"></div>
    <div class="mascot-body">
      <div class="mascot-face">
        <div class="eye left">
          <span class="pupil"></span>
          <span class="shine"></span>
        </div>
        <div class="eye right">
          <span class="pupil"></span>
          <span class="shine"></span>
        </div>
      </div>
      <div class="mascot-mouth"></div>
      <div class="mascot-hands">
        <span class="hand hand-left"></span>
        <span class="hand hand-right"></span>
      </div>
    </div>
    <div class="sparkles">
      <span></span>
      <span></span>
      <span></span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  mood: 'idle' | 'password' | 'reveal'
}>()
</script>

<style scoped>
.mascot-container {
  --size: clamp(220px, 42vw, 360px);
  --shift-x: 0px;
  --tilt: 0deg;
  --pupil-scale: 1;
  --pupil-x-left: -50%;
  --pupil-y-left: -50%;
  --pupil-x-right: -50%;
  --pupil-y-right: -50%;
  position: relative;
  width: var(--size);
  aspect-ratio: 1 / 1;
  display: grid;
  place-items: center;
  pointer-events: none;
}

.mascot-container.state-password {
  --shift-x: 18px;
  --tilt: 2deg;
  --pupil-x-left: calc(-50% + 26px);
  --pupil-y-left: calc(-50% + 4px);
  --pupil-x-right: calc(-50% + 32px);
  --pupil-y-right: calc(-50% + 3px);
}

.mascot-container.state-reveal {
  --pupil-scale: 1.4;
  --pupil-x-left: calc(-50% + 22px);
  --pupil-y-left: calc(-50% + 2px);
  --pupil-x-right: calc(-50% + 28px);
  --pupil-y-right: calc(-50% + 1px);
}

.mascot-blob {
  width: calc(var(--size) * 0.9);
  height: calc(var(--size) * 0.9);
  border-radius: 46% 54% 52% 48% / 58% 62% 38% 42%;
  background: radial-gradient(circle at 30% 30%, rgba(167, 243, 208, 0.6), rgba(16, 185, 129, 0.15));
  filter: blur(25px);
  transform: translateX(calc(var(--shift-x) * 0.35));
}

.mascot-body {
  position: absolute;
  width: calc(var(--size) * 0.75);
  height: calc(var(--size) * 0.75);
  border-radius: 45% 45% 40% 40% / 60% 60% 40% 40%;
  background: linear-gradient(160deg, #f0fdf4, #d1fae5 65%, #99f6e4);
  box-shadow:
    0 24px 40px rgba(14, 116, 144, 0.18),
    inset 0 2px 5px rgba(255, 255, 255, 0.7);
  display: grid;
  grid-template-rows: auto 1fr;
  place-items: center;
  padding: calc(var(--size) * 0.08);
  transform: translateX(var(--shift-x)) rotate(var(--tilt));
  transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
  animation: float 6s ease-in-out infinite;
}

.mascot-face {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 calc(var(--size) * 0.05);
}

.eye {
  position: relative;
  width: calc(var(--size) * 0.22);
  height: calc(var(--size) * 0.22);
  border-radius: 999px;
  background: white;
  box-shadow:
    inset 0 -2px 4px rgba(30, 64, 175, 0.12),
    0 6px 14px rgba(13, 148, 136, 0.22);
}

.eye .pupil {
  position: absolute;
  top: 50%;
  left: 50%;
  width: calc(var(--size) * 0.09);
  height: calc(var(--size) * 0.09);
  border-radius: 50%;
  background: linear-gradient(145deg, #0f172a, #0f172a);
  transform: translate(var(--pupil-x-left), var(--pupil-y-left)) scale(var(--pupil-scale));
  transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

.eye.right .pupil {
  transform: translate(var(--pupil-x-right), var(--pupil-y-right)) scale(var(--pupil-scale));
}

.eye .shine {
  position: absolute;
  top: 30%;
  left: 35%;
  width: calc(var(--size) * 0.04);
  height: calc(var(--size) * 0.04);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
}

.mascot-container.state-reveal .eye {
  box-shadow:
    inset 0 -2px 4px rgba(30, 64, 175, 0.18),
    0 8px 18px rgba(13, 148, 136, 0.32);
}

.mascot-container.state-idle .eye.left .pupil {
  animation: pupil-drift-left 6s ease-in-out infinite;
}

.mascot-container.state-idle .eye.right .pupil {
  animation: pupil-drift-right 6s ease-in-out infinite;
}

.mascot-mouth {
  margin-top: calc(var(--size) * 0.04);
  width: calc(var(--size) * 0.2);
  height: calc(var(--size) * 0.1);
  border-radius: 0 0 50% 50%;
  background: linear-gradient(180deg, rgba(15, 118, 110, 0.55), rgba(13, 148, 136, 0.75));
  box-shadow: inset 0 -2px 2px rgba(6, 95, 70, 0.3);
  transition: height 0.35s cubic-bezier(0.22, 1, 0.36, 1), border-radius 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.mascot-container.state-reveal .mascot-mouth {
  height: calc(var(--size) * 0.2);
  border-radius: 45% 45% 55% 55%;
  background: linear-gradient(180deg, rgba(13, 148, 136, 0.7), rgba(6, 95, 70, 0.8));
}

.mascot-hands {
  width: 100%;
  margin-top: calc(var(--size) * 0.04);
  display: flex;
  justify-content: space-between;
  padding: 0 calc(var(--size) * 0.08);
}

.hand {
  width: calc(var(--size) * 0.16);
  height: calc(var(--size) * 0.12);
  border-radius: 60% 40% 50% 50%;
  background: linear-gradient(120deg, rgba(16, 185, 129, 0.35), rgba(52, 211, 153, 0.65));
  box-shadow: inset 0 1px 3px rgba(255, 255, 255, 0.6);
  animation: hand-wave 5s ease-in-out infinite;
}

.hand-right {
  transform: scaleX(-1);
  animation-delay: 1.2s;
}

.sparkles {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.sparkles span {
  position: absolute;
  width: calc(var(--size) * 0.08);
  height: calc(var(--size) * 0.08);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(209, 250, 229, 0.9), rgba(110, 231, 183, 0));
  animation: twinkle 6s ease-in-out infinite;
}

.sparkles span:nth-child(1) {
  top: 12%;
  left: 18%;
}

.sparkles span:nth-child(2) {
  top: 8%;
  right: 8%;
  animation-delay: 1.8s;
}

.sparkles span:nth-child(3) {
  bottom: 10%;
  right: 20%;
  animation-delay: 3.1s;
}

@keyframes float {
  0%,
  100% {
    transform: translateX(var(--shift-x)) rotate(var(--tilt)) translateY(0px);
  }
  50% {
    transform: translateX(calc(var(--shift-x) + 4px)) rotate(var(--tilt)) translateY(-12px);
  }
}

@keyframes hand-wave {
  0%,
  100% {
    transform: rotate(0deg) scale(1);
  }
  50% {
    transform: rotate(6deg) scale(1.04);
  }
}

@keyframes twinkle {
  0%,
  100% {
    opacity: 0.2;
    transform: scale(0.5);
  }
  50% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes pupil-drift-left {
  0%,
  100% {
    transform: translate(-50%, -50%) scale(var(--pupil-scale));
  }
  20% {
    transform: translate(calc(-50% + 12px), calc(-50% - 8px)) scale(var(--pupil-scale));
  }
  45% {
    transform: translate(calc(-50% - 10px), calc(-50% + 4px)) scale(var(--pupil-scale));
  }
  70% {
    transform: translate(calc(-50% + 8px), calc(-50% + 6px)) scale(var(--pupil-scale));
  }
}

@keyframes pupil-drift-right {
  0%,
  100% {
    transform: translate(-50%, -50%) scale(var(--pupil-scale));
  }
  20% {
    transform: translate(calc(-50% + 8px), calc(-50% - 6px)) scale(var(--pupil-scale));
  }
  45% {
    transform: translate(calc(-50% - 14px), calc(-50% + 5px)) scale(var(--pupil-scale));
  }
  70% {
    transform: translate(calc(-50% + 10px), calc(-50% + 3px)) scale(var(--pupil-scale));
  }
}

@media (max-width: 640px) {
  .mascot-container {
    --size: clamp(200px, 60vw, 280px);
  }
}
</style>
