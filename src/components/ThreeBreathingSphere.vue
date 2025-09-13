<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import * as THREE from 'three'

const container = ref<HTMLDivElement | null>(null)
let renderer: THREE.WebGLRenderer
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let sphere: THREE.Mesh
let movingLight: THREE.PointLight
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

  // Geometry & Material: subtle glossy, soft sheen
  const geo = new THREE.SphereGeometry(2, 96, 96)
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0x7aa2ff,
    roughness: 0.2,
    metalness: 0.25,
    clearcoat: 0.6,
    clearcoatRoughness: 0.3,
    sheen: 0.3,
    sheenColor: new THREE.Color(0x99ccff),
    envMapIntensity: 0.7,
  })
  sphere = new THREE.Mesh(geo, mat)
  scene.add(sphere)

  // Lights
  const hemi = new THREE.HemisphereLight(0x99bbff, 0xf0f4ff, 0.6)
  scene.add(hemi)

  const dir = new THREE.DirectionalLight(0xffffff, 0.9)
  dir.position.set(5, 6, 5)
  scene.add(dir)

  const fill = new THREE.PointLight(0x88bbff, 0.5)
  fill.position.set(-3, -2, 4)
  scene.add(fill)

  // A soft moving light to add life
  movingLight = new THREE.PointLight(0xff88cc, 0.35, 20)
  scene.add(movingLight)

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

  // Animate: 6s breathing with light orbit and gentle sway
  startTime = performance.now()
  const loop = () => {
    const t = (performance.now() - startTime) / 1000
    const scale = 1 + 0.05 * Math.sin((2 * Math.PI * t) / 6)
    sphere.scale.setScalar(scale)
    sphere.rotation.y += 0.004
    sphere.position.y = 0.05 * Math.sin((2 * Math.PI * t) / 6)

    const radius = 3.5
    movingLight.position.set(
      Math.cos(t * 0.6) * radius,
      Math.sin(t * 0.8) * 1.2,
      3 + Math.sin(t * 0.6)
    )

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
  <div ref="container" class="w-full aspect-square min-h-[220px] rounded-full overflow-hidden sphere-wrap"></div>
  
</template>

<style scoped>
/* Subtle inner shadow and soft ambient glow background */
.sphere-wrap {
  position: relative;
  box-shadow: inset 0 0 60px rgba(0,0,0,.08);
}
.sphere-wrap::after {
  content: '';
  position: absolute;
  inset: 8%;
  border-radius: 9999px;
  background: radial-gradient(35% 35% at 50% 35%, rgba(123,171,255,0.30), rgba(255,255,255,0) 70%),
              radial-gradient(60% 60% at 60% 70%, rgba(255,170,210,0.20), rgba(255,255,255,0) 70%);
  filter: blur(12px) saturate(1.1);
  pointer-events: none;
}
</style>
