declare module 'vanta/dist/vanta.waves.min' {
  import { ComponentPublicInstance } from 'vue'
  
  interface VantaWavesSettings {
    el: HTMLElement | string
    THREE: any
    mouseControls?: boolean
    touchControls?: boolean
    gyroControls?: boolean
    minHeight?: number
    minWidth?: number
    scale?: number
    scaleMobile?: number
    color?: number
    shininess?: number
    waveHeight?: number
    waveSpeed?: number
    zoom?: number
    forceAnimate?: boolean
    backgroundColor?: number
    mobile?: boolean
  }

  interface VantaWavesEffect {
    destroy: () => void
    setOptions: (options: Partial<VantaWavesSettings>) => void
  }

  const WAVES: (options: VantaWavesSettings) => VantaWavesEffect
  export default WAVES
}

declare module 'vanta/dist/vanta.waves.min.js' {
  export { default } from 'vanta/dist/vanta.waves.min'
}
