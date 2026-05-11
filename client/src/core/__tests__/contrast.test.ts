import { describe, it, expect } from 'vitest'
import { inkOn } from '../contrast'

describe('inkOn', () => {
  it('returns dark ink for white', () => {
    expect(inkOn('#ffffff')).toBe('var(--color-bg)')
    expect(inkOn('#fff')).toBe('var(--color-bg)')
  })

  it('returns light ink for black', () => {
    expect(inkOn('#000000')).toBe('#fff')
    expect(inkOn('#000')).toBe('#fff')
  })

  it('returns light ink for typical saturated team colours', () => {
    expect(inkOn('#1f4788')).toBe('#fff')   // Empire navy
    expect(inkOn('#ff6640')).toBe('#fff')   // Breeze orange
    expect(inkOn('#6e1a1a')).toBe('#fff')   // Gooselings maroon
    expect(inkOn('#d6263a')).toBe('#fff')   // Old Lizards red
  })

  it('returns dark ink for pale fills', () => {
    expect(inkOn('#fefefe')).toBe('var(--color-bg)')
    expect(inkOn('#ffff00')).toBe('var(--color-bg)') // bright yellow — luma high
  })

  it('falls back to light ink for unparseable input', () => {
    expect(inkOn('var(--color-team-a)')).toBe('#fff')
    expect(inkOn('not-a-colour')).toBe('#fff')
    expect(inkOn('')).toBe('#fff')
  })

  it('respects custom light/dark args', () => {
    expect(inkOn('#fff', 'WHITE', 'BLACK')).toBe('BLACK')
    expect(inkOn('#000', 'WHITE', 'BLACK')).toBe('WHITE')
  })
})
