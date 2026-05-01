import {
  HH, CHIP_H,
  REPULSE_R, REPULSE_K, FRICTION, MIN_SPEED, BUFFER, CENTER_K, BOUNDS_MARGIN,
} from './constants'

export interface Vec { x: number; y: number; vx: number; vy: number }
export interface Rect { l: number; r: number; t: number; b: number }
export type ChipAlign = 'right-center' | 'left-center' | 'center-top' | 'center-bottom'
export interface ChipSpec { id: string; label: string; ax: number; ay: number; align: ChipAlign }

// Pill label is the player's full name. The pill itself sizes to its
// content (`width: max-content` in PlayerNode), and physics uses the
// rendered half-width measured by ResizeObserver — so a long name simply
// makes its pill wider, with everything else (chip anchors, no-overlap,
// bounds clamp) adapting automatically.
export const pillLabel = (name: string): string => name

// Approx rendered widths for the fixed pill / chip typography.
// chip: 11px / 600 weight; pill: 15px / 600 weight.
// We deliberately overestimate so the push-out pass pushes other pills clear
// of the actual rendered chip rather than the smaller heuristic bbox.
export const chipWidth = (label: string): number =>
  Math.round(label.length * 7.5 + 28)

export const pillHalfWidth = (name: string): number =>
  Math.round((pillLabel(name).length * 8.5 + 32 + 3) / 2)

// Extra padding added to each chip rect when computing the open zone, so
// other pills get pushed a little clear of the chip rather than touching it.
const CHIP_RECT_PAD = 6

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

// Axis-aligned rects covering the open pill + its chip footprints. Each
// chip rect is padded by CHIP_RECT_PAD so other pills get pushed slightly
// clear of the chip rather than just touching its edge.
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
    // Pad outward so the push-out clears the chip's rendered border + a touch
    // of breathing room.
    rects.push({
      l: l - CHIP_RECT_PAD,
      r: r + CHIP_RECT_PAD,
      t: t - CHIP_RECT_PAD,
      b: b + CHIP_RECT_PAD,
    })
  }
  return rects
}

