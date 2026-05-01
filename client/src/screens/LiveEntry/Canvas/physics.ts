import {
  HH, CHIP_H,
  REPULSE_R, REPULSE_K, FRICTION, MIN_SPEED, BUFFER, CENTER_K, BOUNDS_MARGIN,
} from './constants'

export interface Vec { x: number; y: number; vx: number; vy: number }
export interface Rect { l: number; r: number; t: number; b: number }
export type ChipAlign = 'right-center' | 'left-center' | 'center-top' | 'center-bottom'
export interface ChipSpec { id: string; label: string; ax: number; ay: number; align: ChipAlign }

// Truncate long names so pillHalfWidth stays predictable for physics packing.
export const pillLabel = (name: string): string =>
  name.length > 11 ? name.slice(0, 10) + '…' : name

// Approx rendered widths for the fixed pill / chip typography.
// chip: 11px / 600 weight; pill: 15px / 600 weight.
export const chipWidth = (label: string): number =>
  Math.round(label.length * 6.5 + 20)

export const pillHalfWidth = (name: string): number =>
  Math.round((pillLabel(name).length * 8.5 + 32 + 3) / 2)

export function rectExitDist(ux: number, uy: number, hw: number, hh: number): number {
  const tx = ux !== 0 ? hw / Math.abs(ux) : Infinity
  const ty = uy !== 0 ? hh / Math.abs(uy) : Infinity
  return Math.min(tx, ty)
}

export interface ArrowGeom {
  d: string
  head: string
  control: { x: number; y: number }
  start:   { x: number; y: number }
  end:     { x: number; y: number }
}

// Quadratic bezier from a→b, with each end inset to sit just outside the
// respective pill rect (plus a small visible gap), and a perpendicular arc
// offset for grace. Arrowhead aligned to the tangent at the end.
export function computeArrowPath(
  ax: number, ay: number, bx: number, by: number,
  halfA: { hw: number; hh: number },
  halfB: { hw: number; hh: number },
): ArrowGeom {
  const dx = bx - ax, dy = by - ay
  const dist = Math.hypot(dx, dy) || 1
  const ux = dx / dist, uy = dy / dist
  const GAP_AB = 8
  const startInset = rectExitDist(ux, uy, halfA.hw, halfA.hh) + GAP_AB
  const endInset   = rectExitDist(ux, uy, halfB.hw, halfB.hh) + GAP_AB
  const sx = ax + ux * startInset
  const sy = ay + uy * startInset
  const ex = bx - ux * endInset
  const ey = by - uy * endInset

  const arcAmt = Math.min(22, dist * 0.07)
  const px = -uy, py = ux
  const cx = (sx + ex) / 2 + px * arcAmt
  const cy = (sy + ey) / 2 + py * arcAmt

  const tdx = ex - cx, tdy = ey - cy
  const tlen = Math.hypot(tdx, tdy) || 1
  const tx = tdx / tlen, ty = tdy / tlen
  const ah = 10, aw = 6
  const pex = ex - tx * ah
  const pey = ey - ty * ah
  const d = `M ${sx} ${sy} Q ${cx} ${cy} ${pex} ${pey}`

  const nx = -ty, ny = tx
  const lX = pex + nx * aw, lY = pey + ny * aw
  const rX = pex - nx * aw, rY = pey - ny * aw
  const head = `${ex},${ey} ${lX},${lY} ${rX},${rY}`

  return { d, head, control: { x: cx, y: cy }, start: { x: sx, y: sy }, end: { x: ex, y: ey } }
}

// Sample n-1 interior points of the quadratic bezier P0→C→P1.
export function sampleBezier(
  p0x: number, p0y: number, cx: number, cy: number, p1x: number, p1y: number, n: number,
): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = []
  for (let i = 1; i < n; i++) {
    const t = i / n
    const it = 1 - t
    out.push({
      x: it * it * p0x + 2 * it * t * cx + t * t * p1x,
      y: it * it * p0y + 2 * it * t * cy + t * t * p1y,
    })
  }
  return out
}

// Axis-aligned rects covering the open pill + its chip footprints.
// Other pills are pushed out of these rects each frame.
export function openZoneRects(cx: number, cy: number, HW: number, chips: ChipSpec[]): Rect[] {
  const rects: Rect[] = []
  rects.push({ l: cx - HW, r: cx + HW, t: cy - HH, b: cy + HH })
  for (const a of chips) {
    const cw = chipWidth(a.label)
    const acx = cx + a.ax, acy = cy + a.ay
    let l: number, r: number, t: number, b: number
    if (a.align === 'right-center') {
      r = acx; l = acx - cw
      t = acy - CHIP_H / 2; b = acy + CHIP_H / 2
    } else if (a.align === 'left-center') {
      l = acx; r = acx + cw
      t = acy - CHIP_H / 2; b = acy + CHIP_H / 2
    } else if (a.align === 'center-top') {
      l = acx - cw / 2; r = acx + cw / 2
      t = acy; b = acy + CHIP_H
    } else {
      // center-bottom: chip's bottom edge touches anchor → extends upward
      l = acx - cw / 2; r = acx + cw / 2
      t = acy - CHIP_H; b = acy
    }
    rects.push({ l, r, t, b })
  }
  return rects
}

