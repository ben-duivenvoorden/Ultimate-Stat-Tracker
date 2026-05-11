// ─── Scheduled games append-only log ──────────────────────────────────────────
// Mirrors core/teams/types.ts: monotonic id + timestamp, no pointIndex.
// Scheduled games are the list users see on GameSetup; the in-progress
// rawLog still lives on GameSession independently.

import type { GameId } from '../types'
import type { GlobalTeamId } from '../teams/types'

export interface BaseScheduledGameEvent {
  id: number
  timestamp: number
}

export interface GameAddEvent extends BaseScheduledGameEvent {
  type:           'game-add'
  gameId:         GameId
  name:           string
  scheduledTime:  string
  teamAGlobalId:  GlobalTeamId
  teamBGlobalId:  GlobalTeamId
  halfTimeAt:     number
  scoreCapAt:     number
}

export interface GameEditEvent extends BaseScheduledGameEvent {
  type:           'game-edit'
  gameId:         GameId
  name?:          string
  scheduledTime?: string
  teamAGlobalId?: GlobalTeamId
  teamBGlobalId?: GlobalTeamId
  halfTimeAt?:    number
  scoreCapAt?:    number
}

/** Soft cancel — hidden from active pickers, kept in the byId map. */
export interface GameCancelEvent extends BaseScheduledGameEvent {
  type:   'game-cancel'
  gameId: GameId
}

export type ScheduledGameEvent = GameAddEvent | GameEditEvent | GameCancelEvent

export type ScheduledGameEventInput =
  ScheduledGameEvent extends infer T
    ? (T extends ScheduledGameEvent ? Omit<T, 'id' | 'timestamp'> : never)
    : never

// ─── Derived shape ────────────────────────────────────────────────────────────

export interface ScheduledGame {
  id:            GameId
  name:          string
  scheduledTime: string
  teamAGlobalId: GlobalTeamId
  teamBGlobalId: GlobalTeamId
  halfTimeAt:    number
  scoreCapAt:    number
  cancelled:     boolean
}
