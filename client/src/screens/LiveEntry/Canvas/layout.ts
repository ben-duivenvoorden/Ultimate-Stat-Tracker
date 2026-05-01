import { GAP, HH } from './constants'
import type { ChipSpec, ChipAlign } from './physics'

// Chip identifiers and their on-screen labels.
// Mature-build naming: pill chips use the terse forms; the event log keeps the
// long forms ("Blocked by Defence", etc.) via core/format.ts.
export const CHIP_LABELS = {
  pull:         'Pull',
  'pull-bonus': 'Pull Bonus',
  rec:          'Receiver Error',
  goal:         'Goal',
  tw:           'Throwaway',
  st:           'Stall',
  blk:          'Block',
  int:          'Intercept',
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

// Layout for the chips that surround an opened pill.
//
// In-play (5 chips today; 6 when stallShown):
//   - Receiver Error: left
//   - Goal:           bottom
//   - Throwaway:      top
//   - [Stall]:        between top and right (only when stallShown)
//   - Block:          right (upper of the right pair)
//   - Intercept:      right (lower of the right pair)
//
//   Throwaway / [Stall] / Block / Intercept span evenly along the top→right
//   quarter-arc (12 → 3 o'clock). Goal and Receiver Error sit alone on the
//   bottom and left axes since they are different action categories.
//
// Awaiting-pull:
//   - Pull:       top (always)
//   - Pull Bonus: right (when bonusShown)
export function buildActions(HW: number, opts: BuildOpts): ChipSpec[] {
  if (opts.phase === 'awaiting-pull') {
    const chips: ChipSpec[] = [
      { id: 'pull', label: CHIP_LABELS.pull, ax: 0, ay: -(HH + GAP), align: 'center-bottom' },
    ]
    if (opts.bonusShown) {
      chips.push({
        id: 'pull-bonus',
        label: CHIP_LABELS['pull-bonus'],
        ax: HW + GAP, ay: 0,
        align: 'left-center',
      })
    }
    return chips
  }

  const arc: ChipId[] = opts.stallShown ? ['tw', 'st', 'blk', 'int'] : ['tw', 'blk', 'int']
  const N = arc.length
  // Outer anchor radius — sit chips a touch beyond the pill envelope.
  const R = Math.max(HW, HH) + GAP + 6

  const arcChips: ChipSpec[] = arc.map((id, i) => {
    const angle = -Math.PI / 2 + (i / (N - 1)) * (Math.PI / 2) // 12 → 3 o'clock
    const ax = Math.cos(angle) * R
    const ay = Math.sin(angle) * R
    // The 12-o'clock chip sits above the pill (chip's bottom touches the
    // anchor). Every other chip on the arc extends right from its anchor.
    const align: ChipAlign = i === 0 ? 'center-bottom' : 'left-center'
    return { id, label: CHIP_LABELS[id], ax, ay, align }
  })

  return [
    { id: 'rec',  label: CHIP_LABELS.rec,  ax: -(HW + GAP), ay: 0,        align: 'right-center' },
    { id: 'goal', label: CHIP_LABELS.goal, ax: 0,           ay: HH + GAP, align: 'center-top'    },
    ...arcChips,
  ]
}

// Map a ChipId to the engine action that should run when the chip is tapped.
// Returned as a discriminated union so the call site can switch on `kind`.
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
