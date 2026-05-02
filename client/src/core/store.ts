import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  AppScreen,
  UiMode,
  TeamId,
  PlayerId,
  EventId,
  Player,
  GameSession,
  RecordingOptions,
  DerivedGameState,
} from './types'
import type { PillSize } from '@/screens/LiveEntry/Canvas/constants'
import { PILL_SIZE_CYCLE } from '@/screens/LiveEntry/Canvas/constants'
import { otherTeam, DEFAULT_RECORDING_OPTIONS } from './types'
import {
  deriveGameState,
  canRecord,
  appendEvents,
  type RawEventInput,
} from './engine'
import { PICK_MODES, isPickMode } from './pickModes'
import { MOCK_GAMES } from './data'

// ─── Store shape ──────────────────────────────────────────────────────────────
// Keep this minimal — game state derives from session.rawLog via the engine.
// Only true UI state lives here.

interface GameStore {
  // Persisted
  session: GameSession | null
  screen: AppScreen
  isInjurySub: boolean
  uiMode: UiMode
  selPuller: PlayerId | null
  recordingOptions: RecordingOptions
  /** When true, Team A and Team B render on opposite sides of the screen.
   *  Per-device display preference — never goes on the wire. */
  swapSides: boolean
  /** Player pill size — per-device display preference. */
  pillSize: PillSize

  // Transient (not persisted)
  showEventMenu: boolean
  /** Cursor for the tap-to-truncate preview. null = live mode; otherwise the
   *  eventId after which entries are greyed in the log and the canvas
   *  reflects the state at that point. Cleared the moment new activity is
   *  recorded — the action prepends a `truncate` event so the dropped tail
   *  is committed atomically with whatever the user did next. */
  truncateCursor: EventId | null

  // Game / session actions
  selectGame:        (gameId: number, pullingTeam: TeamId) => void
  resumeGame:        (gameId: number) => void
  confirmLine:       (lineA: Player[], lineB: Player[]) => void
  nextPoint:         () => void
  backToGameList:    () => void
  reorderActiveLine: (teamId: TeamId, fromIdx: number, toIdx: number) => void

  // Recording actions (all funnel through canRecord guards)
  tapPlayer:            (player: Player) => void
  recordPull:           (bonus?: boolean) => void
  recordBrick:          () => void
  recordThrowAway:      () => void
  triggerReceiverError: () => void
  recordGoal:           () => void
  triggerDefBlock:      (type: 'block' | 'intercept') => void
  recordFoul:          () => void
  recordPick:          () => void
  recordStall:         () => void
  recordTimeout:       () => void
  undo:                () => void
  triggerHalfTime:     () => void
  triggerEndGame:      () => void
  triggerInjurySub:    () => void
  cancelPickMode:      () => void

  // Settings
  openGameSettings:      () => void
  closeGameSettings:     () => void
  updateRecordingOption: <K extends keyof RecordingOptions>(key: K, value: RecordingOptions[K]) => void

  // Pure UI
  setShowEventMenu:    (show: boolean) => void
  toggleSwapSides:     () => void
  cyclePillSize:       () => void
  setTruncateCursor:   (cursor: EventId | null) => void
}

// ─── Persistence ──────────────────────────────────────────────────────────────

const STORAGE_VERSION = 5
const STORAGE_KEY     = 'ust-game'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function freshSession(gameId: number, pullingTeam: TeamId): GameSession | null {
  const config = MOCK_GAMES.find(g => g.id === gameId)
  if (!config) return null
  // The active line lives in the rawLog (point-start carries lineA/lineB).
  // freshSession only sets up the empty session shell.
  return {
    gameConfig:           config,
    gameStartPullingTeam: pullingTeam,
    rawLog:               [],
  }
}

/** Default seed for the line-selection screen on a *fresh* point: first 4 males + 3 females. */
export function seedDefaultLine(roster: Player[]): Player[] {
  const males   = roster.filter(p => p.gender === 'M').slice(0, 4)
  const females = roster.filter(p => p.gender === 'F').slice(0, 3)
  return [...males, ...females]
}

