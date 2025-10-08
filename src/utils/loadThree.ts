import type * as ThreeModule from 'three'

let cached: Promise<typeof ThreeModule> | null = null

export function loadThree(): Promise<typeof ThreeModule> {
  if (!cached) {
    cached = import('three') as Promise<typeof ThreeModule>
  }
  return cached
}

export async function ensureThreeOnWindow(): Promise<typeof ThreeModule> {
  const three = await loadThree()
  if (typeof window !== 'undefined') {
    const w = window as typeof window & { THREE?: typeof ThreeModule }
    w.THREE = w.THREE || three
  }
  return three
}
