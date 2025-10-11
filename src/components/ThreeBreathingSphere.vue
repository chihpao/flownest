<!-- cspell:ignore highp mediump metalness clearcoat hemi -->
<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import LoadingOverlay from '@/components/LoadingOverlay.vue'
import { loadThree } from '@/utils/loadThree'
import type * as THREEType from 'three'

type ThreeModule = typeof THREEType

let THREE!: ThreeModule

const container = ref<HTMLDivElement | null>(null)
const isLoading = ref(true)
const loadError = ref<string | null>(null)

const props = defineProps<{ paletteIndex?: number }>()
let desiredFilterIndex = typeof props.paletteIndex === 'number' ? props.paletteIndex : 0
let rendererReady = false

watch(() => props.paletteIndex, (value) => {
  const total = FILTER_PRESETS.length || 1
  const normalized = ((Math.round(typeof value === 'number' ? value : 0) % total) + total) % total
  desiredFilterIndex = normalized
  if (rendererReady) {
    applyFilter(normalized)
    applyPalette(normalized)
  }
})

// three.js ?件
let renderer: THREEType.WebGLRenderer | null = null
let scene: THREEType.Scene | null = null
let camera: THREEType.PerspectiveCamera | null = null
let mainSphere: THREEType.Mesh<THREEType.SphereGeometry, THREEType.MeshPhysicalMaterial> | null = null
let breathingLight: THREEType.PointLight | null = null
let zenLight: THREEType.PointLight | null = null

// 粒? / ?塵
let floatingParticles: THREEType.Points<THREEType.BufferGeometry, THREEType.ShaderMaterial> | null = null
let cosmicDust: THREEType.Points<THREEType.BufferGeometry, THREEType.PointsMaterial> | null = null

// ?畫?制
let raf = 0
let startTime = 0

// 滑?互?（容?座標? -1~1?
const mousePos = { x: 0, y: 0 }

let resizeObserver: ResizeObserver | null = null

function updateRendererSize() {
  if (!renderer || !camera || !container.value) return
  const width = container.value.clientWidth
  if (!width) return
  const dpr = Math.min(window.devicePixelRatio, 2)
  renderer.setPixelRatio(dpr)
  renderer.setSize(width, width, false)
  camera.aspect = 1
  camera.updateProjectionMatrix()
}

const FILTER_PRESETS = [
  'none',
  'hue-rotate(48deg) saturate(1.08)',
  'hue-rotate(120deg) saturate(1.04)',
  'hue-rotate(200deg) saturate(1.15)',
  'hue-rotate(310deg) saturate(1.12)'
]

const COLOR_PRESETS = [
  {
    background: '#dff3f6',
    fog: '#dff9f6',
    sphere: '#88f0d6',
    emissive: '#38bdf8',
    lightHue: 0.35,
    lightSpread: 0.04,
    zenHue: 0.42,
    zenSpread: 0.06
  },
  {
    background: '#f1f3ff',
    fog: '#e4e8ff',
    sphere: '#a5b4fc',
    emissive: '#60a5fa',
    lightHue: 0.58,
    lightSpread: 0.05,
    zenHue: 0.68,
    zenSpread: 0.07
  },
  {
    background: '#f5f0ff',
    fog: '#ece4ff',
    sphere: '#d8b4fe',
    emissive: '#f472b6',
    lightHue: 0.78,
    lightSpread: 0.05,
    zenHue: 0.88,
    zenSpread: 0.07
  },
  {
    background: '#f0fdfa',
    fog: '#d1fae5',
    sphere: '#6ee7b7',
    emissive: '#22d3ee',
    lightHue: 0.32,
    lightSpread: 0.05,
    zenHue: 0.46,
    zenSpread: 0.06
  },
  {
    background: '#fef7ed',
    fog: '#fde8d1',
    sphere: '#fcd34d',
    emissive: '#fb7185',
    lightHue: 0.08,
    lightSpread: 0.05,
    zenHue: 0.14,
    zenSpread: 0.06
  }
]

const paletteState = {
  lightHue: 0.35,
  lightSpread: 0.04,
  zenHue: 0.42,
  zenSpread: 0.06
}

function applyFilter(value: number) {
  const total = FILTER_PRESETS.length || 1
  const normalized = ((Math.round(value) % total) + total) % total
  desiredFilterIndex = normalized
  if (renderer && renderer.domElement) {
    renderer.domElement.style.filter = FILTER_PRESETS[normalized]
    if (!renderer.domElement.style.transition?.includes('filter')) {
      renderer.domElement.style.transition = (renderer.domElement.style.transition ? renderer.domElement.style.transition + ', ' : '') + 'filter 0.6s ease'
    }
  }
}

