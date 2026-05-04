import { CHIP_H, SLOT_POSITIONS } from './constants'

export interface Vec { x: number; y: number }
export interface Rect { l: number; r: number; t: number; b: number }
export type ChipAlign = 'right-center' | 'left-center' | 'center-top' | 'center-bottom'
export interface ChipSpec {
  id: string
  label: string
  ax: number
  ay: number
  align: ChipAlign
  /** Length of the connector line from the pill's perimeter to the chip's
   *  near edge, along the ray from pill centre. Equals CHIP_GAP for axial
   *  chips and grows with the corner bump for diagonal ones. */
  connectorLength: number
}

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
  Math.round((pillLabel(name).length * 9 + 36 + 4) / 2)

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
//
// `halfHeight` is the pill's effective half-height (HH × pillScale). Chips
// always use the constant CHIP_H — the chip set itself doesn't scale.
export function openZoneRects(
  cx: number, cy: number,
  HW: number, halfHeight: number,
  chips: ChipSpec[],
): Rect[] {
  const rects: Rect[] = []
  rects.push({ l: cx - HW, r: cx + HW, t: cy - halfHeight, b: cy + halfHeight })
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

// Pixel-space slot positions for the active line. Returns one Vec per slot in
// SLOT_POSITIONS order (length always equals SLOT_POSITIONS.length, currently
// 7). Callers index into it with the active-line index.
export function slotPositions(bounds: { w: number; h: number }): Vec[] {
  return SLOT_POSITIONS.map(s => ({ x: s.x * bounds.w, y: s.y * bounds.h }))
}

// Small wrapper used by Stage's drag handler — picks pointer xy from mouse / touch.
export function eventXY(e: PointerEvent | MouseEvent | TouchEvent): { x: number; y: number } {
  if ('touches' in e && e.touches[0])           return { x: e.touches[0].clientX,        y: e.touches[0].clientY }
  if ('changedTouches' in e && e.changedTouches[0])
                                                return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY }
  return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY }
}
