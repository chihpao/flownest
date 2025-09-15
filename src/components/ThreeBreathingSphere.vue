<!-- cspell:ignore highp mediump metalness clearcoat hemi -->
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import * as THREE from 'three'

const container = ref<HTMLDivElement | null>(null)

// three.js 物件
let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let mainSphere: THREE.Mesh<THREE.SphereGeometry, THREE.MeshPhysicalMaterial> | null = null
let breathingLight: THREE.PointLight | null = null
let zenLight: THREE.PointLight | null = null

// 粒子 / 星塵
let floatingParticles: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> | null = null
let cosmicDust: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> | null = null

// 動畫控制
let raf = 0
let startTime = 0

// 滑鼠互動（容器座標轉 -1~1）
const mousePos = { x: 0, y: 0 }

const getCanvasSize = () => {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const base = Math.min(vw, vh)
  if (vw <= 480) return Math.min(vw - 24, vh * 0.45, 320)
  if (vw <= 768) return Math.min(base * 0.55, 420)
  if (vw <= 1200) return Math.min(base * 0.45, 480)
  return Math.min(base * 0.4, 550)
}

function handleMouseMove (event: MouseEvent) {
  const el = container.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  mousePos.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mousePos.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
}

function handleResize () {
  const el = container.value
  if (!renderer || !camera || !el) return
  const size = getCanvasSize()
  renderer.setSize(size, size)
  camera.aspect = 1
  camera.updateProjectionMatrix()
}

/** 產生圓形 Alpha 紋理（給 PointsMaterial 當 alphaMap） */
function makeCircleAlphaTexture(size = 64): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, size, size)

  const r = size / 2
  const g = ctx.createRadialGradient(r, r, 0, r, r, r)
  // 中央亮、邊緣透明：柔和發光效果
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

/** 漂浮粒子（發光綠色；用自訂 Shader 畫圓點） */
function createFloatingParticles(sceneRef: THREE.Scene) {
  const COUNT = 1200 // 中等密度
  const positions = new Float32Array(COUNT * 3)
  const colors = new Float32Array(COUNT * 3)
  const sizes = new Float32Array(COUNT)
  const randoms = new Float32Array(COUNT)

  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3
    // 分佈在球殼（半徑 1.0~3.0）之間
    const radius = 1.0 + Math.random() * 2.0
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    positions[i3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
    positions[i3 + 2] = radius * Math.cos(phi)

    // 綠色主調（H≈0.33）
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
      precision mediump float;
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vec2 c = gl_PointCoord - vec2(0.5);
        float d = length(c);
        if (d > 0.5) discard;

        float glow = exp(-d * 8.0);
        vec3 color = vColor * (0.6 + glow * 0.8);
        float alpha = vAlpha * (0.65 + glow * 0.35);
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    depthWrite: false
  })

  floatingParticles = new THREE.Points(geo, material)
  sceneRef.add(floatingParticles)
}

/** 星塵（淡綠、用 PointsMaterial + 圓形 alphaMap，避免方塊） */
function createCosmicDust(sceneRef: THREE.Scene) {
  const COUNT = 800
  const positions = new Float32Array(COUNT * 3)
  const colors = new Float32Array(COUNT * 3)

  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3
    // 更外層 3~8
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
    opacity: 0.28,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    sizeAttenuation: true,
    alphaMap: alphaTex,
    depthWrite: false
  })

  cosmicDust = new THREE.Points(geo, mat)
  sceneRef.add(cosmicDust)
}

onMounted(() => {
  const el = container.value
  if (!el) return

  // Renderer
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    premultipliedAlpha: false,
    powerPreference: 'high-performance',
    precision: 'highp'
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  const size = getCanvasSize()
  renderer.setSize(size, size)
  renderer.setClearColor(0x000000, 0)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.2
  renderer.outputColorSpace = THREE.SRGBColorSpace

  // 讓 three.js 的 <canvas> 也跟著圓角 + 填滿容器（修掉方形外露）
  renderer.domElement.className = 'w-full h-full rounded-full block'

  el.appendChild(renderer.domElement)

  // Scene & Camera
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100)
  camera.position.set(0, 0, 9)

  // 主球（會呼吸）
  const sphereGeo = new THREE.SphereGeometry(2.4, 64, 64)
  const sphereMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0x6ea8ff),
    roughness: 0.35,
    metalness: 0.1,
    clearcoat: 0.5,
    transmission: 0,
    emissive: new THREE.Color(0x0f2238),
    emissiveIntensity: 0.25
  })
  mainSphere = new THREE.Mesh(sphereGeo, sphereMat)
  mainSphere.castShadow = false
  mainSphere.receiveShadow = false
  scene.add(mainSphere)

  // 燈光（偏綠）
  const ambient = new THREE.AmbientLight(0x1a2a1a, 0.4)
  scene.add(ambient)

  const hemi = new THREE.HemisphereLight(0x44ff88, 0x224422, 0.45)
  scene.add(hemi)

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.25)
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

  // 粒子與星塵
  createFloatingParticles(scene)
  createCosmicDust(scene)

  // 事件
  el.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('resize', handleResize)

  // 動畫
  startTime = performance.now()

  const loop = () => {
    if (!renderer || !scene || !camera || !mainSphere || !breathingLight || !zenLight) return
    const t = (performance.now() - startTime) / 1000

    // 8 秒呼吸循環
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

    // 主球
    const currentScale = 1 + 0.12 * breathIntensity
    mainSphere.scale.setScalar(currentScale)
    mainSphere.rotation.y += 0.001
    mainSphere.rotation.x = Math.sin(t * 0.2) * 0.05
    mainSphere.position.y = Math.sin(t * 0.15) * 0.08

    const hue = 0.33 + Math.sin(t * 0.06) * 0.05
    mainSphere.material.color.setHSL(hue, 0.7, 0.55)

    // 粒子 uniforms + 旋轉
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

    // 星塵
    if (cosmicDust) {
      cosmicDust.rotation.y += 0.00015
      cosmicDust.rotation.x += 0.00010
      ;(cosmicDust.material as THREE.PointsMaterial).opacity = 0.22 + breathIntensity * 0.10
    }

    // 燈光（綠色系）
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

    // 相機微搖 + 滑鼠跟隨
    camera.position.x = Math.sin(t * 0.08) * 0.15 + mousePos.x * 0.1
    camera.position.y = Math.cos(t * 0.06) * 0.12 + mousePos.y * 0.08
    camera.position.z = 9 + Math.sin(t * 0.05) * 0.1
    camera.lookAt(0, 0, 0)

    renderer.render(scene, camera)
    raf = requestAnimationFrame(loop)
  }

  handleResize()
  raf = requestAnimationFrame(loop)
})

onUnmounted(() => {
  if (raf) cancelAnimationFrame(raf)

  const el = container.value
  if (el) el.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('resize', handleResize)

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
  <!-- 外層容器（純 Tailwind 原子類） -->
  <div
    class="relative mx-auto aspect-square max-w-[550px] rounded-full overflow-hidden bg-transparent z-[2]
           dark:bg-[radial-gradient(circle_at_center,#050510_0%,#000008_100%)]"
  >
    <div ref="container" class="relative w-full h-full rounded-full overflow-hidden z-10
                               shadow-[inset_0_0_120px_rgba(102,170,255,0.25),0_0_80px_rgba(102,170,255,0.3),0_0_160px_rgba(170,119,255,0.2),0_0_240px_rgba(255,136,221,0.15)]">
    </div>
  </div>
</template>