function applyPalette(value: number) {
  const total = COLOR_PRESETS.length || 1
  const normalized = ((Math.round(value) % total) + total) % total
  const palette = COLOR_PRESETS[normalized]
  paletteState.lightHue = palette.lightHue
  paletteState.lightSpread = palette.lightSpread
  paletteState.zenHue = palette.zenHue
  paletteState.zenSpread = palette.zenSpread

  if (renderer) {
    renderer.setClearColor(palette.background, 1)
  }
  if (scene && scene.fog) {
    scene.fog.color.set(palette.fog)
  }
  if (mainSphere && mainSphere.material) {
    mainSphere.material.color.set(palette.sphere)
    mainSphere.material.emissive.set(palette.emissive)
  }
}

function handleMouseMove (event: MouseEvent) {
  const el = container.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  mousePos.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mousePos.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
}

/** ???形 Alpha 紋?（給 PointsMaterial ??alphaMap?*/
function makeCircleAlphaTexture(size = 64): THREEType.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, size, size)

  const r = size / 2
  const g = ctx.createRadialGradient(r, r, 0, r, r, r)
  // 中央亮、???：??發????
  g.addColorStop(0.0, 'rgba(255,255,255,1)')
  g.addColorStop(0.5, 'rgba(255,255,255,0.7)')
  g.addColorStop(1.0, 'rgba(255,255,255,0)')

  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(r, r, r, 0, Math.PI * 2)
  ctx.fill()

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  return tex
}

