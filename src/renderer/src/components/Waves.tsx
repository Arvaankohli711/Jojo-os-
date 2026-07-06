import { useEffect, useRef } from 'react'
import { createNoise2D } from 'simplex-noise'

interface Point {
  x: number
  y: number
  wave: { x: number; y: number }
  cursor: { x: number; y: number; vx: number; vy: number }
}

interface WavesProps {
  className?: string
  strokeColor?: string
}

// Animated line-field background. Adapted from the reference Waves component:
// dropped the Next 'use client' + pointer dot, made the SVG transparent so the
// app's radial gradient shows through, and widened the point gaps.
// ponytail: gap 26px (not the source's 8px) — a persistent full-screen SVG at
// 8px is ~180 paths × 110 pts redrawn at 60fps and pegs the CPU. Tune down if
// you want it denser and can spare the frames.
export function Waves({
  className = '',
  strokeColor = 'rgba(0, 217, 255, 0.16)'
}: WavesProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const mouseRef = useRef({
    x: -10,
    y: 0,
    lx: 0,
    ly: 0,
    sx: 0,
    sy: 0,
    v: 0,
    vs: 0,
    a: 0,
    set: false
  })
  const pathsRef = useRef<SVGPathElement[]>([])
  const linesRef = useRef<Point[][]>([])
  const noiseRef = useRef<((x: number, y: number) => number) | null>(null)
  const rafRef = useRef<number | null>(null)
  const boundingRef = useRef<DOMRect | null>(null)

  useEffect(() => {
    // Respect reduced-motion: render nothing animated.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!containerRef.current || !svgRef.current) return

    noiseRef.current = createNoise2D()

    const setSize = (): void => {
      if (!containerRef.current || !svgRef.current) return
      boundingRef.current = containerRef.current.getBoundingClientRect()
      const { width, height } = boundingRef.current
      svgRef.current.style.width = `${width}px`
      svgRef.current.style.height = `${height}px`
    }

    const setLines = (): void => {
      if (!svgRef.current || !boundingRef.current) return
      const { width, height } = boundingRef.current
      linesRef.current = []
      pathsRef.current.forEach((p) => p.remove())
      pathsRef.current = []

      const xGap = 26
      const yGap = 26
      const oWidth = width + 200
      const oHeight = height + 30
      const totalLines = Math.ceil(oWidth / xGap)
      const totalPoints = Math.ceil(oHeight / yGap)
      const xStart = (width - xGap * totalLines) / 2
      const yStart = (height - yGap * totalPoints) / 2

      for (let i = 0; i < totalLines; i++) {
        const points: Point[] = []
        for (let j = 0; j < totalPoints; j++) {
          points.push({
            x: xStart + xGap * i,
            y: yStart + yGap * j,
            wave: { x: 0, y: 0 },
            cursor: { x: 0, y: 0, vx: 0, vy: 0 }
          })
        }
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        path.setAttribute('fill', 'none')
        path.setAttribute('stroke', strokeColor)
        path.setAttribute('stroke-width', '1')
        svgRef.current.appendChild(path)
        pathsRef.current.push(path)
        linesRef.current.push(points)
      }
    }

    const updateMouse = (x: number, y: number): void => {
      if (!boundingRef.current) return
      const mouse = mouseRef.current
      mouse.x = x - boundingRef.current.left
      mouse.y = y - boundingRef.current.top
      if (!mouse.set) {
        mouse.sx = mouse.x
        mouse.sy = mouse.y
        mouse.lx = mouse.x
        mouse.ly = mouse.y
        mouse.set = true
      }
    }

    const onMouseMove = (e: MouseEvent): void => updateMouse(e.clientX, e.clientY)
    const onResize = (): void => {
      setSize()
      setLines()
    }

    const movePoints = (time: number): void => {
      const noise = noiseRef.current
      if (!noise) return
      const mouse = mouseRef.current
      linesRef.current.forEach((points) => {
        points.forEach((p) => {
          const move =
            noise((p.x + time * 0.008) * 0.003, (p.y + time * 0.003) * 0.002) * 8
          p.wave.x = Math.cos(move) * 12
          p.wave.y = Math.sin(move) * 6

          const dx = p.x - mouse.sx
          const dy = p.y - mouse.sy
          const d = Math.hypot(dx, dy)
          const l = Math.max(175, mouse.vs)
          if (d < l) {
            const s = 1 - d / l
            const f = Math.cos(d * 0.001) * s
            p.cursor.vx += Math.cos(mouse.a) * f * l * mouse.vs * 0.00035
            p.cursor.vy += Math.sin(mouse.a) * f * l * mouse.vs * 0.00035
          }
          p.cursor.vx += (0 - p.cursor.x) * 0.01
          p.cursor.vy += (0 - p.cursor.y) * 0.01
          p.cursor.vx *= 0.95
          p.cursor.vy *= 0.95
          p.cursor.x += p.cursor.vx
          p.cursor.y += p.cursor.vy
          p.cursor.x = Math.min(50, Math.max(-50, p.cursor.x))
          p.cursor.y = Math.min(50, Math.max(-50, p.cursor.y))
        })
      })
    }

    const moved = (p: Point, withCursor = true): { x: number; y: number } => ({
      x: p.x + p.wave.x + (withCursor ? p.cursor.x : 0),
      y: p.y + p.wave.y + (withCursor ? p.cursor.y : 0)
    })

    const drawLines = (): void => {
      linesRef.current.forEach((points, li) => {
        if (points.length < 2 || !pathsRef.current[li]) return
        const first = moved(points[0], false)
        let d = `M ${first.x} ${first.y}`
        for (let i = 1; i < points.length; i++) {
          const c = moved(points[i])
          d += `L ${c.x} ${c.y}`
        }
        pathsRef.current[li].setAttribute('d', d)
      })
    }

    const tick = (time: number): void => {
      const mouse = mouseRef.current
      mouse.sx += (mouse.x - mouse.sx) * 0.1
      mouse.sy += (mouse.y - mouse.sy) * 0.1
      const dx = mouse.x - mouse.lx
      const dy = mouse.y - mouse.ly
      const d = Math.hypot(dx, dy)
      mouse.v = d
      mouse.vs += (d - mouse.vs) * 0.1
      mouse.vs = Math.min(100, mouse.vs)
      mouse.lx = mouse.x
      mouse.ly = mouse.y
      mouse.a = Math.atan2(dy, dx)
      movePoints(time)
      drawLines()
      rafRef.current = requestAnimationFrame(tick)
    }

    setSize()
    setLines()
    window.addEventListener('resize', onResize)
    window.addEventListener('mousemove', onMouseMove)
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('mousemove', onMouseMove)
    }
  }, [strokeColor])

  return (
    <div ref={containerRef} className={`waves ${className}`} aria-hidden="true">
      <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" />
    </div>
  )
}

export default Waves
