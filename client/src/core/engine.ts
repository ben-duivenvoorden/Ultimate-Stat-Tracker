import type {
  RawEvent,
  RawEventType,
  VisLogEntry,
  GameSession,
  DerivedGameState,
  GamePhase,
  Score,
  TeamId,
  PlayerId,
  EventId,
} from './types'
import { otherTeam } from './types'

// ─── ID generation ────────────────────────────────────────────────────────────

export function makeEventId(): EventId {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function baseRawEvent(pointIndex: number): { id: EventId; timestamp: number; pointIndex: number } {
  return { id: makeEventId(), timestamp: Date.now(), pointIndex }
}

// ─── Visual log derivation ────────────────────────────────────────────────────
// Resolves the raw log into the list of entries that the recorder sees.
// Undo entries pop the most recent visible entry. Amend entries replace by ID.

export function computeVisLog(rawLog: RawEvent[]): VisLogEntry[] {
  const entries: VisLogEntry[] = []

  for (const event of rawLog) {
    if (event.type === 'undo') {
      // Pop the most recent visible non-system entry.
      // Note: 'point-start' and 'system' / 'half-time' / 'end-game' are kept around
      // because they're structural — undoing a point-start would corrupt phase tracking.
      for (let i = entries.length - 1; i >= 0; i--) {
        const e = entries[i]
        if (e.type !== 'system' && e.type !== 'point-start' && e.type !== 'half-time' && e.type !== 'end-game') {
          entries.splice(i, 1)
          break
        }
      }
      continue
    }

    if (event.type === 'amend') {
      const idx = entries.findIndex(e => e.id === event.targetEventId)
      if (idx === -1) continue
      if (event.replacement === null) {
        entries.splice(idx, 1)
      } else if (event.replacement.type !== 'undo' && event.replacement.type !== 'amend') {
        entries[idx] = event.replacement
      }
      continue
    }

    entries.push(event)
  }

  return entries
}

// ─── Derived game state ───────────────────────────────────────────────────────
// Pure function: walks the resolved visual log and computes everything.
// This is the ONLY place game state is computed. The store holds raw log + UI;
// everything else flows from here.

export function deriveGameState(session: GameSession): DerivedGameState {
  const visLog = computeVisLog(session.rawLog)
  const receivingTeam = otherTeam(session.gameStartPullingTeam)

  const state: {
    gamePhase: GamePhase
    score: Score
    possession: TeamId
    attackLeft: TeamId
    discHolder: PlayerId | null
    pointIndex: number
  } = {
    gamePhase:  visLog.length === 0 ? 'pre-game' : 'awaiting-pull',
    score:      { A: 0, B: 0 },
    possession: receivingTeam,
    attackLeft: receivingTeam,
    discHolder: null,
    pointIndex: 0,
  }

  for (const event of visLog) {
    switch (event.type) {
      case 'point-start':
        state.gamePhase = 'awaiting-pull'
        state.discHolder = null
        break

      case 'pull':
      case 'pull-bonus':
        state.gamePhase = 'in-play'
        state.discHolder = null
        // possession is already the receiving team — pull doesn't change it
        break

      case 'possession':
        state.discHolder = event.playerId
        state.possession = event.teamId
        break

      case 'turnover-throw-away':
      case 'turnover-receiver-error':
      case 'turnover-stall':
        state.possession = otherTeam(state.possession)
        state.discHolder = null
        break

      case 'block':
        state.possession = event.teamId
        state.discHolder = null
        break

      case 'intercept':
        // event.teamId is the intercepting team — possession flips to them
        // The interceptor (event.playerId) immediately has the disc
        state.possession = event.teamId
        state.discHolder = event.playerId
        break

      case 'goal':
        state.score = { ...state.score, [event.teamId]: state.score[event.teamId] + 1 }
        state.pointIndex++
        state.gamePhase = 'point-over'
        state.discHolder = null
        // Next point: scoring team pulls; other team receives & attacks left
        state.possession = otherTeam(event.teamId)
        state.attackLeft = otherTeam(event.teamId)
        break

      case 'injury-sub':
        // Active line update is handled outside the engine (mutates session.activeLine)
        break

      case 'half-time':
        state.gamePhase = 'half-time'
        // Second half: team that did NOT pull at game start now pulls
        // → team that pulled at game start now receives
        state.possession = session.gameStartPullingTeam
        state.attackLeft = session.gameStartPullingTeam
        break

      case 'end-game':
        state.gamePhase = 'game-over'
        break

      case 'foul':
      case 'pick':
      case 'timeout':
        // Stoppages — logged but no state change
        break

      case 'system':
        // Metadata only — no state change
        break
    }
  }

  return state
}

// ─── Validation ───────────────────────────────────────────────────────────────
// Single source of truth for "is this event allowed right now".
// UI uses this to enable/disable controls; amend logic uses it to reject invalid
// resulting sequences.

export function canRecord(state: DerivedGameState, eventType: RawEventType): boolean {
  switch (eventType) {
    case 'point-start':
      return state.gamePhase === 'pre-game'
          || state.gamePhase === 'point-over'
          || state.gamePhase === 'half-time'

    case 'pull':
    case 'pull-bonus':
      return state.gamePhase === 'awaiting-pull'

    case 'possession':
      return state.gamePhase === 'in-play'

    case 'turnover-throw-away':
    case 'turnover-receiver-error':
    case 'turnover-stall':
    case 'goal':
      return state.gamePhase === 'in-play' && state.discHolder !== null

    case 'block':
    case 'intercept':
      return state.gamePhase === 'in-play'

    case 'injury-sub':
      return state.gamePhase === 'in-play' || state.gamePhase === 'awaiting-pull'

    case 'half-time':
    case 'end-game':
      return state.gamePhase === 'in-play' || state.gamePhase === 'awaiting-pull'

    case 'foul':
    case 'pick':
    case 'timeout':
      return state.gamePhase === 'in-play' || state.gamePhase === 'awaiting-pull'

    case 'system':
    case 'undo':
    case 'amend':
      return true
  }
}

// ─── Append helpers ───────────────────────────────────────────────────────────

export function appendEvents(session: GameSession, events: RawEvent[]): GameSession {
  return { ...session, rawLog: [...session.rawLog, ...events] }
}
