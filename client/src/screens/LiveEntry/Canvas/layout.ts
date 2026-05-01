import { HH } from './constants'
import { rectExitDist, type ChipSpec, type ChipAlign } from './physics'

// Chip identifiers and their on-screen labels.
// The chips use the same long defence-action names as the event log so the
// recorder sees a single, consistent vocabulary. core/format.ts defines the
// matching log strings.
export const CHIP_LABELS = {
  pull:         'Pull',
  'pull-bonus': 'Pull Bonus',
  rec:          'Receiver Error',
  goal:         'Goal',
  tw:           'Throwaway',
  st:           'Stall',
  blk:          'Blocked by Defence',
  int:          'Intercepted by Defence',
} as const

export type ChipId = keyof typeof CHIP_LABELS

export interface BuildOpts {
  phase: 'in-play' | 'awaiting-pull'
  /** Show the Stall chip on in-play opens. Hidden by default
   *  (recordingOptions.stall === false). */
  stallShown?: boolean
  /** Show the Pull Bonus chip on awaiting-pull opens
   *  (recordingOptions.pullBonus). */
  bonusShown?: boolean
}

// Base visible gap (px) between the chip's nearest edge and the pill
// perimeter, measured along the ray from pill centre. Applied at axial
// directions (top / right / bottom / left).
const CHIP_GAP = 12
// Extra outward push applied to chips on diagonals (~45°) so their long
// labels (e.g. "Blocked by Defence") don't crash into the axial chips that
// flank them (Throwaway above, Intercepted by Defence to the right).
// Scales with how diagonal the angle is — zero at axes, maximum at 45°.
const CHIP_CORNER_BUMP = 28

// Anchor a chip on the pill's rectangular perimeter (extended by CHIP_GAP +
// corner bump) along the given ray. Picks the alignment that makes the chip
// body extend outward, away from the pill.
function rayAnchor(id: ChipId, angle: number, HW: number): ChipSpec {
  const cosA = Math.cos(angle)
  const sinA = Math.sin(angle)
  const cornerness = Math.min(1, Math.abs(cosA * sinA) * 4) // 0 axial, 1 at 45°
  // Distance from pill centre to its rect edge along (cosA, sinA), plus the
  // visible gap. rectExitDist treats the pill as a HW×HH axis-aligned rect.
  const t = rectExitDist(cosA, sinA, HW, HH) + CHIP_GAP + cornerness * CHIP_CORNER_BUMP
  const ax = cosA * t
  const ay = sinA * t
  // Strict `>` so 45° angles fall through to horizontal alignment, avoiding
  // a long chip (extending vertically with center-bottom) overlapping the
  // axial Throwaway chip above.
  let align: ChipAlign
  if (Math.abs(sinA) > Math.abs(cosA)) {
    align = sinA < 0 ? 'center-bottom' : 'center-top'
  } else {
    align = cosA > 0 ? 'left-center' : 'right-center'
  }
  return { id, label: CHIP_LABELS[id], ax, ay, align }
}

// Layout for the chips that surround an opened pill.
//
// In-play (5 chips today; 6 when stallShown):
//   - Receiver Error: left
//   - Goal:           bottom
//   - Throwaway / [Stall] / Block / Intercept span the top→right
//     quarter-arc evenly. Stall sits between Throwaway and Block when shown.
//
// Awaiting-pull:
//   - Pull:       top (always)
//   - Pull Bonus: right (when bonusShown)
//
// All chips use a single rectangular-perimeter formula with CHIP_GAP
// clearance so they sit at a uniform visible distance from the pill.
export function buildActions(HW: number, opts: BuildOpts): ChipSpec[] {
  if (opts.phase === 'awaiting-pull') {
    const chips: ChipSpec[] = [rayAnchor('pull', -Math.PI / 2, HW)]
    if (opts.bonusShown) chips.push(rayAnchor('pull-bonus', 0, HW))
    return chips
  }

  // Quarter-arc chips: top→right. 4-step (with stall) or 3-step.
  const arc: ChipId[] = opts.stallShown
    ? ['tw', 'st', 'blk', 'int']
    : ['tw', 'blk', 'int']
  const N = arc.length
  const arcChips = arc.map((id, i) => {
    const angle = -Math.PI / 2 + (i / (N - 1)) * (Math.PI / 2)
    return rayAnchor(id, angle, HW)
  })

  return [
    rayAnchor('rec',  Math.PI,    HW),
    rayAnchor('goal', Math.PI / 2, HW),
    ...arcChips,
  ]
}

// Map a ChipId to the engine action that should run when the chip is tapped.
export type ChipAction =
  | { kind: 'pull';        bonus: boolean }
  | { kind: 'throwaway' }
  | { kind: 'goal' }
  | { kind: 'stall' }
  | { kind: 'def-block';   type: 'block' | 'intercept' }
  | { kind: 'receiver-error' }

export function chipAction(id: ChipId): ChipAction {
  switch (id) {
    case 'pull':        return { kind: 'pull',     bonus: false }
    case 'pull-bonus':  return { kind: 'pull',     bonus: true }
    case 'tw':          return { kind: 'throwaway' }
    case 'goal':        return { kind: 'goal' }
    case 'st':          return { kind: 'stall' }
    case 'blk':         return { kind: 'def-block', type: 'block' }
    case 'int':         return { kind: 'def-block', type: 'intercept' }
    case 'rec':         return { kind: 'receiver-error' }
  }
}
