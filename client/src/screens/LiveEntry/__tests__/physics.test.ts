import { describe, it, expect } from 'vitest'
import {
  rectExitDist,
  computeArrowPath,
  sampleBezier,
  openZoneRects,
  pillHalfWidth,
  pillLabel,
  type ChipSpec,
} from '../Canvas/physics'

describe('rectExitDist', () => {
  it('returns hw / |ux| on horizontal direction', () => {
    expect(rectExitDist(1, 0, 50, 20)).toBeCloseTo(50)
  })
  it('returns hh / |uy| on vertical direction', () => {
    expect(rectExitDist(0, 1, 50, 20)).toBeCloseTo(20)
  })
  it('takes the smaller exit on diagonal — vertical wins for short rects', () => {
    // (1,1) normalised → (0.707, 0.707). hw/|ux| = 70.7, hh/|uy| = 28.3 → 28.3 wins.
    const d = rectExitDist(1, 1, 50, 20)
    expect(d).toBeCloseTo(20)
  })
  it('treats zero component as Infinity (no exit on that axis)', () => {
    expect(rectExitDist(0, 0, 50, 20)).toBe(Infinity)
  })
})

describe('computeArrowPath', () => {
  it('places start and end outside both pill rects (with the visible gap)', () => {
    const a = { hw: 30, hh: 19 }
    const b = { hw: 30, hh: 19 }
    const geom = computeArrowPath(0, 0, 200, 0, a, b)
    // GAP_AB = 8, so start sits at hw + 8 from origin along +x.
    expect(geom.start.x).toBeCloseTo(30 + 8)
    expect(geom.end.x).toBeCloseTo(200 - (30 + 8))
  })

  it('produces an SVG path string and arrowhead points string', () => {
    const geom = computeArrowPath(0, 0, 100, 100, { hw: 20, hh: 19 }, { hw: 20, hh: 19 })
    expect(geom.d).toMatch(/^M [\d.-]+ [\d.-]+ Q [\d.-]+ [\d.-]+ [\d.-]+ [\d.-]+$/)
    expect(geom.head.split(' ')).toHaveLength(3)
  })
})

describe('sampleBezier', () => {
  it('returns n - 1 interior samples (excludes endpoints)', () => {
    const pts = sampleBezier(0, 0, 50, 100, 100, 0, 10)
    expect(pts).toHaveLength(9)
  })
  it('samples are monotonic in t for a straight bezier', () => {
    const pts = sampleBezier(0, 0, 50, 0, 100, 0, 8)
    for (let i = 1; i < pts.length; i++) {
      expect(pts[i].x).toBeGreaterThan(pts[i - 1].x)
    }
  })
})

describe('openZoneRects', () => {
  it('produces 1 + chips.length rects with positive area', () => {
    const chips: ChipSpec[] = [
      { id: 'goal', label: 'Goal',     ax: 0,   ay: 25, align: 'center-top' },
      { id: 'rec',  label: 'Receiver', ax: -40, ay: 0,  align: 'right-center' },
      { id: 'tw',   label: 'Throwaway', ax: 0,  ay: -25, align: 'center-bottom' },
    ]
    const rects = openZoneRects(100, 100, 30, 22, chips)
    expect(rects).toHaveLength(4)
    for (const r of rects) {
      expect(r.r).toBeGreaterThan(r.l)
      expect(r.b).toBeGreaterThan(r.t)
    }
  })
})

describe('pillLabel', () => {
  it('returns the full name regardless of length', () => {
    expect(pillLabel('Wen')).toBe('Wen')
    expect(pillLabel('Stephanopoulos')).toBe('Stephanopoulos')
  })
})

describe('pillHalfWidth', () => {
  it('grows with name length (longer name → wider pill)', () => {
    const short = pillHalfWidth('Wen')
    const long  = pillHalfWidth('Stephanopoulos')
    expect(long).toBeGreaterThan(short)
  })
})
