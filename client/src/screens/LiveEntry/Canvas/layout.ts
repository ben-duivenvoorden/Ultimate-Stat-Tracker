import { BOUNDS_MARGIN_X, BOUNDS_MARGIN_Y, HH } from './constants'
import {
  rectExitDist, chipRect, rectsIntersect, rectInsideBounds,
  type ChipSpec, type ChipAlign, type Rect,
} from './physics'

// Chip identifiers and their on-screen labels.
// The chips use the same defence-action names as the event log (with the
// word "Defence" elided to "…" so the wide pills don't dominate the
// rosette). core/format.ts keeps the long form for the event-log copy.
export const CHIP_LABELS = {
  pull:         'Pull',
  'pull-bonus': 'Pull Distance Bonus',
  brick:        'Brick',
  rec:          'Receiver Error',
  goal:         'Goal',
  tw:           'Throwaway',
  st:           'Stall',
  blk:          'Blocked by …',
  int:          'Intercepted by …',
} as const

export type ChipId = keyof typeof CHIP_LABELS

export interface BuildOpts {
  phase: 'in-play' | 'awaiting-pull'
  /** Show the Stall chip on in-play opens. Hidden by default
   *  (recordingOptions.stall === false). */
  stallShown?: boolean
  /** Show the Pull Distance Bonus chip on awaiting-pull opens
   *  (recordingOptions.pullBonus). */
  bonusShown?: boolean
}

/** Per-pill placement context. When provided, `buildActions` orients the
 *  rosette toward the canvas interior (180° hemisphere centred on the
 *  pill's "open direction") and runs a repair pass that nudges any chip
 *  whose footprint clips the canvas bounds, overlaps another pill's slot
 *  rect, or overlaps a previously-placed chip in the same rosette. */
export interface Placement {
  /** Pill centre in canvas px. */
  pill:   { x: number; y: number }
  /** Logical canvas bounds (Stage's `bounds` prop). */
  bounds: { w: number; h: number }
  /** Other pills' rectangles in canvas px (excluding the open pill). */
  others: Rect[]
}

// Base visible gap (px) between the chip's nearest edge and the pill
// perimeter, measured along the ray from pill centre. Applied at axial
// directions (top / right / bottom / left).
const CHIP_GAP = 12
// Extra outward push applied to chips on diagonals (~45°) so their long
// labels (e.g. "Blocked by …") don't crash into the axial chips that
// flank them. Scales with how diagonal the angle is — zero at axes,
// maximum at 45°.
const CHIP_CORNER_BUMP = 28

// Anchor a chip on the pill's rectangular perimeter (extended by CHIP_GAP +
// corner bump) along the given ray. Picks the alignment that makes the chip
// body extend outward, away from the pill.
function rayAnchor(id: ChipId, angle: number, HW: number): ChipSpec {
  const cosA = Math.cos(angle)
  const sinA = Math.sin(angle)
  const cornerness = Math.min(1, Math.abs(cosA * sinA) * 4) // 0 axial, 1 at 45°
  const connectorLength = CHIP_GAP + cornerness * CHIP_CORNER_BUMP
  // Distance from pill centre to its rect edge along (cosA, sinA), plus the
  // visible gap. rectExitDist treats the pill as a HW×HH axis-aligned rect.
  const t = rectExitDist(cosA, sinA, HW, HH) + connectorLength
  const ax = cosA * t
  const ay = sinA * t
  // Strict `>` so 45° angles fall through to horizontal alignment, avoiding
  // a long chip (extending vertically with center-bottom) overlapping the
  // axial chip above.
  let align: ChipAlign
  if (Math.abs(sinA) > Math.abs(cosA)) {
    align = sinA < 0 ? 'center-bottom' : 'center-top'
  } else {
    align = cosA > 0 ? 'left-center' : 'right-center'
  }
  return { id, label: CHIP_LABELS[id], ax, ay, align, connectorLength }
}

// ─── Adaptive orientation ─────────────────────────────────────────────────
// "Open direction" — the cardinal direction (right / left / down / up) that
// points away from the pill's nearest canvas edge. Used as the centre of a
// 180° rosette so chips fan into the available canvas space rather than off
// the edge.
//
// Returns null for pills sitting roughly in the canvas centre — those keep
// the legacy 360° layout (Rec left, Goal bottom, arc top→right) so existing
// muscle memory stays intact for the most common in-play position.
const CENTRE_DEAD_ZONE = 0.15
// Horizontal bias: chips are wider than tall, so steering away from a
// horizontal canvas edge gains more clearance than steering away from a
// vertical one. The ×1.2 makes |fx| win narrow ties (e.g. fractional slots
// like 0.16,0.18 where |dx| ≈ |dy|).
const HORIZONTAL_BIAS = 1.2

