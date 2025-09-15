<script setup lang="ts">
// cSpell:ignore highp metalness clearcoat clearcoatRoughness iridescence iridescenceIOR iridescenceThicknessRange sheen sheenRoughness
import { onMounted, onUnmounted, ref } from 'vue'
import * as THREE from 'three'

const container = ref<HTMLDivElement | null>(null)
let renderer: THREE.WebGLRenderer
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let mainSphere: THREE.Mesh
let innerCore: THREE.Mesh
let energyField: THREE.Mesh
let auraRings: THREE.Mesh[] = []
let floatingParticles: THREE.Points
let cosmicDust: THREE.Points
let breathingLight: THREE.PointLight
let zenLight: THREE.PointLight
let raf = 0
let startTime = 0
let mousePos = { x: 0, y: 0 }
let handleMouseMove: ((event: MouseEvent) => void) | null = null
let resizeHandler: (() => void) | null = null

// 音樂可視化頻率數據模擬
let audioFrequencies = new Array(32).fill(0).map(() => Math.random() * 0.3 + 0.1)

onMounted(() => {
  const el = container.value!
  
  // 響應式尺寸計算 - 更精確的適配
  const updateSize = () => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const baseSize = Math.min(vw, vh)
    
    if (vw <= 480) return Math.min(vw - 24, vh * 0.45, 320)
    if (vw <= 768) return Math.min(baseSize * 0.55, 420)
    if (vw <= 1200) return Math.min(baseSize * 0.45, 480)
    return Math.min(baseSize * 0.4, 550)
  }

  let currentSize = updateSize()

  // 頂級渲染器設定
  renderer = new THREE.WebGLRenderer({ 
    antialias: true, 
    alpha: true,
    premultipliedAlpha: false,
    powerPreference: "high-performance",
    precision: "highp"
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(currentSize, currentSize)
  renderer.setClearColor(0x000000, 0)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.4
  renderer.outputColorSpace = THREE.SRGBColorSpace
  el.appendChild(renderer.domElement)

  // 場景與相機
  scene = new THREE.Scene()
  scene.fog = new THREE.Fog(0x0a0a1a, 10, 50)
  camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100)
  camera.position.set(0, 0, 9)

  // 🌟 主要呼吸球 - 液態水晶質感 (美化：更柔和的藍紫色調，增加傳輸率)
  const sphereGeo = new THREE.SphereGeometry(2.4, 128, 128)
  const sphereMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0.35, 0.65, 1.0),
    roughness: 0.2,
    metalness: 0.0,
    transmission: 0.0,
    thickness: 0.0,
    clearcoat: 0.4,
    clearcoatRoughness: 0.1,
    ior: 1.45,
    reflectivity: 0.3,
    iridescence: 0.0,
    sheen: 0.0,
    transparent: false
  })
  mainSphere = new THREE.Mesh(sphereGeo, sphereMat)
  mainSphere.castShadow = true
  mainSphere.receiveShadow = true
  scene.add(mainSphere)

  // 💎 內部能量核心 - 脈動光芒 (美化：增加發光強度，柔和粉紫)
  const coreGeo = new THREE.SphereGeometry(1.4, 64, 64)
  const coreMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(1.0, 0.7, 0.9),
    emissive: new THREE.Color(0.3, 0.1, 0.2),
    roughness: 0.15,
    metalness: 0.0,
    transmission: 0.85,
    thickness: 0.8,
    opacity: 0.7,
    transparent: true,
    clearcoat: 0.8,
    iridescence: 0.4
  })
  innerCore = new THREE.Mesh(coreGeo, coreMat)
  scene.add(innerCore)
  // Hide inner core to avoid double-sphere appearance
  innerCore.visible = false

  // ✨ 能量場 - 外層保護罩 (美化：增加虹彩效果)
  const fieldGeo = new THREE.SphereGeometry(3.2, 96, 96)
  const fieldMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0.4, 0.8, 1.0),
    roughness: 0.1,
    metalness: 0.0,
    transmission: 0.95,
    thickness: 0.3,
    opacity: 0.3,
    transparent: true,
    side: THREE.DoubleSide,
    iridescence: 0.7,
    iridescenceIOR: 1.4
  })
  energyField = new THREE.Mesh(fieldGeo, fieldMat)
  scene.add(energyField)
  // Hide outer energy field to keep a single clean sphere
  energyField.visible = false

  // 🌙 靈氣環圈系統 (美化：增加到7個環，更細膩間距)
  for (let i = 0; i < 7; i++) {
    const ringGeo = new THREE.TorusGeometry(2.8 + i * 0.3, 0.02, 8, 64)
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(0.6 + i * 0.08, 0.8, 0.7),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending
    })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.rotation.x = Math.random() * Math.PI
    ring.rotation.y = Math.random() * Math.PI
    ring.rotation.z = Math.random() * Math.PI
    auraRings.push(ring)
    scene.add(ring)
    // Keep rings hidden for a simpler look
    ring.visible = false
  }

  // ⭐ 浮游粒子 - 高級 Shader 材質 (美化：增加粒子數)
  const particleCount = 1200
  const positions = new Float32Array(particleCount * 3)
  const colors = new Float32Array(particleCount * 3)
  const sizes = new Float32Array(particleCount)
  const randoms = new Float32Array(particleCount)

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3
    const radius = 0.8 + Math.random() * 2.5
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    
    positions[i3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
    positions[i3 + 2] = radius * Math.cos(phi)
    
    const hue = 0.5 + Math.random() * 0.3
    const sat = 0.6 + Math.random() * 0.4
    const lum = 0.4 + Math.random() * 0.6
    const color = new THREE.Color().setHSL(hue, sat, lum)
    colors[i3] = color.r
    colors[i3 + 1] = color.g
    colors[i3 + 2] = color.b
    
    sizes[i] = Math.random() * 4 + 1
    randoms[i] = Math.random()
  }

  const particleGeo = new THREE.BufferGeometry()
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  particleGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
  particleGeo.setAttribute('random', new THREE.BufferAttribute(randoms, 1))

  const particleMat = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      breathPhase: { value: 0 },
      mouseInfluence: { value: new THREE.Vector2(0, 0) }
    },
    vertexShader: `
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
        
        // 呼吸脈動
        float breathScale = 1.0 + breathPhase * 0.3;
        pos *= breathScale;
        
        // 輕柔漂移
        pos.x += sin(time * 0.5 + random * 10.0) * 0.2;
        pos.y += cos(time * 0.7 + random * 15.0) * 0.15;
        pos.z += sin(time * 0.3 + random * 8.0) * 0.1;
        
        // 滑鼠互動
        float mouseDistance = length(mouseInfluence);
        pos.xy += mouseInfluence * 0.3 * exp(-mouseDistance * 2.0);
        
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = size * (400.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
        
        // 動態透明度
        float pulse = sin(time * 2.0 + random * 20.0) * 0.5 + 0.5;
        float breathInfluence = breathPhase * 0.6 + 0.2;
        vAlpha = breathInfluence * (0.3 + pulse * 0.7);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;
      
      void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        
        if (dist > 0.5) discard;
        
        // 柔和的光暈效果
        float intensity = 1.0 - smoothstep(0.0, 0.5, dist);
        float glow = exp(-dist * 8.0);
        
        vec3 finalColor = vColor * (intensity + glow * 0.5);
        float alpha = vAlpha * intensity * (0.8 + glow * 0.2);
        
        gl_FragColor = vec4(finalColor, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    depthWrite: false
  })

  floatingParticles = new THREE.Points(particleGeo, particleMat)
  scene.add(floatingParticles)
  // Hide floating particles to avoid visual overlap around the sphere
  floatingParticles.visible = false

  // 🌌 宇宙塵埃 (美化：增加粒子數)
  const dustCount = 2500
  const dustPos = new Float32Array(dustCount * 3)
  const dustColors = new Float32Array(dustCount * 3)
  const dustSizes = new Float32Array(dustCount)

  for (let i = 0; i < dustCount; i++) {
    const i3 = i * 3
    const radius = 3 + Math.random() * 8
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    
    dustPos[i3] = radius * Math.sin(phi) * Math.cos(theta)
    dustPos[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
    dustPos[i3 + 2] = radius * Math.cos(phi)
    
    const intensity = Math.random() * 0.4 + 0.1
    dustColors[i3] = 0.6 * intensity
    dustColors[i3 + 1] = 0.8 * intensity
    dustColors[i3 + 2] = 1.0 * intensity
    
    dustSizes[i] = Math.random() * 1.5 + 0.5
  }

  const dustGeo = new THREE.BufferGeometry()
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3))
  dustGeo.setAttribute('color', new THREE.BufferAttribute(dustColors, 3))
  dustGeo.setAttribute('size', new THREE.BufferAttribute(dustSizes, 1))

  const dustMat = new THREE.PointsMaterial({
    size: 2,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    sizeAttenuation: true
  })

  cosmicDust = new THREE.Points(dustGeo, dustMat)
  scene.add(cosmicDust)
  // Hide cosmic dust as well
  cosmicDust.visible = false

  // 🌅 夢幻光照系統
  const ambientLight = new THREE.AmbientLight(0x2a1a4a, 0.2)
  scene.add(ambientLight)

  const hemisphereLight = new THREE.HemisphereLight(0x4477ff, 0xff7744, 0.3)
  scene.add(hemisphereLight)

  // 主要輪廓光
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.5)
  keyLight.position.set(6, 8, 6)
  keyLight.castShadow = true
  keyLight.shadow.mapSize.setScalar(2048)
  keyLight.shadow.camera.near = 0.1
  keyLight.shadow.camera.far = 25
  keyLight.shadow.camera.left = keyLight.shadow.camera.bottom = -15
  keyLight.shadow.camera.right = keyLight.shadow.camera.top = 15
  keyLight.shadow.bias = -0.0001
  scene.add(keyLight)

  // 氛圍燈光
  const backLight = new THREE.DirectionalLight(0x6644ff, 0.8)
  backLight.position.set(-5, -3, -8)
  scene.add(backLight)

  // 呼吸燈
  breathingLight = new THREE.PointLight(0xff6699, 1.0, 25, 2)
  breathingLight.castShadow = true
  scene.add(breathingLight)

  // 禪意光源
  zenLight = new THREE.PointLight(0x66ffdd, 0.8, 20, 1.8)
  scene.add(zenLight)

  // 滑鼠互動
  handleMouseMove = (event: MouseEvent) => {
    const rect = el.getBoundingClientRect()
    mousePos.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mousePos.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  }
  el.addEventListener('mousemove', handleMouseMove)

  // 響應式處理
  const onResize = () => {
    const newSize = updateSize()
    if (Math.abs(newSize - currentSize) > 10) {
      currentSize = newSize
      renderer.setSize(currentSize, currentSize)
      camera.aspect = currentSize / currentSize
      camera.updateProjectionMatrix()
    }
  }
  resizeHandler = onResize
  window.addEventListener('resize', resizeHandler)

  // 🎭 終極動畫系統 - 冥想級平靜效果
  startTime = performance.now()
  const loop = () => {
    const t = (performance.now() - startTime) / 1000
    
    // 深度冥想呼吸模式 (8秒週期，4-7-8 技巧)
    const breathCycle = 8.0
    const phase = (t % breathCycle) / breathCycle
    
    let breathIntensity = 0
    let breathState = 'pause'
    
    if (phase < 0.25) { // 4秒吸氣
      const progress = phase / 0.25
      breathIntensity = 0.5 * (1 - Math.cos(Math.PI * progress))
      breathState = 'inhale'
    } else if (phase < 0.4375) { // 1.5秒屏息
      breathIntensity = 1
      breathState = 'hold'
    } else if (phase < 0.9375) { // 4秒呼氣  
      const progress = (phase - 0.4375) / 0.5
      breathIntensity = 1 - 0.5 * (1 - Math.cos(Math.PI * progress))
      breathState = 'exhale'
    } else { // 0.5秒暫停
      breathIntensity = 0
      breathState = 'pause'
    }

    // 🌟 主球體 - 液態呼吸動畫
    const baseScale = 1
    const scaleRange = 0.12
    const currentScale = baseScale + scaleRange * breathIntensity
    
    mainSphere.scale.setScalar(currentScale)
    mainSphere.rotation.y += 0.001
    mainSphere.rotation.x = Math.sin(t * 0.2) * 0.05
    mainSphere.position.y = Math.sin(t * 0.15) * 0.08
    
    // 色彩變化 (美化：更平滑的色相轉移)
    const hue = 0.6 + Math.sin(t * 0.08) * 0.08
    ;(mainSphere.material as THREE.MeshPhysicalMaterial).color.setHSL(hue, 0.8, 0.5)

    // 💎 內核脈動
    innerCore.scale.setScalar(currentScale * 0.9 + Math.sin(t * 3) * 0.02)
    innerCore.rotation.y -= 0.002
    innerCore.rotation.z += 0.0005
    
    // 發光強度變化
    const emissiveIntensity = 0.1 + breathIntensity * 0.15
    ;(innerCore.material as THREE.MeshPhysicalMaterial).emissive.setScalar(emissiveIntensity)

    // ✨ 能量場波動
    energyField.scale.setScalar(currentScale * 1.05)
    energyField.rotation.y += 0.0005
    energyField.rotation.x += 0.0003
    ;(energyField.material as THREE.MeshPhysicalMaterial).opacity = 0.2 + breathIntensity * 0.2

    // 🌙 靈氣環圈舞蹈
    auraRings.forEach((ring, i) => {
      const ringScale = 1 + breathIntensity * 0.15
      ring.scale.setScalar(ringScale)
      ring.rotation.x += (0.001 + i * 0.0002)
      ring.rotation.y += (0.0008 - i * 0.0001)
      ring.rotation.z += (0.0005 + i * 0.0001)
      
      const opacity = breathIntensity * (0.3 + Math.sin(t + i) * 0.2)
      ;(ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, opacity)
    })

    // ⭐ 粒子系統更新
    const particleMaterial = floatingParticles.material as THREE.ShaderMaterial
    particleMaterial.uniforms.time.value = t
    particleMaterial.uniforms.breathPhase.value = breathIntensity
    particleMaterial.uniforms.mouseInfluence.value.set(mousePos.x * 0.5, mousePos.y * 0.5)
    
    floatingParticles.rotation.y += 0.0003
    floatingParticles.rotation.x = Math.sin(t * 0.1) * 0.02

    // 🌌 宇宙塵埃緩慢旋轉
    cosmicDust.rotation.y += 0.0001
    cosmicDust.rotation.x += 0.00008
    ;(cosmicDust.material as THREE.PointsMaterial).opacity = 0.2 + breathIntensity * 0.1

    // 🌅 動態光照
    const lightRadius = 5 + Math.sin(t * 0.3) * 1
    breathingLight.position.set(
      Math.cos(t * 0.4) * lightRadius,
      Math.sin(t * 0.6) * 3,
      4 + Math.sin(t * 0.2) * 2
    )
    breathingLight.intensity = 0.8 + breathIntensity * 0.6
    breathingLight.color.setHSL(0.85 + Math.sin(t * 0.5) * 0.1, 0.9, 0.6)

    zenLight.position.set(
      -Math.cos(t * 0.35) * 6,
      Math.cos(t * 0.25) * 2,
      -3 + Math.cos(t * 0.4) * 1.5
    )
    zenLight.intensity = 0.6 + breathIntensity * 0.4
    zenLight.color.setHSL(0.5 + Math.cos(t * 0.3) * 0.15, 0.8, 0.7)

    // 📷 相機微動 - 冥想般的漂浮感
    camera.position.x = Math.sin(t * 0.08) * 0.15 + mousePos.x * 0.1
    camera.position.y = Math.cos(t * 0.06) * 0.12 + mousePos.y * 0.08
    camera.position.z = 9 + Math.sin(t * 0.05) * 0.1
    camera.lookAt(
      Math.sin(t * 0.03) * 0.05,
      Math.cos(t * 0.04) * 0.03,
      0
    )

    renderer.render(scene, camera)
    raf = requestAnimationFrame(loop)
  }
  
  raf = requestAnimationFrame(loop)
})

onUnmounted(() => {
  if (raf) cancelAnimationFrame(raf)
  if (container.value && handleMouseMove) {
    container.value.removeEventListener('mousemove', handleMouseMove)
  }
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
  }
  
  if (renderer) {
    renderer.dispose()
    if (container.value) {
      renderer.domElement.remove()
    }
  }
  
  // 深度清理
  scene?.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
      object.geometry.dispose()
      if (Array.isArray(object.material)) {
        object.material.forEach(mat => mat.dispose())
      } else {
        object.material.dispose()
      }
    }
  })
})
</script>

<template>
  <div class="zen-sphere-universe">
    <div class="cosmic-background"></div>
    <div class="aurora-effect"></div>
    <div class="ripple ripple-1"></div>
    <div class="ripple ripple-2"></div>
    <div ref="container" class="meditation-sphere"></div>
    <div class="sacred-geometry">
      <div class="mandala-ring ring-1"></div>
      <div class="mandala-ring ring-2"></div>
      <div class="mandala-ring ring-3"></div>
      <div class="mandala-ring ring-4"></div>
    </div>
    <div class="energy-waves">
      <div class="wave wave-1"></div>
      <div class="wave wave-2"></div>
      <div class="wave wave-3"></div>
    </div>
    <div class="spiritual-glow"></div>
    <div class="lotus-reflection"></div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400&display=swap');

.zen-sphere-universe {
  position: relative;
  width: 100%;
  max-width: 550px;
  margin-left: auto;
  margin-right: auto;
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 9999px;
  font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', sans-serif;
  background: transparent;
}

.cosmic-background { display: none; }

.aurora-effect { display: none; }

.ripple {
  position: absolute;
  border-radius: 9999px;
}

.ripple-1 {
  inset: -20%;
  background: radial-gradient(
    circle at center,
    transparent 40%,
    rgba(102, 170, 255, 0.06) 60%,
    rgba(170, 119, 255, 0.04) 80%,
    transparent 100%
  );
  animation: rippleEffect 8s ease-in-out infinite;
}

.ripple-2 {
  inset: -30%;
  background: radial-gradient(
    circle at center,
    transparent 50%,
    rgba(255, 136, 221, 0.05) 70%,
    rgba(102, 255, 221, 0.03) 90%,
    transparent 100%
  );
  animation: rippleEffect 8s ease-in-out infinite 4s;
}

.meditation-sphere {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 9999px;
  overflow: hidden;
  z-index: 10;
  box-shadow: 
    inset 0 0 120px rgba(102, 170, 255, 0.18),
    0 0 80px rgba(102, 170, 255, 0.25),
    0 0 160px rgba(170, 119, 255, 0.15),
    0 0 240px rgba(255, 136, 221, 0.1);
}

.meditation-sphere canvas {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: inherit;
}

/* Removed pseudo border glow to avoid a second halo/sphere */

.sacred-geometry {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  pointer-events: none;
}

.mandala-ring {
  position: absolute;
  border: 1px solid transparent;
  border-radius: 9999px;
  background: conic-gradient(from 0deg, transparent, rgba(255, 255, 255, 0.12), transparent);
  animation: mandalaRotate 60s linear infinite;
}

.ring-1 {
  inset: 10%;
  animation-duration: 45s;
  animation-direction: reverse;
  opacity: 0.7;
}

.ring-2 {
  inset: 20%;
  animation-duration: 55s;
  opacity: 0.5;
}

.ring-3 {
  inset: 30%;
  animation-duration: 65s;
  animation-direction: reverse;
  opacity: 0.4;
}

.ring-4 {
  inset: 40%;
  animation-duration: 75s;
  opacity: 0.3;
}

.energy-waves {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  pointer-events: none;
}

.wave {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  border: 2px solid transparent;
  border-radius: 9999px;
  opacity: 0;
  animation: energyWave 8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.wave-1 {
  border-color: rgba(102, 170, 255, 0.35);
  animation-delay: 0s;
}

.wave-2 {
  border-color: rgba(170, 119, 255, 0.3);
  animation-delay: 2.67s;
}

.wave-3 {
  border-color: rgba(255, 136, 221, 0.25);
  animation-delay: 5.33s;
}

.spiritual-glow {
  position: absolute;
  top: -40%;
  right: -40%;
  bottom: -40%;
  left: -40%;
  border-radius: 9999px;
  background: radial-gradient(
    circle at center,
    rgba(102, 170, 255, 0.1) 0%,
    rgba(170, 119, 255, 0.08) 30%,
    rgba(255, 136, 221, 0.06) 50%,
    rgba(102, 255, 221, 0.05) 70%,
    transparent 100%
  );
  filter: blur(60px) saturate(1.8);
  animation: spiritualBreathing 8s ease-in-out infinite;
}

.lotus-reflection {
  position: absolute;
  top: 25%;
  right: 25%;
  bottom: 25%;
  left: 25%;
  border-radius: 9999px;
  background: 
    radial-gradient(ellipse at 35% 25%, rgba(255, 255, 255, 0.5) 0%, transparent 40%),
    radial-gradient(ellipse at 65% 35%, rgba(255, 255, 255, 0.25) 0%, transparent 50%);
  filter: blur(15px);
  opacity: 0.8;
  animation: reflectionShimmer 12s ease-in-out infinite;
}

/* Simplify visuals: hide busy overlay effects around the sphere */
.sacred-geometry,
.energy-waves,
.ripple,
.spiritual-glow,
.lotus-reflection {
  display: none;
}

/* 🌟 關鍵動畫效果 */
@keyframes spherePulse {
  0%, 100% { 
    transform: scale(1);
    box-shadow: 
      inset 0 0 120px rgba(102, 170, 255, 0.18),
      0 0 80px rgba(102, 170, 255, 0.25),
      0 0 160px rgba(170, 119, 255, 0.15),
      0 0 240px rgba(255, 136, 221, 0.1);
  }
  25% { 
    transform: scale(1.05);
    box-shadow: 
      inset 0 0 150px rgba(102, 170, 255, 0.28),
      0 0 120px rgba(102, 170, 255, 0.35),
      0 0 200px rgba(170, 119, 255, 0.2),
      0 0 300px rgba(255, 136, 221, 0.15);
  }
  37.5% { 
    transform: scale(1.08);
    box-shadow: 
      inset 0 0 180px rgba(102, 170, 255, 0.35),
      0 0 140px rgba(102, 170, 255, 0.4),
      0 0 220px rgba(170, 119, 255, 0.25),
      0 0 320px rgba(255, 136, 221, 0.18);
  }
  75% { 
    transform: scale(1.02);
    box-shadow: 
      inset 0 0 100px rgba(102, 170, 255, 0.22),
      0 0 90px rgba(102, 170, 255, 0.3),
      0 0 180px rgba(170, 119, 255, 0.18),
      0 0 260px rgba(255, 136, 221, 0.12);
  }
}

@keyframes cosmicDrift {
  0% { transform: rotate(0deg) scale(1); }
  25% { transform: rotate(90deg) scale(1.05); }
  50% { transform: rotate(180deg) scale(1); }
  75% { transform: rotate(270deg) scale(1.03); }
  100% { transform: rotate(360deg) scale(1); }
}

@keyframes auroraRotation {
  0% { transform: rotate(0deg); opacity: 0.6; }
  25% { opacity: 0.9; }
  50% { transform: rotate(180deg); opacity: 1; }
  75% { opacity: 0.8; }
  100% { transform: rotate(360deg); opacity: 0.6; }
}

@keyframes mandalaRotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes energyWave {
  0% { 
    transform: scale(0.8);
    opacity: 0;
  }
  10% { 
    opacity: 0.7;
  }
  50% { 
    transform: scale(1.3);
    opacity: 0.4;
  }
  100% { 
    transform: scale(2);
    opacity: 0;
  }
}

@keyframes spiritualBreathing {
  0%, 100% { 
    transform: scale(1);
    opacity: 0.6;
    filter: blur(60px) saturate(1.8) hue-rotate(0deg);
  }
  25% { 
    transform: scale(1.15);
    opacity: 1;
    filter: blur(70px) saturate(2.2) hue-rotate(30deg);
  }
  37.5% { 
    transform: scale(1.2);
    opacity: 1.2;
    filter: blur(80px) saturate(2.4) hue-rotate(45deg);
  }
  75% { 
    transform: scale(1.05);
    opacity: 0.8;
    filter: blur(65px) saturate(2) hue-rotate(15deg);
  }
}

@keyframes reflectionShimmer {
  0%, 100% { 
    opacity: 0.8;
    transform: rotate(0deg) scale(1);
  }
  33% { 
    opacity: 1;
    transform: rotate(120deg) scale(1.05);
  }
  66% { 
    opacity: 0.9;
    transform: rotate(240deg) scale(1.02);
  }
}

@keyframes rippleEffect {
  0%, 100% { 
    transform: scale(1);
    opacity: 0.3;
  }
  25% { 
    transform: scale(1.1);
    opacity: 0.7;
  }
  37.5% { 
    transform: scale(1.15);
    opacity: 0.9;
  }
  75% { 
    transform: scale(1.05);
    opacity: 0.5;
  }
}

@keyframes borderGlow {
  0% { transform: rotate(0deg); opacity: 0.6; }
  50% { opacity: 1; }
  100% { transform: rotate(360deg); opacity: 0.6; }
}

/* 📱 手機端優化 */
@media (max-width: 480px) {
  .zen-sphere-universe {
    max-width: calc(100vw - 24px);
    min-width: 200px;
  }
  
  .meditation-sphere {
    box-shadow: 
      inset 0 0 60px rgba(102, 170, 255, 0.18),
      0 0 40px rgba(102, 170, 255, 0.25),
      0 0 80px rgba(170, 119, 255, 0.15);
  }
  
  .cosmic-background,
  .aurora-effect {
    inset: -20%;
    filter: blur(20px);
  }
  
  .spiritual-glow {
    inset: -20%;
    filter: blur(30px) saturate(1.8);
  }
  
  .mandala-ring {
    border-width: 0.5px;
  }
  
  .wave {
    border-width: 1px;
  }
}

/* 📟 平板端優化 */
@media (min-width: 481px) and (max-width: 768px) {
  .zen-sphere-universe {
    max-width: 420px;
  }
  
  .cosmic-background,
  .aurora-effect {
    inset: -25%;
    filter: blur(25px);
  }
  
  .spiritual-glow {
    filter: blur(40px) saturate(1.8);
  }
}

/* 💻 大螢幕優化 */
@media (min-width: 1200px) {
  .zen-sphere-universe {
    max-width: 550px;
  }
  
  .meditation-sphere {
    box-shadow: 
      inset 0 0 150px rgba(102, 170, 255, 0.22),
      0 0 100px rgba(102, 170, 255, 0.3),
      0 0 200px rgba(170, 119, 255, 0.18),
      0 0 300px rgba(255, 136, 221, 0.12);
  }
  
  .cosmic-background,
  .aurora-effect {
    filter: blur(50px);
  }
  
  .spiritual-glow {
    filter: blur(80px) saturate(2);
  }
}

/* 🌙 深色模式增強 */
@media (prefers-color-scheme: dark) {
  .zen-sphere-universe {
    background: radial-gradient(circle at center, #050510 0%, #000008 100%);
  }
  
  .meditation-sphere {
    box-shadow: 
      inset 0 0 120px rgba(102, 170, 255, 0.25),
      0 0 80px rgba(102, 170, 255, 0.3),
      0 0 160px rgba(170, 119, 255, 0.2),
      0 0 240px rgba(255, 136, 221, 0.15);
  }
  
  .cosmic-background {
    background: 
      radial-gradient(circle at 20% 30%, rgba(102, 170, 255, 0.25) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(170, 119, 255, 0.22) 0%, transparent 50%),
      radial-gradient(circle at 40% 80%, rgba(255, 136, 221, 0.18) 0%, transparent 50%),
      radial-gradient(circle at 60% 70%, rgba(102, 255, 221, 0.15) 0%, transparent 50%);
  }
}

/* 🎨 高對比度模式 */
@media (prefers-contrast: high) {
  .meditation-sphere {
    box-shadow: 
      inset 0 0 120px rgba(102, 170, 255, 0.35),
      0 0 80px rgba(102, 170, 255, 0.45);
  }
  
  .mandala-ring,
  .wave {
    opacity: 0.9;
  }
}

/* ⚡ 動畫減少模式 */
@media (prefers-reduced-motion: reduce) {
  .cosmic-background,
  .aurora-effect,
  .mandala-ring,
  .spiritual-glow,
  .lotus-reflection {
    animation-duration: 60s;
  }
  
  .wave {
    animation: none;
  }
  
  .ripple-1,
  .ripple-2 {
    animation: none;
  }
}

/* 🎯 觸控設備優化 */
@media (hover: none) and (pointer: coarse) {
  .zen-sphere-universe {
    cursor: default;
  }
  
  .meditation-sphere {
    transform: scale(0.95);
    transition-property: transform;
    transition-duration: 300ms;
    transition-timing-function: ease-in-out;
  }
  
  .zen-sphere-universe:active .meditation-sphere {
    transform: scale(1.02);
  }
}

/* 🔥 高性能設備增強 */
@supports (backdrop-filter: blur(10px)) {
  .lotus-reflection {
    backdrop-filter: blur(5px) saturate(1.3);
  }
  
  .mandala-ring {
    backdrop-filter: blur(2px);
  }
}
</style>
