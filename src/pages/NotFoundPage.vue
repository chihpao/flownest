<template>
  <main class="grid min-h-screen place-content-center bg-gradient-to-b from-white to-emerald-50 px-6 text-center text-slate-700">
    <div class="space-y-4">
      <h1 class="text-3xl font-semibold text-slate-900">找不到頁面</h1>
      <p>這個連結似乎失效了，回到首頁重新探索 FlowNest。</p>
      <router-link
        to="/"
        class="inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400"
      >
        回到首頁
      </router-link>
    </div>
  </main>
</template>