function openDirection(p: Placement): number | null {
  const fx = p.pill.x / p.bounds.w - 0.5
  const fy = p.pill.y / p.bounds.h - 0.5
  if (Math.abs(fx) < CENTRE_DEAD_ZONE && Math.abs(fy) < CENTRE_DEAD_ZONE) return null
  if (Math.abs(fx) * HORIZONTAL_BIAS >= Math.abs(fy)) return fx < 0 ? 0 : Math.PI
  return fy < 0 ? Math.PI / 2 : -Math.PI / 2
}

// Ordering of chips along the 180° arc, from arc-start (θ₀ - π/2) to
// arc-end (θ₀ + π/2). Chosen to keep a "turnover types → score → defence"
// reading order: rec, tw, [st], goal, blk, int.
const ARC_ORDER_INPLAY_NO_STALL: ChipId[] = ['rec', 'tw', 'goal', 'blk', 'int']
const ARC_ORDER_INPLAY_STALL:    ChipId[] = ['rec', 'tw', 'st', 'goal', 'blk', 'int']
const ARC_ORDER_PULL_NO_BONUS:   ChipId[] = ['brick', 'pull']
const ARC_ORDER_PULL_BONUS:      ChipId[] = ['brick', 'pull', 'pull-bonus']

// Evenly spread `ids` across the 180° arc centred at θ₀.
function hemisphereProposals(ids: ChipId[], theta0: number): { id: ChipId; angle: number }[] {
  const N = ids.length
  return ids.map((id, i) => {
    const t = N === 1 ? 0.5 : i / (N - 1)
    return { id, angle: (theta0 - Math.PI / 2) + t * Math.PI }
  })
}

// Legacy 360° layout — preserved for centre-of-canvas pills so the rosette
// still reads top→right with Rec on the left and Goal at the bottom.
function legacyProposals(opts: BuildOpts): { id: ChipId; angle: number }[] {
  if (opts.phase === 'awaiting-pull') {
    const out: { id: ChipId; angle: number }[] = [
      { id: 'pull',  angle: -Math.PI / 2 },
      { id: 'brick', angle:  Math.PI },
    ]
    if (opts.bonusShown) out.push({ id: 'pull-bonus', angle: 0 })
    return out
  }
  const arc: ChipId[] = opts.stallShown ? ['tw', 'st', 'blk', 'int'] : ['tw', 'blk', 'int']
  const N = arc.length
  const arcProps = arc.map((id, i) => ({
    id, angle: -Math.PI / 2 + (i / (N - 1)) * (Math.PI / 2),
  }))
  return [
    { id: 'rec'  as ChipId, angle: Math.PI },
    { id: 'goal' as ChipId, angle: Math.PI / 2 },
    ...arcProps,
  ]
}

// Repair pass — sweep ±150° around `angle` in 15° steps looking for a chip
// placement that satisfies as many of these constraints as possible:
//   1. (HARD)  doesn't overlap a previously-accepted chip rect
//   2. (SOFT)  fits inside the canvas bounds
//   3. (SOFT)  doesn't overlap another pill's slot rect
//
// Chip-chip overlap is treated as a hard constraint: two chips on top of
// each other become unreadable. A chip clipping the bounds, or sitting on
// top of a teammate pill, is recoverable — the bounds inset is generous and
// the per-frame pill push-out in Stage.tsx evicts overlapping pills.
//
// Tier ordering (best → worst):
//   tier 0: all soft constraints satisfied (and no chip-chip overlap)
//   tier 1: chip-chip clear, may clip bounds OR overlap a pill
//   tier 2: chip-chip overlap (true degraded fallback)
// Within each tier, smaller |da| (closer to the proposed angle) wins.
const REPAIR_STEP_DEG = 15
const REPAIR_MAX_DEG  = 150

