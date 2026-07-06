import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export type CoreState = 'idle' | 'thinking' | 'listening' | 'speaking'

interface Props {
  size?: number
  state?: CoreState
}

// Dense particle-shell AI sphere, matching the mockup: ~2600 points on a sphere
// surface (fibonacci distribution) + a soft radial bloom core + tilted orbit
// rings + scattered orbiting dots. Fake bloom via additive blending + a
// gradient sprite (no postprocessing pass needed). Reactive to CoreState.
// ponytail: additive-sprite bloom instead of UnrealBloomPass/EffectComposer —
// cheaper, no extra render targets; upgrade to a real bloom pass only if asked.

const ACCENT: Record<CoreState, [number, number, number]> = {
  idle: [0.15, 0.7, 1],
  thinking: [0.1, 0.75, 1],
  listening: [0.2, 0.95, 0.6],
  speaking: [0.5, 0.85, 1]
}
const TARGET: Record<CoreState, number> = { idle: 1, thinking: 1.06, listening: 1.14, speaking: 1.24 }
const SPIN: Record<CoreState, number> = { idle: 1, thinking: 2.2, listening: 1.5, speaking: 1.5 }

function fibonacciSphere(n: number, radius: number): Float32Array {
  const pts = new Float32Array(n * 3)
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const theta = golden * i
    const jitter = 0.97 + Math.random() * 0.06
    pts[i * 3] = Math.cos(theta) * r * radius * jitter
    pts[i * 3 + 1] = y * radius * jitter
    pts[i * 3 + 2] = Math.sin(theta) * r * radius * jitter
  }
  return pts
}

function bloomTexture(): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(220,245,255,1)')
  g.addColorStop(0.25, 'rgba(120,210,255,0.85)')
  g.addColorStop(0.55, 'rgba(40,140,255,0.35)')
  g.addColorStop(1, 'rgba(20,90,220,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(c)
}

function AICore({ size = 320, state = 'idle' }: Props): React.JSX.Element {
  const mountRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef<CoreState>(state)
  stateRef.current = state

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1000)
    camera.position.z = 15
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(size, size)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)

    const group = new THREE.Group()
    scene.add(group)

    // --- particle shell sphere ---
    const shellGeo = new THREE.BufferGeometry()
    shellGeo.setAttribute('position', new THREE.BufferAttribute(fibonacciSphere(2600, 5), 3))
    const shellMat = new THREE.PointsMaterial({
      color: 0x4fc3ff,
      size: 0.075,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    const shell = new THREE.Points(shellGeo, shellMat)
    group.add(shell)

    // --- soft bloom core (gradient sprite) ---
    const bloomTex = bloomTexture()
    const coreMat = new THREE.SpriteMaterial({
      map: bloomTex,
      color: 0x9fe0ff,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    const core = new THREE.Sprite(coreMat)
    core.scale.setScalar(7)
    scene.add(core) // in scene (not group) so it always faces camera, unrotated

    // --- tilted orbit rings ---
    const rings = [0, 1].map((i) => {
      const m = new THREE.Mesh(
        new THREE.TorusGeometry(7 + i * 1.1, 0.02, 8, 140),
        new THREE.MeshBasicMaterial({
          color: 0x3bbcff,
          transparent: true,
          opacity: 0.5,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      )
      m.rotation.x = 1.15 + (i === 0 ? 0 : 0.25)
      m.rotation.y = i * 0.5
      group.add(m)
      return m
    })

    // --- scattered orbiting dots (flat-ish disc) ---
    const dotN = 130
    const dotPos = new Float32Array(dotN * 3)
    const dotR: number[] = []
    const dotA: number[] = []
    for (let i = 0; i < dotN; i++) {
      const r = 6 + Math.random() * 4
      const a = Math.random() * Math.PI * 2
      dotR.push(r)
      dotA.push(a)
      dotPos[i * 3] = Math.cos(a) * r
      dotPos[i * 3 + 1] = (Math.random() - 0.5) * 2.5
      dotPos[i * 3 + 2] = Math.sin(a) * r * 0.5
    }
    const dotGeo = new THREE.BufferGeometry()
    dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPos, 3))
    const dotMat = new THREE.PointsMaterial({
      color: 0x8fd4ff,
      size: 0.12,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    const dots = new THREE.Points(dotGeo, dotMat)
    dots.rotation.x = 1.2
    group.add(dots)

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const col = new THREE.Color(...ACCENT.idle)
    let scale = 1
    let raf = 0
    let t = 0

    const frame = (): void => {
      t += 1
      const s = stateRef.current
      const spin = SPIN[s]
      const pulse = s === 'speaking' || s === 'listening' ? 1 + 0.05 * Math.sin(t * 0.18) : 1
      scale += (TARGET[s] * pulse - scale) * 0.08
      col.lerp(new THREE.Color(...ACCENT[s]), 0.05)

      group.rotation.y += 0.0018 * spin
      group.scale.setScalar(scale)
      shellMat.color.copy(col)
      dotMat.color.copy(col)
      rings.forEach((r, i) => {
        r.rotation.z += (i === 0 ? 0.0035 : -0.0028) * spin
        ;(r.material as THREE.MeshBasicMaterial).color.copy(col)
      })
      // orbit the scattered dots around their disc
      const dpos = dotGeo.getAttribute('position') as THREE.BufferAttribute
      for (let i = 0; i < dotN; i++) {
        dotA[i] += 0.004 * spin
        dpos.setX(i, Math.cos(dotA[i]) * dotR[i])
        dpos.setZ(i, Math.sin(dotA[i]) * dotR[i] * 0.5)
      }
      dpos.needsUpdate = true
      core.scale.setScalar((6.5 + 0.4 * Math.sin(t * 0.05)) * scale)

      renderer.render(scene, camera)
      if (!reduced) raf = requestAnimationFrame(frame)
    }
    frame()

    return () => {
      cancelAnimationFrame(raf)
      renderer.dispose()
      shellGeo.dispose()
      shellMat.dispose()
      dotGeo.dispose()
      dotMat.dispose()
      bloomTex.dispose()
      coreMat.dispose()
      rings.forEach((r) => {
        r.geometry.dispose()
        ;(r.material as THREE.Material).dispose()
      })
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
    }
  }, [size])

  return <div ref={mountRef} className="ai-core" style={{ width: size, height: size }} aria-label="Jojo core" />
}

export default AICore