// Place n pills around a fixed-radius ring centered on the canvas.
// Radius factor controls the default spread — bigger = pills start (and,
// with the weak spring, stay) further apart.
export function initialPositions(n: number, w: number, h: number): Vec[] {
  const cx = w / 2, cy = h / 2
  const r = Math.min(w, h) * 0.36
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
  /** Per-pill half-width (px) — measured from the rendered DOM where
   *  available, falling back to the heuristic. Drives both pairwise
   *  repulsion strength and the hard non-overlap constraint. */
  halfWidths: number[]
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
  const { positions, halfWidths, dt, centre, bounds, drag, open, openChips } = input
  const cx = centre.x, cy = centre.y
  const { w, h } = bounds

  // ─── Forces + integration ────────────────────────────────────────────────
  for (let i = 0; i < positions.length; i++) {
    if (i === drag || i === open) continue
    const p = positions[i]

    // Spring to centre
    p.vx += (cx - p.x) * CENTER_K * dt
    p.vy += (cy - p.y) * CENTER_K * dt

    // AABB-aware pairwise repulsion. Strength scales with how close the
    // rect-to-rect clearance is. Pills further apart than REPULSE_R clearance
    // get nothing; touching (or overlapping) get the full push.
    const hwI = halfWidths[i]
    for (let j = 0; j < positions.length; j++) {
      if (j === i) continue
      const q = positions[j]
      const dx = p.x - q.x
      const dy = p.y - q.y
      const adx = Math.abs(dx)
      const ady = Math.abs(dy)
      // Centre-to-centre minimum distances at which the rects would just touch.
      const minDx = hwI + halfWidths[j]
      const minDy = 2 * HH
      // Clearance (>=0 when rects don't overlap).
      const cxClear = Math.max(0, adx - minDx)
      const cyClear = Math.max(0, ady - minDy)
      // Use Euclidean clearance as a single proximity scalar; if either axis
      // overlaps we treat that axis's clearance as 0 (rects are interpenetrating
      // along that axis), so the proximity is dominated by the other axis.
      const proximity = Math.hypot(cxClear, cyClear)
      if (proximity < REPULSE_R) {
        const f = (REPULSE_R - proximity) / REPULSE_R
        // Direction: from q toward p along their centre offset (use a small
        // epsilon to avoid the zero-vector case).
        const distC = Math.max(0.5, Math.hypot(dx, dy))
        p.vx += (dx / distC) * f * REPULSE_K * dt
        p.vy += (dy / distC) * f * REPULSE_K * dt
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
  }

  // ─── Constraint resolution (iterative) ───────────────────────────────────
  // Three constraints all need to hold every frame:
  //   1. No two pills overlap (rects + BUFFER apart).
  //   2. Every pill's footprint stays inside the canvas.
  //   3. Other pills don't sit inside the open pill's chip zone.
  // Each constraint pass can violate the others when pushing things around,
  // so iterate a few times until they converge. This is a position-only
  // (Gauss-Seidel-ish) projection; velocities are zeroed where appropriate
  // so the spring doesn't fight the corrections next frame.
  const ITER = 4
  for (let iter = 0; iter < ITER; iter++) {
    // (1) Pairwise non-overlap.
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const a = positions[i]
        const b = positions[j]
        const dx = a.x - b.x
        const dy = a.y - b.y
        const minDx = halfWidths[i] + halfWidths[j] + BUFFER
        const minDy = 2 * HH + BUFFER
        const ox = minDx - Math.abs(dx)
        const oy = minDy - Math.abs(dy)
        if (ox > 0 && oy > 0) {
          const aLocked = i === drag
          const bLocked = j === drag
          if (ox < oy) {
            const sgn = dx >= 0 ? 1 : -1
            if (aLocked && !bLocked)      { b.x -= sgn * ox; b.vx = 0 }
            else if (bLocked && !aLocked) { a.x += sgn * ox; a.vx = 0 }
            else {
              a.x += sgn * (ox / 2); a.vx = 0
              b.x -= sgn * (ox / 2); b.vx = 0
            }
          } else {
            const sgn = dy >= 0 ? 1 : -1
            if (aLocked && !bLocked)      { b.y -= sgn * oy; b.vy = 0 }
            else if (bLocked && !aLocked) { a.y += sgn * oy; a.vy = 0 }
            else {
              a.y += sgn * (oy / 2); a.vy = 0
              b.y -= sgn * (oy / 2); b.vy = 0
            }
          }
        }
      }
    }

    // (2) Open-pill chip-zone push-out (other pills only).
    // Uses a larger buffer than pair non-overlap so pills are clearly clear
    // of the rendered chip — covers any heuristic mismatch in chipWidth and
    // gives the chip's drop-shadow a bit of breathing room.
    if (open >= 0 && openChips.length > 0) {
      const o = positions[open]
      const ohw = halfWidths[open]
      const rects = openZoneRects(o.x, o.y, ohw, openChips)
      const CHIP_BUFFER = 16
      for (let i = 0; i < positions.length; i++) {
        if (i === drag || i === open) continue
        const p = positions[i]
        const phw = halfWidths[i]
        const pl = p.x - phw - CHIP_BUFFER, pr = p.x + phw + CHIP_BUFFER
        const pt = p.y - HH  - CHIP_BUFFER, pb = p.y + HH  + CHIP_BUFFER
        for (const rc of rects) {
          const ox = Math.min(pr, rc.r) - Math.max(pl, rc.l)
          const oy = Math.min(pb, rc.b) - Math.max(pt, rc.t)
          if (ox > 0 && oy > 0) {
            const rcx = (rc.l + rc.r) / 2
            const rcy = (rc.t + rc.b) / 2
            if (oy < ox) {
              const sgn = p.y === rcy ? 1 : Math.sign(p.y - rcy)
              p.y += sgn * oy
              // Zero velocity heading back into the chip so the spring can't
              // immediately drag the pill back through the chip next frame.
              if (Math.sign(p.vy) !== sgn) p.vy = 0
            } else {
              const sgn = p.x === rcx ? 1 : Math.sign(p.x - rcx)
              p.x += sgn * ox
              if (Math.sign(p.vx) !== sgn) p.vx = 0
            }
          }
        }
      }
    }

    // (3) Visible-bounds clamp (pill + open chip footprint stay on canvas).
    for (let i = 0; i < positions.length; i++) {
      const p = positions[i]
      const hw = halfWidths[i]
      let minX = hw + BOUNDS_MARGIN
      let maxX = w - hw - BOUNDS_MARGIN
      let minY = HH + BOUNDS_MARGIN
      let maxY = h - HH - BOUNDS_MARGIN

      if (i === open && openChips.length > 0) {
        const rects = openZoneRects(0, 0, hw, openChips)
        let extLeft = hw, extRight = hw, extTop = HH, extBottom = HH
        for (const r of rects) {
          if (-r.l > extLeft)   extLeft   = -r.l
          if ( r.r > extRight)  extRight  =  r.r
          if (-r.t > extTop)    extTop    = -r.t
          if ( r.b > extBottom) extBottom =  r.b
        }
        minX = extLeft + BOUNDS_MARGIN
        maxX = w - extRight - BOUNDS_MARGIN
        minY = extTop + BOUNDS_MARGIN
        maxY = h - extBottom - BOUNDS_MARGIN
      }

      // Guard against negative ranges (canvas smaller than the footprint).
      if (minX > maxX) minX = maxX = (minX + maxX) / 2
      if (minY > maxY) minY = maxY = (minY + maxY) / 2

      if (p.x < minX) { p.x = minX; if (p.vx < 0) p.vx = 0 }
      if (p.x > maxX) { p.x = maxX; if (p.vx > 0) p.vx = 0 }
      if (p.y < minY) { p.y = minY; if (p.vy < 0) p.vy = 0 }
      if (p.y > maxY) { p.y = maxY; if (p.vy > 0) p.vy = 0 }
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