function sameLine(a: PlayerId[], b: PlayerId[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

// Returns a session that looks as if it ended at the cursor. Used by
// canRecord-via-recordVia and useDerivedState so both the record decision
// and the on-screen state reflect the historical view.
export function effectiveSession(session: GameSession, cursor: EventId | null): GameSession {
  return cursor === null ? session : { ...session, rawLog: session.rawLog.filter(e => e.id <= cursor) }
}

// ─── recordVia ────────────────────────────────────────────────────────────────
// Common funnel for actions that append events. Reads the derived state at
// the truncate cursor (or live), lets the caller's `build` decide whether to
// record (returning null aborts), then commits the events plus any extra
// state in a single set(). Side-effect fields like `selPuller` /
// `showEventMenu` go through `extra` so they only fire on success — matching
// the pre-refactor per-action behaviour.
//
// When the truncate cursor is set, a structural `truncate` event is prepended
// so the dropped tail is committed atomically with whatever the user did
// next, and the cursor clears. (Undoing while previewing produces
// `[truncate, undo]` — drop forward, then nudge one more back.)
function recordVia(
  get: () => GameStore,
  set: (partial: Partial<GameStore>) => void,
  build: (state: DerivedGameState) => RawEventInput[] | null,
  extra?: Partial<GameStore>,
): boolean {
  const { session, truncateCursor } = get()
  if (!session) return false
  const state = deriveGameState(effectiveSession(session, truncateCursor))
  const events = build(state)
  if (!events || events.length === 0) return false
  const head: RawEventInput[] = truncateCursor !== null
    ? [{ pointIndex: state.pointIndex, type: 'truncate', truncateAfterId: truncateCursor }]
    : []
  set({
    session: appendEvents(session, [...head, ...events]),
    truncateCursor: null,
    ...extra,
  })
  return true
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      // Initial state
      session:          null,
      screen:           'game-setup',
      isInjurySub:      false,
      uiMode:           'idle',
      selPuller:        null,
      showEventMenu:    false,
      truncateCursor:   null,
      recordingOptions: DEFAULT_RECORDING_OPTIONS,
      swapSides:        false,
      pillSize:         'md',

      // ── selectGame ──────────────────────────────────────────────────────────
      // Start a fresh game session (overwrites any existing one).
      selectGame(gameId, pullingTeam) {
        const session = freshSession(gameId, pullingTeam)
        if (!session) return
        set({
          session,
          screen:         'line-selection',
          isInjurySub:    false,
          uiMode:         'idle',
          selPuller:      null,
          showEventMenu:  false,
          truncateCursor: null,
        })
      },

      // ── resumeGame ──────────────────────────────────────────────────────────
      // Continue an in-progress game without resetting the log.
      // (For now, requires that the persisted session matches the gameId —
      //  later this will fetch from a server.)
      resumeGame(gameId) {
        const { session } = get()
        if (session && session.gameConfig.id === gameId) {
          set({ screen: 'live-entry', uiMode: 'idle', selPuller: null, showEventMenu: false })
        } else {
          // No persisted session for this game — fall back to fresh start.
          // Caller should re-prompt for pulling team.
        }
      },

      // ── confirmLine ─────────────────────────────────────────────────────────
      // Encodes the on-field line-up directly into the rawLog. For a new point,
      // emits 'point-start' carrying lineA/lineB. For an injury sub mid-point,
      // emits a separate 'injury-sub' event for each team whose line changed.
      confirmLine(lineA, lineB) {
        const { session, isInjurySub } = get()
        if (!session) return

        const state = deriveGameState(session)
        const idsA  = lineA.map(p => p.id)
        const idsB  = lineB.map(p => p.id)

        if (isInjurySub) {
          const events: RawEventInput[] = []
          // Diff against current activeLine — only emit per-team events when changed.
          if (!sameLine(idsA, state.activeLine.A.map(p => p.id))) {
            events.push({ pointIndex: state.pointIndex, type: 'injury-sub', teamId: 'A', line: idsA })
          }
          if (!sameLine(idsB, state.activeLine.B.map(p => p.id))) {
            events.push({ pointIndex: state.pointIndex, type: 'injury-sub', teamId: 'B', line: idsB })
          }
          set({
            session: events.length === 0 ? session : appendEvents(session, events),
            screen:  'live-entry',
            isInjurySub: false,
            uiMode:  'idle',
          })
          return
        }

        // Normal line confirmation: start the next point with the agreed line-up.
        const updatedSession = appendEvents(session, [
          { pointIndex: state.pointIndex, type: 'point-start', lineA: idsA, lineB: idsB },
        ])
        set({
          session:   updatedSession,
          screen:    'live-entry',
          uiMode:    'idle',
          selPuller: null,
        })
      },

      // ── tapPlayer ───────────────────────────────────────────────────────────
      tapPlayer(player) {
        const { session, uiMode, truncateCursor } = get()
        if (!session) return
        // Branch on the cursor-aware state so the canvas tap matches what the
        // user is looking at; recordVia takes care of the truncate prepend.
        const state = deriveGameState(effectiveSession(session, truncateCursor))

        // Pick-mode dispatch — registry-driven (see core/pickModes.ts).
        // Pick triggers clear the cursor before this fires, so the cursor is
        // null here and recordVia behaves like a normal append.
        if (isPickMode(uiMode)) {
          const pickMode = uiMode
          recordVia(get, set, s => {
            const { onTap } = PICK_MODES[pickMode]
            if (!canRecord(s, onTap.eventType)) return null
            // Receiver Error can't be the thrower — guard against UI bypass
            if (onTap.eventType === 'turnover-receiver-error' && player.id === s.discHolder) return null
            const teamId = onTap.team === 'defending' ? otherTeam(s.possession) : s.possession
            return [{
              pointIndex: s.pointIndex,
              type:     onTap.eventType,
              playerId: player.id,
              teamId,
            } as RawEventInput]
          }, { uiMode: 'idle' })
          return
        }

        // Awaiting pull: select / deselect puller
        if (state.gamePhase === 'awaiting-pull') {
          const { selPuller } = get()
          set({ selPuller: selPuller === player.id ? null : player.id })
          return
        }

        // Pass chain: tap = possession transfer
        if (state.gamePhase === 'in-play') {
          recordVia(get, set, s => {
            if (!canRecord(s, 'possession')) return null
            // Don't record if they already have possession
            if (s.discHolder === player.id) return null
            return [{
              pointIndex: s.pointIndex,
              type:     'possession',
              playerId: player.id,
              teamId:   s.possession,
            }]
          })
          return
        }
      },

      // ── recordPull ──────────────────────────────────────────────────────────
      recordPull(bonus = false) {
        const { selPuller } = get()
        if (!selPuller) return
        recordVia(get, set, state => {
          if (!canRecord(state, 'pull')) return null
          const pullingTeam = otherTeam(state.possession)
          return [{
            pointIndex: state.pointIndex,
            type:     bonus ? 'pull-bonus' : 'pull',
            playerId: selPuller,
            teamId:   pullingTeam,
          }]
        }, { selPuller: null })
      },

      // ── recordBrick ─────────────────────────────────────────────────────────
      // Pull went out of bounds. Receiving team takes the disc at the brick
      // mark — engine-wise this transitions to in-play just like pull, the
      // difference is purely the recorded event type (for stats / reporting).
      recordBrick() {
        const { selPuller } = get()
        if (!selPuller) return
        recordVia(get, set, state => {
          if (!canRecord(state, 'brick')) return null
          const pullingTeam = otherTeam(state.possession)
          return [{
            pointIndex: state.pointIndex,
            type:     'brick',
            playerId: selPuller,
            teamId:   pullingTeam,
          }]
        }, { selPuller: null })
      },

      // ── recordThrowAway ─────────────────────────────────────────────────────
      recordThrowAway() {
        recordVia(get, set, state => {
          if (!canRecord(state, 'turnover-throw-away') || !state.discHolder) return null
          return [{
            pointIndex: state.pointIndex,
            type:     'turnover-throw-away',
            playerId: state.discHolder,
            teamId:   state.possession,
          }]
        })
      },

      // ── triggerReceiverError ────────────────────────────────────────────────
      triggerReceiverError() {
        const { session } = get()
        if (!session) return
        // Pick modes are tied to live state's holder/possession; entering one
        // while previewing would point at stale players. Drop the preview so
        // the pick reflects what's actually on the field.
        const state = deriveGameState(session)
        if (!canRecord(state, 'turnover-receiver-error') || !state.discHolder) return
        set({
          uiMode:         'receiver-error-pick',
          showEventMenu:  false,
          truncateCursor: null,
        })
      },

      // ── recordGoal ──────────────────────────────────────────────────────────
      recordGoal() {
        const { session } = get()
        if (!session) return
        const cap  = session.gameConfig.scoreCapAt
        const half = session.gameConfig.halfTimeAt

        recordVia(get, set, state => {
          if (!canRecord(state, 'goal') || !state.discHolder) return null
          const events: RawEventInput[] = [{
            pointIndex: state.pointIndex,
            type:     'goal',
            playerId: state.discHolder,
            teamId:   state.possession,
          }]
          // Auto-append half-time / end-game when thresholds met
          const newScore = { ...state.score, [state.possession]: state.score[state.possession] + 1 }
          const total = newScore.A + newScore.B
          if (newScore.A >= cap || newScore.B >= cap) {
            events.push({ pointIndex: state.pointIndex, type: 'end-game' })
          } else if (total === half) {
            events.push({ pointIndex: state.pointIndex, type: 'half-time' })
          }
          return events
        })
      },

      // ── triggerDefBlock ─────────────────────────────────────────────────────
      triggerDefBlock(type) {
        // Clear the preview — pick modes operate against live state.
        set({
          uiMode:         type === 'intercept' ? 'intercept-pick' : 'block-pick',
          showEventMenu:  false,
          truncateCursor: null,
        })
      },

      // ── undo ────────────────────────────────────────────────────────────────
      undo() {
        recordVia(
          get, set,
          state => [{ pointIndex: state.pointIndex, type: 'undo' }],
          { uiMode: 'idle', selPuller: null },
        )
      },

      // ── triggerHalfTime / triggerEndGame ────────────────────────────────────
      triggerHalfTime() {
        recordVia(
          get, set,
          state => canRecord(state, 'half-time')
            ? [{ pointIndex: state.pointIndex, type: 'half-time' }]
            : null,
          { showEventMenu: false },
        )
      },

      triggerEndGame() {
        recordVia(
          get, set,
          state => canRecord(state, 'end-game')
            ? [{ pointIndex: state.pointIndex, type: 'end-game' }]
            : null,
          { showEventMenu: false },
        )
      },

      // ── triggerInjurySub ────────────────────────────────────────────────────
      // Injury subs skip the per-player tap and go straight to line selection,
      // so multiple players can be swapped at once. Clears the preview cursor
      // so the line confirmation lands on live state, not the historical view.
      triggerInjurySub() {
        set({
          screen:         'line-selection',
          isInjurySub:    true,
          showEventMenu:  false,
          uiMode:         'idle',
          truncateCursor: null,
        })
      },

      // ── cancelPickMode ──────────────────────────────────────────────────────
      cancelPickMode() {
        set({ uiMode: 'idle' })
      },

      // ── nextPoint ────────────────────────────────────────────────────────────
      // Advance from terminal state (point-over / half-time) to line selection.
      nextPoint() {
        set({
          screen:         'line-selection',
          isInjurySub:    false,
          uiMode:         'idle',
          selPuller:      null,
          showEventMenu:  false,
          truncateCursor: null,
        })
      },

      // ── reorderActiveLine ────────────────────────────────────────────────────
      // Reorders the on-field display order for a team. Recorded as a
      // 'reorder-line' event so other peers see the same order on sync.
      reorderActiveLine(teamId, fromIdx, toIdx) {
        if (fromIdx === toIdx) return
        recordVia(get, set, state => {
          const current = state.activeLine[teamId].map(p => p.id)
          if (fromIdx < 0 || fromIdx >= current.length || toIdx < 0 || toIdx >= current.length) return null
          const [moved] = current.splice(fromIdx, 1)
          current.splice(toIdx, 0, moved)
          return [{ pointIndex: state.pointIndex, type: 'reorder-line', teamId, line: current }]
        })
      },

      // ── backToGameList ───────────────────────────────────────────────────────
      // Returns to game-setup, preserving the session so it can be viewed again.
      backToGameList() {
        set({
          screen:         'game-setup',
          uiMode:         'idle',
          selPuller:      null,
          showEventMenu:  false,
          isInjurySub:    false,
          truncateCursor: null,
        })
      },

      // ── recordFoul / recordPick ──────────────────────────────────────────────
      recordFoul() {
        recordVia(
          get, set,
          state => canRecord(state, 'foul')
            ? [{ pointIndex: state.pointIndex, type: 'foul' }]
            : null,
          { showEventMenu: false },
        )
      },

      recordPick() {
        recordVia(
          get, set,
          state => canRecord(state, 'pick')
            ? [{ pointIndex: state.pointIndex, type: 'pick' }]
            : null,
          { showEventMenu: false },
        )
      },

      recordStall() {
        recordVia(get, set, state => {
          if (!canRecord(state, 'turnover-stall') || !state.discHolder) return null
          return [{
            pointIndex: state.pointIndex,
            type:     'turnover-stall',
            playerId: state.discHolder,
            teamId:   state.possession,
          }]
        })
      },

      recordTimeout() {
        recordVia(
          get, set,
          state => canRecord(state, 'timeout')
            ? [{ pointIndex: state.pointIndex, type: 'timeout' }]
            : null,
          { showEventMenu: false },
        )
      },

      // ── Settings navigation ──────────────────────────────────────────────────
      openGameSettings() {
        set({ screen: 'game-settings', showEventMenu: false })
      },

      closeGameSettings() {
        set({ screen: 'game-setup' })
      },

      updateRecordingOption(key, value) {
        set(s => ({ recordingOptions: { ...s.recordingOptions, [key]: value } }))
      },

      // ── setShowEventMenu ─────────────────────────────────────────────────────
      setShowEventMenu(show) {
        set({ showEventMenu: show })
      },

      // ── toggleSwapSides ──────────────────────────────────────────────────────
      // Flip which physical side of the screen each team renders on. Per-device
      // display preference — used when teams swap ends or the scorer walks
      // around to the other touchline. Not synced over the wire.
      toggleSwapSides() {
        set(s => ({ swapSides: !s.swapSides }))
      },

      // ── cyclePillSize ───────────────────────────────────────────────────────
      // Cycle through small / medium / large pill sizes. Per-device display
      // preference — what feels right for thumbs / screen size.
      cyclePillSize() {
        set(s => ({ pillSize: PILL_SIZE_CYCLE[s.pillSize] }))
      },

      // ── setTruncateCursor ──────────────────────────────────────────────────
      // Move (or clear) the tap-to-truncate cursor. Dropping the puller
      // selection too — the previewed phase may not be awaiting-pull, and a
      // stale selPuller would record under the wrong team if the user then
      // taps Pull from the historical view.
      setTruncateCursor(cursor) {
        set({ truncateCursor: cursor, selPuller: null })
      },
    }),
    {
      name:    STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted, fromVersion) => {
        const obj = persisted as {
          recordingOptions?: Partial<RecordingOptions>
          session?: unknown
          screen?: AppScreen
        }
        // v4 changed PlayerId / EventId from string to number; v5 derived
        // activeLine from rawLog and reshaped point-start / injury-sub events.
        // Both transitions are not back-compatible at the event level, so any
        // session predating v5 is dropped and the user starts fresh.
        const dropping = fromVersion < 5
        return {
          ...obj,
          session:          dropping ? null            : (obj.session ?? null),
          screen:           dropping ? 'game-setup'    : (obj.screen ?? 'game-setup'),
          recordingOptions: { ...DEFAULT_RECORDING_OPTIONS, ...(obj.recordingOptions ?? {}) },
        }
      },
      partialize: (state) => ({
        session:          state.session,
        screen:           state.screen,
        isInjurySub:      state.isInjurySub,
        uiMode:           state.uiMode,
        selPuller:        state.selPuller,
        recordingOptions: state.recordingOptions,
        swapSides:        state.swapSides,
        pillSize:         state.pillSize,
      }),
    },
  ),
)
