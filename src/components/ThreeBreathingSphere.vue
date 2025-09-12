<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import * as THREE from 'three'

const container = ref<HTMLDivElement | null>(null)
let renderer: THREE.WebGLRenderer
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let sphere: THREE.Mesh
let raf = 0
let startTime = 0

onMounted(() => {
  const el = container.value!
  const rect = el.getBoundingClientRect()
  const w = Math.max(1, Math.floor(rect.width || el.clientWidth || 300))
  const h = Math.max(1, Math.floor(rect.height || rect.width || el.clientWidth || 300))

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(w, h)
  el.appendChild(renderer.domElement)

  // Scene & Camera
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100)
  camera.position.set(0, 0, 6)

  // Geometry & Material（帶細微顆粒粗糙度，視覺更柔）
  const geo = new THREE.SphereGeometry(2, 64, 64)
  const mat = new THREE.MeshStandardMaterial({
    color: 0x6aa8ff,
    roughness: 0.35,
    metalness: 0.1,
    envMapIntensity: 0.6,
  })
  sphere = new THREE.Mesh(geo, mat)
  scene.add(sphere)

  // Lights
  const dir = new THREE.DirectionalLight(0xffffff, 1.0)
  dir.position.set(5, 5, 5)
  scene.add(dir)

  const fill = new THREE.PointLight(0x88bbff, 0.6)
  fill.position.set(-3, -2, 4)
  scene.add(fill)

  // Responsive
  const onResize = () => {
    const r = el.getBoundingClientRect()
    const w2 = Math.max(1, Math.floor(r.width || el.clientWidth))
    const h2 = Math.max(1, Math.floor(r.height || w2))
    camera.aspect = w2 / h2
    camera.updateProjectionMatrix()
    renderer.setSize(w2, h2)
  }
  window.addEventListener('resize', onResize)

  // Animate（呼吸：每 6 秒一個循環，0.95~1.05 之間）
  startTime = performance.now()
  const loop = () => {
    const t = (performance.now() - startTime) / 1000
    const scale = 1 + 0.05 * Math.sin((2 * Math.PI * t) / 6)
    sphere.scale.setScalar(scale)
    sphere.rotation.y += 0.003
    renderer.render(scene, camera)
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)

  onUnmounted(() => {
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', onResize)
    renderer.dispose()
    geo.dispose()
    mat.dispose()
  })
})
</script>

<template>
  <div ref="container" class="w-full aspect-square min-h-[220px] rounded-full overflow-hidden"></div>
  
</template>

<style scoped>
/* 可選：讓容器有淡淡的內陰影，營造深邃感 */
div {
  box-shadow: inset 0 0 60px rgba(0,0,0,.08);
}
</style>