// Place n pills around a fixed-radius ring centered on the canvas.
export function initialPositions(n: number, w: number, h: number): Vec[] {
  const cx = w / 2, cy = h / 2
  const r = Math.min(w, h) * 0.28
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2
    return {
      x: cx + Math.cos(a) * r,
      y: cy + Math.sin(a) * r * 0.7,
      vx: 0, vy: 0,
    }
  })
}

export interface PhysicsStepInput {
  positions:  Vec[]
  names:      string[]
  dt:         number
  centre:     { x: number; y: number }
  bounds:     { w: number; h: number }
  drag:       number          // index being dragged, or -1
  open:       number          // index opened, or -1
  openChips:  ChipSpec[]      // chip layout for the open pill (empty if none)
}

// One physics tick. Mutates `positions` in place. Pure function of inputs:
// no DOM, no module state, safe for unit tests.
export function stepPhysics(input: PhysicsStepInput): void {
  const { positions, names, dt, centre, bounds, drag, open, openChips } = input
  const cx = centre.x, cy = centre.y
  const { w, h } = bounds

  for (let i = 0; i < positions.length; i++) {
    if (i === drag || i === open) continue
    const p = positions[i]

    // Spring to centre
    p.vx += (cx - p.x) * CENTER_K * dt
    p.vy += (cy - p.y) * CENTER_K * dt

    // Pairwise repulsion
    for (let j = 0; j < positions.length; j++) {
      if (j === i) continue
      const q = positions[j]
      const dx = p.x - q.x
      const dy = p.y - q.y
      const d2 = dx * dx + dy * dy
      if (d2 < REPULSE_R * REPULSE_R && d2 > 0.01) {
        const d = Math.sqrt(d2)
        const f = (REPULSE_R - d) / REPULSE_R
        p.vx += (dx / d) * f * REPULSE_K * dt
        p.vy += (dy / d) * f * REPULSE_K * dt
      }
    }

    // Damping + jitter snap
    p.vx *= FRICTION
    p.vy *= FRICTION
    if (Math.abs(p.vx) < MIN_SPEED) p.vx = 0
    if (Math.abs(p.vy) < MIN_SPEED) p.vy = 0

    // Integrate
    p.x += p.vx * dt * 60
    p.y += p.vy * dt * 60

    // Soft viewport bounds
    if (p.x < BOUNDS_MARGIN)     { p.x = BOUNDS_MARGIN;     p.vx *= -0.3 }
    if (p.x > w - BOUNDS_MARGIN) { p.x = w - BOUNDS_MARGIN; p.vx *= -0.3 }
    if (p.y < BOUNDS_MARGIN)     { p.y = BOUNDS_MARGIN;     p.vy *= -0.3 }
    if (p.y > h - BOUNDS_MARGIN) { p.y = h - BOUNDS_MARGIN; p.vy *= -0.3 }
  }

  // Positional push-out from the open pill's chip footprint.
  if (open >= 0 && openChips.length > 0) {
    const o = positions[open]
    const ohw = pillHalfWidth(names[open])
    const rects = openZoneRects(o.x, o.y, ohw, openChips)
    for (let i = 0; i < positions.length; i++) {
      if (i === drag || i === open) continue
      const p = positions[i]
      const phw = pillHalfWidth(names[i])
      const pl = p.x - phw - BUFFER, pr = p.x + phw + BUFFER
      const pt = p.y - HH - BUFFER,  pb = p.y + HH + BUFFER
      for (const rc of rects) {
        const ox = Math.min(pr, rc.r) - Math.max(pl, rc.l)
        const oy = Math.min(pb, rc.b) - Math.max(pt, rc.t)
        if (ox > 0 && oy > 0) {
          const rcx = (rc.l + rc.r) / 2
          const rcy = (rc.t + rc.b) / 2
          if (oy < ox) {
            const sgn = p.y === rcy ? 1 : Math.sign(p.y - rcy)
            p.y += sgn * oy
            if (Math.sign(p.vy) !== sgn && p.vy !== 0) p.vy = 0
          } else {
            const sgn = p.x === rcx ? 1 : Math.sign(p.x - rcx)
            p.x += sgn * ox
            if (Math.sign(p.vx) !== sgn && p.vx !== 0) p.vx = 0
          }
        }
      }
    }
  }
}

// Small wrapper used by Stage's drag handler — picks pointer xy from mouse / touch.
export function eventXY(e: PointerEvent | MouseEvent | TouchEvent): { x: number; y: number } {
  if ('touches' in e && e.touches[0])           return { x: e.touches[0].clientX,        y: e.touches[0].clientY }
  if ('changedTouches' in e && e.changedTouches[0])
                                                return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY }
  return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY }
}
