// ─── Primitives ───────────────────────────────────────────────────────────────

export type TeamId   = 'A' | 'B'
export type PlayerId = string
export type GameId   = number
export type EventId  = string

export const otherTeam = (t: TeamId): TeamId => (t === 'A' ? 'B' : 'A')

// ─── Domain entities ──────────────────────────────────────────────────────────

export interface Team {
  id: TeamId
  name: string
  short: string
  color: string
}

export interface Player {
  id: PlayerId
  name: string
  teamId: TeamId
  jerseyNumber?: number
  photoUrl?: string
}

export interface Score {
  A: number
  B: number
}

// ─── Raw event log ────────────────────────────────────────────────────────────
// Append-only. Never mutated. Single source of truth for game history.

export type RawEventType =
  | 'point-start'              // marks the start of a new point (between goal and pull)
  | 'pull'
  | 'pull-bonus'
  | 'possession'
  | 'turnover-throw-away'
  | 'turnover-receiver-error'
  | 'block'
  | 'intercept'
  | 'goal'
  | 'injury-sub'
  | 'half-time'
  | 'end-game'
  | 'foul'
  | 'pick'
  | 'system'
  | 'undo'
  | 'amend'

interface BaseRawEvent {
  id: EventId
  timestamp: number
  pointIndex: number
}

export interface PointStartRawEvent extends BaseRawEvent { type: 'point-start' }
export interface PullRawEvent       extends BaseRawEvent { type: 'pull' | 'pull-bonus'; playerId: PlayerId; teamId: TeamId }
export interface PossessionRawEvent extends BaseRawEvent { type: 'possession';          playerId: PlayerId; teamId: TeamId }
export interface TurnoverRawEvent   extends BaseRawEvent { type: 'turnover-throw-away' | 'turnover-receiver-error'; playerId: PlayerId; teamId: TeamId }
export interface BlockRawEvent      extends BaseRawEvent { type: 'block' | 'intercept'; playerId: PlayerId; teamId: TeamId }
export interface GoalRawEvent       extends BaseRawEvent { type: 'goal';                playerId: PlayerId; teamId: TeamId }
export interface InjurySubRawEvent  extends BaseRawEvent { type: 'injury-sub';          outPlayerId: PlayerId; inPlayerId: PlayerId; teamId: TeamId }
export interface HalfTimeRawEvent   extends BaseRawEvent { type: 'half-time' }
export interface EndGameRawEvent    extends BaseRawEvent { type: 'end-game' }
export interface FoulRawEvent       extends BaseRawEvent { type: 'foul' }
export interface PickRawEvent       extends BaseRawEvent { type: 'pick' }
export interface SystemRawEvent     extends BaseRawEvent { type: 'system'; text: string }
export interface UndoRawEvent       extends BaseRawEvent { type: 'undo' }
export interface AmendRawEvent      extends BaseRawEvent { type: 'amend'; targetEventId: EventId; replacement: RawEvent | null }

export type RawEvent =
  | PointStartRawEvent
  | PullRawEvent
  | PossessionRawEvent
  | TurnoverRawEvent
  | BlockRawEvent
  | GoalRawEvent
  | InjurySubRawEvent
  | HalfTimeRawEvent
  | EndGameRawEvent
  | FoulRawEvent
  | PickRawEvent
  | SystemRawEvent
  | UndoRawEvent
  | AmendRawEvent

// ─── Visual log ───────────────────────────────────────────────────────────────
// Same shape as RawEvent minus undo/amend (those resolve into the visible list).
// Structured — no formatted strings. UI layer formats via format.ts.

export type VisLogEntry = Exclude<RawEvent, UndoRawEvent | AmendRawEvent>

// ─── Derived game state ───────────────────────────────────────────────────────

export type GamePhase =
  | 'pre-game'        // no events yet (line not confirmed for first point)
  | 'awaiting-pull'   // point-start recorded, waiting for pull
  | 'in-play'         // pull recorded, point in progress
  | 'point-over'      // goal scored mid-game, awaiting next-point line selection
  | 'half-time'       // half-time reached
  | 'game-over'       // end-game

export interface DerivedGameState {
  gamePhase: GamePhase
  score: Score
  possession: TeamId          // team currently entitled to disc (or about to receive)
  attackLeft: TeamId          // team currently attacking left → right (UI orientation)
  discHolder: PlayerId | null // null between possession events / turnovers
  pointIndex: number          // total goals scored so far
}

// ─── Transient UI state (lives in store, not derived) ─────────────────────────

export type UiMode =
  | 'idle'               // default — no special interaction in progress
  | 'block-pick'         // recorder tapped "Defensive Block", picking blocker
  | 'intercept-pick'     // recorder tapped "Defensive Intercept", picking interceptor
  | 'injury-pick'        // recorder tapped "Injury Sub", picking injured player

export type AppScreen = 'game-setup' | 'game-settings' | 'line-selection' | 'live-entry'

// ─── Recording options ────────────────────────────────────────────────────────

export interface RecordingOptions {
  pullBonus: boolean
  foul:      boolean
  pick:      boolean
}

export const DEFAULT_RECORDING_OPTIONS: RecordingOptions = {
  pullBonus: true,
  foul:      false,
  pick:      false,
}

// ─── Game config & session ────────────────────────────────────────────────────

export interface GameConfig {
  id: GameId
  name: string
  scheduledTime: string
  status: 'scheduled' | 'in-progress' | 'complete'
  score?: Score
  teams: Record<TeamId, Team>
  rosters: Record<TeamId, Player[]>
  halfTimeAt: number
  scoreCapAt: number
}

export interface ActiveLine {
  A: Player[]
  B: Player[]
}

export interface GameSession {
  gameConfig: GameConfig
  gameStartPullingTeam: TeamId
  rawLog: RawEvent[]
  activeLine: ActiveLine
}