function repairChip(
  id: ChipId, angle: number, HW: number, halfHeight: number,
  p: Placement, accepted: Rect[],
): ChipSpec {
  const candidates: number[] = [0]
  for (let s = REPAIR_STEP_DEG; s <= REPAIR_MAX_DEG; s += REPAIR_STEP_DEG) {
    candidates.push((s * Math.PI) / 180, -(s * Math.PI) / 180)
  }

  let bestPerfect:    { spec: ChipSpec; absDa: number } | null = null
  let bestNoChipChip: { spec: ChipSpec; absDa: number; softHits: number } | null = null
  let bestAny:        { spec: ChipSpec; absDa: number; chipHits: number; softHits: number } | null = null

  for (const da of candidates) {
    const candidate = rayAnchor(id, angle + da, HW)
    const r = chipRect(p.pill.x, p.pill.y, candidate)
    const inside       = rectInsideBounds(r, p.bounds, BOUNDS_MARGIN_X, BOUNDS_MARGIN_Y)
    const hitsOther    = p.others.some(o => rectsIntersect(o, r))
    const hitsAccepted = accepted.reduce((n, a2) => n + (rectsIntersect(a2, r) ? 1 : 0), 0)
    const softHits     = (inside ? 0 : 1) + (hitsOther ? 1 : 0)
    const absDa        = Math.abs(da)

    if (hitsAccepted === 0 && softHits === 0) {
      if (!bestPerfect || absDa < bestPerfect.absDa) bestPerfect = { spec: candidate, absDa }
    }
    if (hitsAccepted === 0) {
      if (!bestNoChipChip
          || softHits < bestNoChipChip.softHits
          || (softHits === bestNoChipChip.softHits && absDa < bestNoChipChip.absDa)) {
        bestNoChipChip = { spec: candidate, absDa, softHits }
      }
    }
    if (!bestAny
        || hitsAccepted < bestAny.chipHits
        || (hitsAccepted === bestAny.chipHits && softHits < bestAny.softHits)
        || (hitsAccepted === bestAny.chipHits && softHits === bestAny.softHits && absDa < bestAny.absDa)) {
      bestAny = { spec: candidate, absDa, chipHits: hitsAccepted, softHits }
    }
  }

  // halfHeight kept in the signature for future use (e.g. clamp-against-pill);
  // currently only `chipRect` width-pad matters. Reference here so the
  // parameter is non-vestigial when callers wire scaled pill height through.
  void halfHeight

  return (bestPerfect?.spec) ?? (bestNoChipChip?.spec) ?? (bestAny?.spec) ?? rayAnchor(id, angle, HW)
}

// Layout for the chips that surround an opened pill.
//
// Two layout modes:
//   • Adaptive (when `placement` is given AND the pill is near a canvas
//     edge): chips are laid on a 180° arc oriented away from the nearest
//     edge, then any chip that still clips bounds or another pill is nudged
//     by the repair sweep.
//   • Legacy (centre-of-canvas pills, or callers that don't pass
//     `placement`): Rec left, Goal bottom, arc top→right — same layout the
//     rosette has had since the canvas was introduced.
export function buildActions(HW: number, opts: BuildOpts, placement?: Placement): ChipSpec[] {
  const theta0 = placement ? openDirection(placement) : null

  // Pick proposals: hemisphere-oriented when adaptive, legacy otherwise.
  let proposals: { id: ChipId; angle: number }[]
  if (theta0 !== null) {
    let ids: ChipId[]
    if (opts.phase === 'awaiting-pull') {
      ids = opts.bonusShown ? ARC_ORDER_PULL_BONUS : ARC_ORDER_PULL_NO_BONUS
    } else {
      ids = opts.stallShown ? ARC_ORDER_INPLAY_STALL : ARC_ORDER_INPLAY_NO_STALL
    }
    proposals = hemisphereProposals(ids, theta0)
  } else {
    proposals = legacyProposals(opts)
  }

  // No placement context — emit raw proposals (used by tests / static callers).
  if (!placement) return proposals.map(({ id, angle }) => rayAnchor(id, angle, HW))

  // With placement context, run the repair pass on every chip so even the
  // legacy layout gets edge / overlap relief at narrow canvas widths.
  const accepted: Rect[] = []
  const out: ChipSpec[] = []
  for (const { id, angle } of proposals) {
    const repaired = repairChip(id, angle, HW, HH, placement, accepted)
    out.push(repaired)
    accepted.push(chipRect(placement.pill.x, placement.pill.y, repaired))
  }
  return out
}

// Map a ChipId to the engine action that should run when the chip is tapped.
export type ChipAction =
  | { kind: 'pull';        bonus: boolean }
  | { kind: 'brick' }
  | { kind: 'throwaway' }
  | { kind: 'goal' }
  | { kind: 'stall' }
  | { kind: 'def-block';   type: 'block' | 'intercept' }
  | { kind: 'receiver-error' }

export function chipAction(id: ChipId): ChipAction {
  switch (id) {
    case 'pull':        return { kind: 'pull',     bonus: false }
    case 'pull-bonus':  return { kind: 'pull',     bonus: true }
    case 'brick':       return { kind: 'brick' }
    case 'tw':          return { kind: 'throwaway' }
    case 'goal':        return { kind: 'goal' }
    case 'st':          return { kind: 'stall' }
    case 'blk':         return { kind: 'def-block', type: 'block' }
    case 'int':         return { kind: 'def-block', type: 'intercept' }
    case 'rec':         return { kind: 'receiver-error' }
  }
}
