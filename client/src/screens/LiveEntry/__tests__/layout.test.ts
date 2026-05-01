import { describe, it, expect } from 'vitest'
import { buildActions, chipAction, CHIP_LABELS } from '../Canvas/layout'

describe('buildActions — in-play (stall hidden)', () => {
  const chips = buildActions(40, { phase: 'in-play', stallShown: false })

  it('returns 5 chips: rec + goal + (tw, blk, int)', () => {
    expect(chips.map(c => c.id).sort()).toEqual(['blk', 'goal', 'int', 'rec', 'tw'])
  })

  it('places Receiver Error to the left of the pill', () => {
    const rec = chips.find(c => c.id === 'rec')!
    expect(rec.ax).toBeLessThan(0)
    expect(rec.ay).toBe(0)
    expect(rec.align).toBe('right-center')
  })

  it('places Goal directly below the pill', () => {
    const goal = chips.find(c => c.id === 'goal')!
    expect(goal.ax).toBe(0)
    expect(goal.ay).toBeGreaterThan(0)
    expect(goal.align).toBe('center-top')
  })

  it('places Throwaway directly above the pill', () => {
    const tw = chips.find(c => c.id === 'tw')!
    expect(tw.ax).toBeCloseTo(0)
    expect(tw.ay).toBeLessThan(0)
    expect(tw.align).toBe('center-bottom')
  })

  it('places Block and Intercept on the right side of the pill', () => {
    const blk = chips.find(c => c.id === 'blk')!
    const int = chips.find(c => c.id === 'int')!
    expect(blk.ax).toBeGreaterThan(0)
    expect(int.ax).toBeGreaterThan(0)
    expect(int.ay).toBeGreaterThan(blk.ay) // Intercept is below Block (further down the arc)
    expect(blk.align).toBe('left-center')
    expect(int.align).toBe('left-center')
  })
})

describe('buildActions — in-play (stall shown)', () => {
  const chips = buildActions(40, { phase: 'in-play', stallShown: true })

  it('inserts Stall between Throwaway and Block on the arc', () => {
    expect(chips.map(c => c.id).sort()).toEqual(['blk', 'goal', 'int', 'rec', 'st', 'tw'])
    const tw  = chips.find(c => c.id === 'tw')!
    const st  = chips.find(c => c.id === 'st')!
    const blk = chips.find(c => c.id === 'blk')!
    expect(st.ay).toBeGreaterThan(tw.ay)   // Stall lower on screen than Throwaway
    expect(st.ay).toBeLessThan(blk.ay)     // Stall higher on screen than Block
    expect(st.ax).toBeGreaterThan(tw.ax)   // Stall to the right of Throwaway
  })
})

describe('buildActions — awaiting-pull', () => {
  it('returns Pull only when bonus is hidden', () => {
    const chips = buildActions(40, { phase: 'awaiting-pull', bonusShown: false })
    expect(chips.map(c => c.id)).toEqual(['pull'])
    expect(chips[0].label).toBe(CHIP_LABELS.pull)
  })

  it('returns Pull + Pull Bonus when bonus is shown', () => {
    const chips = buildActions(40, { phase: 'awaiting-pull', bonusShown: true })
    expect(chips.map(c => c.id)).toEqual(['pull', 'pull-bonus'])
    expect(chips.find(c => c.id === 'pull-bonus')!.ax).toBeGreaterThan(0)
  })
})

describe('chipAction', () => {
  it('maps chip ids to engine action descriptors', () => {
    expect(chipAction('pull')).toEqual({ kind: 'pull', bonus: false })
    expect(chipAction('pull-bonus')).toEqual({ kind: 'pull', bonus: true })
    expect(chipAction('tw')).toEqual({ kind: 'throwaway' })
    expect(chipAction('goal')).toEqual({ kind: 'goal' })
    expect(chipAction('st')).toEqual({ kind: 'stall' })
    expect(chipAction('blk')).toEqual({ kind: 'def-block', type: 'block' })
    expect(chipAction('int')).toEqual({ kind: 'def-block', type: 'intercept' })
    expect(chipAction('rec')).toEqual({ kind: 'receiver-error' })
  })
})
