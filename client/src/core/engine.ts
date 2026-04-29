import type {
  RawEvent,
  RawEventType,
  VisLogEntry,
  GameSession,
  DerivedGameState,
  PlayerId,
  Player,
} from './types'
import { otherTeam } from './types'

// ─── Append-only event log ────────────────────────────────────────────────────
// The rawLog is *only* appended to. EventIds are monotonic per game, assigned
// here when events are stamped onto the log. Callers pass the bare event shape
// (everything but `id` and `timestamp`); we attach those.

/** Bare event input — `id` and `timestamp` are stamped on by `appendEvents`.
 *  The `T extends T` distributes over the union so each member retains its
 *  discriminating `type` field rather than collapsing into a single object. */
export type RawEventInput = RawEvent extends infer T ? (T extends RawEvent ? Omit<T, 'id' | 'timestamp'> : never) : never

function nextEventId(session: GameSession): number {
  if (session.rawLog.length === 0) return 1
  return session.rawLog[session.rawLog.length - 1].id + 1
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
      } else if (
        event.replacement.type !== 'undo'
        && event.replacement.type !== 'amend'
        && event.replacement.type !== 'reorder-line'
      ) {
        entries[idx] = event.replacement
      }
      continue
    }

    // reorder-line is structural display state — kept in rawLog for sync but
    // doesn't surface in the visible event log.
    if (event.type === 'reorder-line') continue

    entries.push(event as VisLogEntry)
  }

  return entries
}

// ─── Derived game state ───────────────────────────────────────────────────────
// Pure function: walks the rawLog (after undo/amend resolution) and computes
// everything. This is the ONLY place game state is computed. The store holds
// rawLog + UI; everything else flows from here.

/** Resolve a list of player-ids to Player records via the team roster. Unknown
 *  ids drop out — useful if a manifest is mid-edit. Tolerates `undefined`
 *  inputs (e.g. from a stale persisted event predating the field). */
function resolveLine(ids: PlayerId[] | undefined, roster: Player[]): Player[] {
  if (!ids || !Array.isArray(ids)) return []
  const byId = new Map(roster.map(p => [p.id, p]))
  const out: Player[] = []
  for (const id of ids) {
    const p = byId.get(id)
    if (p) out.push(p)
  }
  return out
}

export function deriveGameState(session: GameSession): DerivedGameState {
  // We walk session.rawLog directly — including reorder-line — because
  // computeVisLog filters reorder-line out for the visible log, but state
  // derivation needs it.
  const events = resolveLogForDerivation(session.rawLog)
  const receivingTeam = otherTeam(session.gameStartPullingTeam)

  const state: DerivedGameState = {
    gamePhase:  events.length === 0 ? 'pre-game' : 'awaiting-pull',
    score:      { A: 0, B: 0 },
    possession: receivingTeam,
    attackLeft: receivingTeam,
    discHolder: null,
    pointIndex: 0,
    activeLine: { A: [], B: [] },
  }

  for (const event of events) {
    switch (event.type) {
      case 'point-start':
        state.gamePhase = 'awaiting-pull'
        state.discHolder = null
        state.activeLine = {
          A: resolveLine(event.lineA, session.gameConfig.rosters.A),
          B: resolveLine(event.lineB, session.gameConfig.rosters.B),
        }
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
      case 'reorder-line':
        // Both events replace a single team's line with a new ordered list of ids.
        // injury-sub may change membership; reorder-line preserves it. Engine
        // treats them identically — the diff is only meaningful at display time.
        state.activeLine = {
          ...state.activeLine,
          [event.teamId]: resolveLine(event.line, session.gameConfig.rosters[event.teamId]),
        }
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

/** Like computeVisLog but keeps reorder-line events (state derivation needs
 *  them; the visible log doesn't). Resolves undo/amend the same way. */
function resolveLogForDerivation(rawLog: RawEvent[]): Exclude<RawEvent, UndoOrAmend>[] {
  type Resolved = Exclude<RawEvent, UndoOrAmend>
  const entries: Resolved[] = []
  for (const event of rawLog) {
    if (event.type === 'undo') {
      for (let i = entries.length - 1; i >= 0; i--) {
        const e = entries[i]
        if (e.type !== 'system' && e.type !== 'point-start' && e.type !== 'half-time' && e.type !== 'end-game' && e.type !== 'reorder-line') {
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

type UndoOrAmend = Extract<RawEvent, { type: 'undo' | 'amend' }>

// ─── Game status (also derived) ───────────────────────────────────────────────
// status is purely a function of the rawLog — there is no static "this game is
// in-progress" flag on GameConfig. A game is in-progress if any event has been
// recorded; complete once an end-game event lands.

export function deriveGameStatus(session: GameSession | null | undefined): import('./types').GameStatus {
  if (!session || session.rawLog.length === 0) return 'scheduled'
  if (session.rawLog.some(e => e.type === 'end-game')) return 'complete'
  return 'in-progress'
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

    case 'reorder-line':
      // Visual reorder is allowed any time the game is active.
      return state.gamePhase !== 'pre-game' && state.gamePhase !== 'game-over'

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

/** Append-only writer. Stamps each input event with the next monotonic id and a
    shared timestamp, then appends to the rawLog. The only mutation path. */
export function appendEvents(session: GameSession, events: RawEventInput[]): GameSession {
  const startId = nextEventId(session)
  const ts = Date.now()
  const stamped: RawEvent[] = events.map((e, i) => ({ ...e, id: startId + i, timestamp: ts } as RawEvent))
  return { ...session, rawLog: [...session.rawLog, ...stamped] }
}
