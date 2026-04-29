import { describe, it, expect } from 'vitest'
import { computeVisLog, deriveGameState, canRecord, appendEvents, baseRawEvent } from '../engine'
import type { GameSession, RawEvent } from '../types'
import { MOCK_GAMES } from '../data'

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makeSession(pullingTeam: 'A' | 'B' = 'A'): GameSession {
  const config = MOCK_GAMES[0]
  return {
    gameConfig:           config,
    gameStartPullingTeam: pullingTeam,
    rawLog:               [],
    activeLine: {
      A: config.rosters.A.slice(0, 7),
      B: config.rosters.B.slice(0, 7),
    },
  }
}

let counter = 0
function id() { return `e${++counter}` }

function ev(partial: Omit<RawEvent, 'id' | 'timestamp'> & { pointIndex?: number }): RawEvent {
  return { id: id(), timestamp: 0, pointIndex: 0, ...partial } as RawEvent
}

// ─── computeVisLog ────────────────────────────────────────────────────────────

describe('computeVisLog', () => {
  it('returns empty for empty raw log', () => {
    expect(computeVisLog([])).toEqual([])
  })

  it('passes through normal events', () => {
    const events: RawEvent[] = [
      ev({ type: 'point-start' }),
      ev({ type: 'pull', playerId: 'a1', teamId: 'A' }),
    ]
    expect(computeVisLog(events)).toHaveLength(2)
  })

  it('undo removes the most recent visible non-system event', () => {
    const events: RawEvent[] = [
      ev({ type: 'point-start' }),
      ev({ type: 'pull', playerId: 'a1', teamId: 'A' }),
      ev({ type: 'possession', playerId: 'b1', teamId: 'B' }),
      ev({ type: 'undo' }),
    ]
    const vis = computeVisLog(events)
    expect(vis).toHaveLength(2)
    expect(vis[1].type).toBe('pull')
  })

  it('undo skips structural entries (point-start, half-time, end-game)', () => {
    const events: RawEvent[] = [
      ev({ type: 'point-start' }),
      ev({ type: 'undo' }),
    ]
    // point-start is structural, undo finds nothing else, leaves it alone
    expect(computeVisLog(events)).toHaveLength(1)
    expect(computeVisLog(events)[0].type).toBe('point-start')
  })

  it('multiple undos pop sequentially', () => {
    const events: RawEvent[] = [
      ev({ type: 'point-start' }),
      ev({ type: 'pull', playerId: 'a1', teamId: 'A' }),
      ev({ type: 'possession', playerId: 'b1', teamId: 'B' }),
      ev({ type: 'possession', playerId: 'b2', teamId: 'B' }),
      ev({ type: 'undo' }),
      ev({ type: 'undo' }),
    ]
    const vis = computeVisLog(events)
    expect(vis.map(e => e.type)).toEqual(['point-start', 'pull'])
  })
})

// ─── deriveGameState ──────────────────────────────────────────────────────────

