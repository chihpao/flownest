<script setup lang="ts">
defineSlots<{
  header?: () => unknown
  default?: () => unknown
  footer?: () => unknown
}>()
</script>

<template>
  <section class="card overflow-hidden">
    <header v-if="$slots.header" class="border-b border-ink-100/70 px-6 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-ink-500">
      <slot name="header" />
    </header>

    <div class="px-6 py-5">
      <slot />
    </div>

    <footer v-if="$slots.footer" class="border-t border-ink-100/70 px-6 py-4 text-sm text-ink-500">
      <slot name="footer" />
    </footer>
  </section>
</template>