/** 漂浮粒?（發?????自?Shader ??點? */
function createFloatingParticles(sceneRef: THREEType.Scene) {
  const COUNT = 1200 // Particle count for floating points
  const positions = new Float32Array(COUNT * 3)
  const colors = new Float32Array(COUNT * 3)
  const sizes = new Float32Array(COUNT)
  const randoms = new Float32Array(COUNT)

  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3
    // ????殼??? 1.0~3.0）???
    const radius = 1.0 + Math.random() * 2.0
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    positions[i3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
    positions[i3 + 2] = radius * Math.cos(phi)

    // 綠色主調（H??.33?
    const h = 0.33 + (Math.random() - 0.5) * 0.05
    const s = 0.7 + Math.random() * 0.2
    const l = 0.5 + Math.random() * 0.2
    const c = new THREE.Color().setHSL(h, s, l)
    colors[i3] = c.r
    colors[i3 + 1] = c.g
    colors[i3 + 2] = c.b

    sizes[i] = Math.random() * 4 + 2
    randoms[i] = Math.random()
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
  geo.setAttribute('random', new THREE.BufferAttribute(randoms, 1))

  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      breathPhase: { value: 0 },
      mouseInfluence: { value: new THREE.Vector2(0, 0) }
    },
    vertexShader: `
      precision highp float;
      precision highp int;
      
      attribute float size;
      attribute vec3 color;
      attribute float random;
      
      varying vec3 vColor;
      varying float vAlpha;
      
      uniform float time;
      uniform float breathPhase;
      uniform vec2 mouseInfluence;

      void main() {
        vColor = color;
        vec3 pos = position;

        float breathScale = 1.0 + breathPhase * 0.25;
        pos *= breathScale;

        pos.x += sin(time * 0.45 + random * 10.0) * 0.18;
        pos.y += cos(time * 0.60 + random * 15.0) * 0.14;
        pos.z += sin(time * 0.30 + random *  8.0) * 0.10;

        float m = length(mouseInfluence);
        pos.xy += mouseInfluence * 0.25 * exp(-m * 2.0);

        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = size * (380.0 / -mv.z);
        gl_Position = projectionMatrix * mv;

        float pulse = sin(time * 2.0 + random * 20.0) * 0.5 + 0.5;
        float b = breathPhase * 0.6 + 0.2;
        vAlpha = b * (0.30 + pulse * 0.50);
      }
    `,
    fragmentShader: `
      precision highp float;
      precision highp int;
      
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vec2 c = gl_PointCoord - vec2(0.5);
        float d = length(c);
        if (d > 0.5) discard;

        float glow = exp(-d * 8.0);
        vec3 color = vColor * (0.6 + glow * 0.8);
        float alpha = vAlpha * (0.65 + glow * 0.35);
        gl_FragColor = vec4(color, alpha * 0.8);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })

  floatingParticles = new THREE.Points(geo, material)
  sceneRef.add(floatingParticles)
}

/** ?塵（淡綠、用 PointsMaterial + ?形 alphaMap，避?方塊? */
function createCosmicDust(sceneRef: THREEType.Scene) {
  const COUNT = 800
  const positions = new Float32Array(COUNT * 3)
  const colors = new Float32Array(COUNT * 3)

  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3
    // ???3~8
    const radius = 3 + Math.random() * 5
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    positions[i3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
    positions[i3 + 2] = radius * Math.cos(phi)

    const c = new THREE.Color().setHSL(0.33, 0.55, 0.6 + Math.random() * 0.2)
    colors[i3] = c.r
    colors[i3 + 1] = c.g
    colors[i3 + 2] = c.b
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const alphaTex = makeCircleAlphaTexture(64)
  const mat = new THREE.PointsMaterial({
    size: 1.6,
    transparent: true,
    opacity: 0.18,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    sizeAttenuation: true,
    alphaMap: alphaTex,
    depthWrite: false
  })

  cosmicDust = new THREE.Points(geo, mat)
  sceneRef.add(cosmicDust)
}

onMounted(async () => {
  await nextTick()

  const el = container.value
  if (!el) {
    loadError.value = 'Unable to initialize the canvas container.'
    isLoading.value = false
    return
  }

  isLoading.value = true
  loadError.value = null

  try {
    THREE = await loadThree()

    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      premultipliedAlpha: false,
      powerPreference: 'high-performance',
      precision: 'highp'
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(1, 1, false)
    renderer.setClearColor(0x000000, 0)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    renderer.outputColorSpace = THREE.SRGBColorSpace

    renderer.domElement.className = 'w-full h-full rounded-full block'

    el.appendChild(renderer.domElement)
    rendererReady = true
    applyFilter(desiredFilterIndex)
    applyPalette(desiredFilterIndex)

    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100)
    camera.position.set(0, 0, 9)

    const sphereGeo = new THREE.SphereGeometry(2.4, 64, 64)
    const sphereMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0x6ea8ff),
      roughness: 0.2,
      metalness: 0.4,
      clearcoat: 1.0,
      transmission: 0,
      emissive: new THREE.Color(0x0f2238),
      emissiveIntensity: 0.25
    })
    mainSphere = new THREE.Mesh(sphereGeo, sphereMat)
    mainSphere.castShadow = false
    mainSphere.receiveShadow = false
    scene.add(mainSphere)

    const ambient = new THREE.AmbientLight(0x1a2a1a, 0.4)
    scene.add(ambient)

    const hemi = new THREE.HemisphereLight(0x44ff88, 0x224422, 0.45)
    scene.add(hemi)

    const keyLight = new THREE.DirectionalLight(0xfff0dd, 0.7)
    keyLight.position.set(6, 8, 6)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.setScalar(1024)
    keyLight.shadow.camera.near = 0.1
    keyLight.shadow.camera.far = 25
    scene.add(keyLight)

    const backLight = new THREE.DirectionalLight(0x44ffaa, 0.6)
    backLight.position.set(-5, -3, -8)
    scene.add(backLight)

    breathingLight = new THREE.PointLight(0x66ff99, 1.0, 25, 2)
    scene.add(breathingLight)

    zenLight = new THREE.PointLight(0x66ffdd, 0.8, 20, 1.8)
    scene.add(zenLight)

    createFloatingParticles(scene)
    createCosmicDust(scene)

    el.addEventListener('mousemove', handleMouseMove)

    if (!resizeObserver) {
      resizeObserver = new ResizeObserver(() => updateRendererSize())
      resizeObserver.observe(el)
    }
    window.addEventListener('resize', updateRendererSize)

    startTime = performance.now()

    const loop = () => {
      if (!renderer || !scene || !camera || !mainSphere || !breathingLight || !zenLight) return
      const t = (performance.now() - startTime) / 1000

      const breathCycle = 8.0
      const phase = (t % breathCycle) / breathCycle
      let breathIntensity = 0.0
      if (phase < 0.4) {
        const p = phase / 0.4
        breathIntensity = 0.5 * (1.0 - Math.cos(Math.PI * p))
      } else if (phase < 0.5) {
        breathIntensity = 1.0
      } else if (phase < 0.9) {
        const p = (phase - 0.5) / 0.4
        breathIntensity = 1.0 - 0.5 * (1.0 - Math.cos(Math.PI * p))
      } else {
        breathIntensity = 0.0
      }

      const currentScale = 1 + 0.12 * breathIntensity
      mainSphere.scale.setScalar(currentScale)
      mainSphere.rotation.y += 0.001
      mainSphere.rotation.x = Math.sin(t * 0.2) * 0.05
      mainSphere.position.y = Math.sin(t * 0.15) * 0.08

      const hue = 0.33 + Math.sin(t * 0.06) * 0.05
      mainSphere.material.color.setHSL(hue, 0.7, 0.55)

      if (floatingParticles) {
        const mat = floatingParticles.material
        if (mat.uniforms?.time) {
          mat.uniforms.time.value = t
          mat.uniforms.breathPhase.value = breathIntensity
          mat.uniforms.mouseInfluence.value.set(mousePos.x * 0.5, mousePos.y * 0.5)
        }
        floatingParticles.rotation.y += 0.00035
        floatingParticles.rotation.x = Math.sin(t * 0.1) * 0.02
      }

      if (cosmicDust) {
        cosmicDust.rotation.y += 0.00015
        cosmicDust.rotation.x += 0.00010
        ;(cosmicDust.material as THREEType.PointsMaterial).opacity = 0.22 + breathIntensity * 0.10
      }

      const lightRadius = 5 + Math.sin(t * 0.3)
      breathingLight.position.set(
        Math.cos(t * 0.4) * lightRadius,
        Math.sin(t * 0.6) * 3,
        4 + Math.sin(t * 0.2) * 2
      )
      breathingLight.intensity = 0.75 + breathIntensity * 0.65
      breathingLight.color.setHSL(0.35 + Math.sin(t * 0.5) * 0.04, 0.9, 0.6)

      zenLight.position.set(
        -Math.cos(t * 0.35) * 6,
        Math.cos(t * 0.25) * 2,
        -3 + Math.cos(t * 0.4) * 1.5
      )
      zenLight.intensity = 0.55 + breathIntensity * 0.45
      zenLight.color.setHSL(0.42 + Math.cos(t * 0.3) * 0.06, 0.8, 0.7)

      camera.position.x = Math.sin(t * 0.08) * 0.15 + mousePos.x * 0.1
      camera.position.y = Math.cos(t * 0.06) * 0.12 + mousePos.y * 0.08
      camera.position.z = 9 + Math.sin(t * 0.05) * 0.1
      camera.lookAt(0, 0, 0)

      renderer.render(scene, camera)
      raf = requestAnimationFrame(loop)
    }

    updateRendererSize()
    raf = requestAnimationFrame(loop)
  } catch (err) {
    console.error('Failed to initialise Vanta WAVES effect')
    loadError.value = err instanceof Error ? err.message : String(err)
    rendererReady = false
  } finally {
    isLoading.value = false
  }
})
onUnmounted(() => {
  if (raf) cancelAnimationFrame(raf)

  rendererReady = false
  if (renderer && renderer.domElement) {
    renderer.domElement.style.filter = 'none'
  }

  const el = container.value
  if (el) el.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('resize', updateRendererSize)

  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }

  if (renderer) {
    renderer.dispose()
    if (renderer.domElement && renderer.domElement.parentElement) {
      renderer.domElement.parentElement.removeChild(renderer.domElement)
    }
    renderer = null
  }

  if (scene) {
    scene.traverse((obj) => {
      const anyObj = obj as any
      if (anyObj.geometry && anyObj.geometry.dispose) anyObj.geometry.dispose()
      const mat = anyObj.material
      if (Array.isArray(mat)) mat.forEach((m: any) => m && m.dispose && m.dispose())
      else if (mat && mat.dispose) mat.dispose()
    })
  }

  scene = null
  camera = null
  mainSphere = null
  breathingLight = null
  zenLight = null
  floatingParticles = null
  cosmicDust = null
})
</script>

<template>
  <!-- ~he] Tailwind l^ -->
  <div
    class="relative mx-auto aspect-square max-w-[550px] overflow-hidden rounded-full
           bg-[radial-gradient(circle_at_center,#f0faff_0%,#ffffff_100%)] 
           dark:bg-[radial-gradient(circle_at_center,#050510_0%,#000008_100%)]"
  >
    <div
      ref="container"
      class="focus-sphere-container relative z-10 h-full w-full overflow-hidden rounded-full will-change-transform
             shadow-[inset_0_0_120px_rgba(102,170,255,0.25),0_0_80px_rgba(102,170,255,0.3),0_0_160px_rgba(170,119,255,0.2),0_0_240px_rgba(255,136,221,0.15)]"
    >
      <LoadingOverlay v-if="isLoading" label="Preparing focus animation" />
      <div
        v-else-if="loadError"
        class="absolute inset-0 grid place-content-center bg-white/80 text-center text-sm text-emerald-600"
      >
        {{ loadError }}
      </div>
    </div>
  </div>
</template>