describe('deriveGameState', () => {
  it('initial: pre-game with receiving team in possession', () => {
    const session = makeSession('A')  // A pulls, B receives
    const state = deriveGameState(session)
    expect(state.gamePhase).toBe('pre-game')
    expect(state.possession).toBe('B')
    expect(state.attackLeft).toBe('B')
    expect(state.score).toEqual({ A: 0, B: 0 })
    expect(state.discHolder).toBeNull()
  })

  it('after point-start: awaiting-pull', () => {
    let session = makeSession('A')
    session = appendEvents(session, [{ ...baseRawEvent(0), type: 'point-start' }])
    expect(deriveGameState(session).gamePhase).toBe('awaiting-pull')
  })

  it('after pull: in-play', () => {
    let session = makeSession('A')
    session = appendEvents(session, [
      { ...baseRawEvent(0), type: 'point-start' },
      { ...baseRawEvent(0), type: 'pull', playerId: 'a1', teamId: 'A' },
    ])
    expect(deriveGameState(session).gamePhase).toBe('in-play')
  })

  it('possession event sets discHolder', () => {
    let session = makeSession('A')
    session = appendEvents(session, [
      { ...baseRawEvent(0), type: 'point-start' },
      { ...baseRawEvent(0), type: 'pull', playerId: 'a1', teamId: 'A' },
      { ...baseRawEvent(0), type: 'possession', playerId: 'b1', teamId: 'B' },
    ])
    const state = deriveGameState(session)
    expect(state.discHolder).toBe('b1')
    expect(state.possession).toBe('B')
  })

  it('turnover flips possession and clears discHolder', () => {
    let session = makeSession('A')
    session = appendEvents(session, [
      { ...baseRawEvent(0), type: 'point-start' },
      { ...baseRawEvent(0), type: 'pull', playerId: 'a1', teamId: 'A' },
      { ...baseRawEvent(0), type: 'possession', playerId: 'b1', teamId: 'B' },
      { ...baseRawEvent(0), type: 'turnover-throw-away', playerId: 'b1', teamId: 'B' },
    ])
    const state = deriveGameState(session)
    expect(state.possession).toBe('A')
    expect(state.discHolder).toBeNull()
  })

  it('block sets possession to defending team', () => {
    let session = makeSession('A')
    session = appendEvents(session, [
      { ...baseRawEvent(0), type: 'point-start' },
      { ...baseRawEvent(0), type: 'pull', playerId: 'a1', teamId: 'A' },
      { ...baseRawEvent(0), type: 'possession', playerId: 'b1', teamId: 'B' },
      { ...baseRawEvent(0), type: 'block', playerId: 'a3', teamId: 'A' },
    ])
    const state = deriveGameState(session)
    expect(state.possession).toBe('A')
    expect(state.discHolder).toBeNull()
  })

  it('goal increments score, transitions to point-over, sets up next point', () => {
    let session = makeSession('A')
    session = appendEvents(session, [
      { ...baseRawEvent(0), type: 'point-start' },
      { ...baseRawEvent(0), type: 'pull', playerId: 'a1', teamId: 'A' },
      { ...baseRawEvent(0), type: 'possession', playerId: 'b1', teamId: 'B' },
      { ...baseRawEvent(0), type: 'goal', playerId: 'b1', teamId: 'B' },
    ])
    const state = deriveGameState(session)
    expect(state.score).toEqual({ A: 0, B: 1 })
    expect(state.gamePhase).toBe('point-over')
    expect(state.possession).toBe('A')      // A receives next (B scored, B pulls)
    expect(state.attackLeft).toBe('A')      // A attacks left now
    expect(state.discHolder).toBeNull()
    expect(state.pointIndex).toBe(1)
  })

  it('half-time sets possession to game-start pulling team', () => {
    let session = makeSession('A')
    // Simulate 8 goals (assume halfTimeAt is 8 from MOCK_GAMES)
    session = appendEvents(session, [
      { ...baseRawEvent(0), type: 'point-start' },
      { ...baseRawEvent(0), type: 'goal', playerId: 'b1', teamId: 'B' },
      { ...baseRawEvent(1), type: 'half-time' },
    ])
    const state = deriveGameState(session)
    expect(state.gamePhase).toBe('half-time')
    expect(state.possession).toBe('A')   // A pulled first → A receives in 2nd half
    expect(state.attackLeft).toBe('A')
  })

  it('end-game makes phase game-over', () => {
    let session = makeSession('A')
    session = appendEvents(session, [
      { ...baseRawEvent(0), type: 'point-start' },
      { ...baseRawEvent(0), type: 'goal', playerId: 'b1', teamId: 'B' },
      { ...baseRawEvent(1), type: 'end-game' },
    ])
    const state = deriveGameState(session)
    expect(state.gamePhase).toBe('game-over')
  })

  it('undo reverses a goal correctly', () => {
    let session = makeSession('A')
    session = appendEvents(session, [
      { ...baseRawEvent(0), type: 'point-start' },
      { ...baseRawEvent(0), type: 'pull', playerId: 'a1', teamId: 'A' },
      { ...baseRawEvent(0), type: 'possession', playerId: 'b1', teamId: 'B' },
      { ...baseRawEvent(0), type: 'goal', playerId: 'b1', teamId: 'B' },
      { ...baseRawEvent(0), type: 'undo' },
    ])
    const state = deriveGameState(session)
    expect(state.score).toEqual({ A: 0, B: 0 })
    expect(state.gamePhase).toBe('in-play')
    expect(state.possession).toBe('B')
    expect(state.discHolder).toBe('b1')
  })
})

// ─── canRecord ────────────────────────────────────────────────────────────────

describe('canRecord', () => {
  it('blocks pull when not in awaiting-pull phase', () => {
    let session = makeSession('A')
    session = appendEvents(session, [
      { ...baseRawEvent(0), type: 'point-start' },
      { ...baseRawEvent(0), type: 'pull', playerId: 'a1', teamId: 'A' },
    ])
    const state = deriveGameState(session)
    expect(canRecord(state, 'pull')).toBe(false)
  })

  it('allows pull in awaiting-pull phase', () => {
    let session = makeSession('A')
    session = appendEvents(session, [{ ...baseRawEvent(0), type: 'point-start' }])
    const state = deriveGameState(session)
    expect(canRecord(state, 'pull')).toBe(true)
  })

  it('blocks goal when no disc holder', () => {
    let session = makeSession('A')
    session = appendEvents(session, [
      { ...baseRawEvent(0), type: 'point-start' },
      { ...baseRawEvent(0), type: 'pull', playerId: 'a1', teamId: 'A' },
    ])
    const state = deriveGameState(session)
    expect(canRecord(state, 'goal')).toBe(false)
  })

  it('allows goal when disc holder is set in-play', () => {
    let session = makeSession('A')
    session = appendEvents(session, [
      { ...baseRawEvent(0), type: 'point-start' },
      { ...baseRawEvent(0), type: 'pull', playerId: 'a1', teamId: 'A' },
      { ...baseRawEvent(0), type: 'possession', playerId: 'b1', teamId: 'B' },
    ])
    const state = deriveGameState(session)
    expect(canRecord(state, 'goal')).toBe(true)
  })

  it('blocks new events after end-game', () => {
    let session = makeSession('A')
    session = appendEvents(session, [
      { ...baseRawEvent(0), type: 'point-start' },
      { ...baseRawEvent(0), type: 'goal', playerId: 'b1', teamId: 'B' },
      { ...baseRawEvent(1), type: 'end-game' },
    ])
    const state = deriveGameState(session)
    expect(canRecord(state, 'pull')).toBe(false)
    expect(canRecord(state, 'goal')).toBe(false)
    expect(canRecord(state, 'half-time')).toBe(false)
  })
})
