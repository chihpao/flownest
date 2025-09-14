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
let halo1: THREE.Mesh | null = null
let halo2: THREE.Mesh | null = null

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
  const geo = new THREE.SphereGeometry(2, 128, 128)
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0x6fa8ff,
    roughness: 0.18,
    metalness: 0.2,
    clearcoat: 0.7,
    clearcoatRoughness: 0.25,
    sheen: 0.35,
    sheenColor: new THREE.Color(0x9cc6ff),
    envMapIntensity: 0.6,
  })
  sphere = new THREE.Mesh(geo, mat)
  scene.add(sphere)

  // Soft additive halos to emphasize breathing
  const haloGeo = new THREE.SphereGeometry(2.05, 64, 64)
  const haloMat1 = new THREE.MeshBasicMaterial({
    color: 0x9ec5ff,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const haloMat2 = new THREE.MeshBasicMaterial({
    color: 0xffa7d4,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  halo1 = new THREE.Mesh(haloGeo, haloMat1)
  halo2 = new THREE.Mesh(haloGeo, haloMat2)
  scene.add(halo1)
  scene.add(halo2)

  // Lights
  const hemi = new THREE.HemisphereLight(0x99bbff, 0xf0f4ff, 0.6)
  scene.add(hemi)

  const dir = new THREE.DirectionalLight(0xffffff, 0.85)
  dir.position.set(5, 6, 5)
  scene.add(dir)

  const fill = new THREE.PointLight(0x88bbff, 0.45)
  fill.position.set(-3, -2, 4)
  scene.add(fill)

  // A soft moving light to add life
  movingLight = new THREE.PointLight(0xff88cc, 0.32, 20)
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

  // Animate: natural breathing with halo pulse and gentle sway
  startTime = performance.now()
  const loop = () => {
    const t = (performance.now() - startTime) / 1000
    // Breathing curve: slower inhale, slower exhale, smooth in/out
    const period = 9.0 // seconds per full breath
    const ph = (t % period) / period
    // piecewise ease in/out (easeInOutSine) to simulate inhale/exhale
    const ease = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * x)
    // hold fractions
    const inhale = 0.42
    const topHold = 0.08
    const exhale = 0.42
    let breath = 0
    if (ph < inhale) {
      breath = ease(ph / inhale)
    } else if (ph < inhale + topHold) {
      breath = 1
    } else if (ph < inhale + topHold + exhale) {
      const x = (ph - inhale - topHold) / exhale
      breath = 1 - ease(x)
    } else {
      breath = 0
    }

    const baseScale = 1
    const amp = 0.06
    const s = baseScale + amp * breath
    sphere.scale.setScalar(s)
    sphere.rotation.y += 0.0035
    sphere.position.y = 0.06 * Math.sin((2 * Math.PI * t) / period)

    // Halo pulse
    if (halo1 && halo2) {
      const h1 = halo1 as THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>
      const h2 = halo2 as THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>
      const hScale = 1.0 + 0.08 * breath
      h1.scale.setScalar(hScale * 1.06)
      h2.scale.setScalar(hScale * 1.14)
      h1.material.opacity = 0.12 * breath
      h2.material.opacity = 0.09 * (1 - Math.abs(0.5 - ph) * 2) // peak mid-cycle
    }

    const radius = 3.4
    movingLight.position.set(
      Math.cos(t * 0.5) * radius,
      Math.sin(t * 0.7) * 1.1,
      3.1 + Math.sin(t * 0.5)
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
    halo1?.geometry.dispose()
    halo2?.geometry.dispose()
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
