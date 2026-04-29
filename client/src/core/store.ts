import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  AppScreen,
  UiMode,
  TeamId,
  PlayerId,
  Player,
  GameSession,
  RawEvent,
  RecordingOptions,
} from './types'
import { otherTeam, DEFAULT_RECORDING_OPTIONS } from './types'
import {
  deriveGameState,
  canRecord,
  appendEvents,
  baseRawEvent,
} from './engine'
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

  // Transient (not persisted)
  showEventMenu: boolean

  // Game / session actions
  selectGame:        (gameId: number, pullingTeam: TeamId) => void
  resumeGame:        (gameId: number) => void
  confirmLine:       (lineA: Player[], lineB: Player[]) => void
  nextPoint:         () => void
  backToGameList:    () => void

  // Recording actions (all funnel through canRecord guards)
  tapPlayer:           (player: Player) => void
  recordPull:          (bonus?: boolean) => void
  recordThrowAway:     () => void
  recordReceiverError: () => void
  recordGoal:          () => void
  triggerDefBlock:     (type: 'block' | 'intercept') => void
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
  setShowEventMenu:  (show: boolean) => void
}

// ─── Persistence ──────────────────────────────────────────────────────────────

const STORAGE_VERSION = 2
const STORAGE_KEY     = 'ust-game'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function freshSession(gameId: number, pullingTeam: TeamId): GameSession | null {
  const config = MOCK_GAMES.find(g => g.id === gameId)
  if (!config) return null

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
      recordingOptions: DEFAULT_RECORDING_OPTIONS,

      // ── selectGame ──────────────────────────────────────────────────────────
      // Start a fresh game session (overwrites any existing one).
      selectGame(gameId, pullingTeam) {
        const session = freshSession(gameId, pullingTeam)
        if (!session) return
        set({
          session,
          screen:        'line-selection',
          isInjurySub:   false,
          uiMode:        'idle',
          selPuller:     null,
          showEventMenu: false,
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
      // Confirms the line for a new point (or for an injury sub).
      // For new points, appends a 'point-start' event so gamePhase moves to awaiting-pull.
      confirmLine(lineA, lineB) {
        const { session, isInjurySub } = get()
        if (!session) return

        const newActiveLine = { A: lineA, B: lineB }

        if (isInjurySub) {
          // Mid-point injury: just update activeLine, don't append point-start
          set({
            session: { ...session, activeLine: newActiveLine },
            screen: 'live-entry',
            isInjurySub: false,
            uiMode: 'idle',
          })
          return
        }

        // Normal line confirmation: start the next point
        const state = deriveGameState(session)
        const updatedSession = appendEvents(
          { ...session, activeLine: newActiveLine },
          [{ ...baseRawEvent(state.pointIndex), type: 'point-start' }],
        )
        set({
          session:   updatedSession,
          screen:    'live-entry',
          uiMode:    'idle',
          selPuller: null,
        })
      },

      // ── tapPlayer ───────────────────────────────────────────────────────────
      tapPlayer(player) {
        const { session, uiMode } = get()
        if (!session) return
        const state = deriveGameState(session)

        // Injury pick: route to line-selection screen
        if (uiMode === 'injury-pick') {
          set({ screen: 'line-selection', isInjurySub: true, showEventMenu: false, uiMode: 'idle' })
          return
        }

        // Block / intercept pick: record the blocker
        if (uiMode === 'block-pick' || uiMode === 'intercept-pick') {
          const type: RawEvent['type'] = uiMode === 'intercept-pick' ? 'intercept' : 'block'
          const defendingTeam = otherTeam(state.possession)
          if (!canRecord(state, type)) return
          set({
            session: appendEvents(session, [{
              ...baseRawEvent(state.pointIndex),
              type,
              playerId: player.id,
              teamId:   defendingTeam,
            }]),
            uiMode: 'idle',
          })
          return
        }

        // Awaiting pull: select / deselect puller
        if (state.gamePhase === 'awaiting-pull') {
          const { selPuller } = get()
          set({ selPuller: selPuller === player.id ? null : player.id })
          return
        }

        // Pass chain: tap = possession transfer
        if (state.gamePhase === 'in-play' && canRecord(state, 'possession')) {
          // Don't record if they already have possession
          if (state.discHolder === player.id) return

          set({
            session: appendEvents(session, [{
              ...baseRawEvent(state.pointIndex),
              type:     'possession',
              playerId: player.id,
              teamId:   state.possession,
            }]),
          })
          return
        }
      },

      // ── recordPull ──────────────────────────────────────────────────────────
      recordPull(bonus = false) {
        const { session, selPuller } = get()
        if (!session || !selPuller) return
        const state = deriveGameState(session)
        if (!canRecord(state, 'pull')) return

        const pullingTeam = otherTeam(state.possession)
        set({
          session: appendEvents(session, [{
            ...baseRawEvent(state.pointIndex),
            type:     bonus ? 'pull-bonus' : 'pull',
            playerId: selPuller,
            teamId:   pullingTeam,
          }]),
          selPuller: null,
        })
      },

      // ── recordThrowAway ─────────────────────────────────────────────────────
      recordThrowAway() {
        const { session } = get()
        if (!session) return
        const state = deriveGameState(session)
        if (!canRecord(state, 'turnover-throw-away') || !state.discHolder) return

        set({
          session: appendEvents(session, [{
            ...baseRawEvent(state.pointIndex),
            type:     'turnover-throw-away',
            playerId: state.discHolder,
            teamId:   state.possession,
          }]),
        })
      },

      // ── recordReceiverError ─────────────────────────────────────────────────
      recordReceiverError() {
        const { session } = get()
        if (!session) return
        const state = deriveGameState(session)
        if (!canRecord(state, 'turnover-receiver-error') || !state.discHolder) return

        set({
          session: appendEvents(session, [{
            ...baseRawEvent(state.pointIndex),
            type:     'turnover-receiver-error',
            playerId: state.discHolder,
            teamId:   state.possession,
          }]),
        })
      },

      // ── recordGoal ──────────────────────────────────────────────────────────
      recordGoal() {
        const { session } = get()
        if (!session) return
        const state = deriveGameState(session)
        if (!canRecord(state, 'goal') || !state.discHolder) return

        const events: RawEvent[] = [{
          ...baseRawEvent(state.pointIndex),
          type:     'goal',
          playerId: state.discHolder,
          teamId:   state.possession,
        }]

        // Auto-append half-time / end-game when thresholds met
        const newScore = { ...state.score, [state.possession]: state.score[state.possession] + 1 }
        const total = newScore.A + newScore.B
        const cap = session.gameConfig.scoreCapAt
        const half = session.gameConfig.halfTimeAt

        if (newScore.A >= cap || newScore.B >= cap) {
          events.push({ ...baseRawEvent(state.pointIndex), type: 'end-game' })
        } else if (total === half) {
          events.push({ ...baseRawEvent(state.pointIndex), type: 'half-time' })
        }

        set({ session: appendEvents(session, events) })
      },

      // ── triggerDefBlock ─────────────────────────────────────────────────────
      triggerDefBlock(type) {
        set({
          uiMode: type === 'intercept' ? 'intercept-pick' : 'block-pick',
          showEventMenu: false,
        })
      },

      // ── undo ────────────────────────────────────────────────────────────────
      undo() {
        const { session } = get()
        if (!session) return
        const state = deriveGameState(session)
        set({
          session: appendEvents(session, [{ ...baseRawEvent(state.pointIndex), type: 'undo' }]),
          uiMode: 'idle',
          selPuller: null,
        })
      },

      // ── triggerHalfTime / triggerEndGame ────────────────────────────────────
      triggerHalfTime() {
        const { session } = get()
        if (!session) return
        const state = deriveGameState(session)
        if (!canRecord(state, 'half-time')) return
        set({
          session: appendEvents(session, [{ ...baseRawEvent(state.pointIndex), type: 'half-time' }]),
          showEventMenu: false,
        })
      },

      triggerEndGame() {
        const { session } = get()
        if (!session) return
        const state = deriveGameState(session)
        if (!canRecord(state, 'end-game')) return
        set({
          session: appendEvents(session, [{ ...baseRawEvent(state.pointIndex), type: 'end-game' }]),
          showEventMenu: false,
        })
      },

      // ── triggerInjurySub ────────────────────────────────────────────────────
      triggerInjurySub() {
        set({ uiMode: 'injury-pick', showEventMenu: false })
      },

      // ── cancelPickMode ──────────────────────────────────────────────────────
      cancelPickMode() {
        set({ uiMode: 'idle' })
      },

      // ── nextPoint ────────────────────────────────────────────────────────────
      // Advance from terminal state (point-over / half-time) to line selection.
      nextPoint() {
        set({
          screen:        'line-selection',
          isInjurySub:   false,
          uiMode:        'idle',
          selPuller:     null,
          showEventMenu: false,
        })
      },

      // ── backToGameList ───────────────────────────────────────────────────────
      // Returns to game-setup, preserving the session so it can be viewed again.
      backToGameList() {
        set({
          screen:        'game-setup',
          uiMode:        'idle',
          selPuller:     null,
          showEventMenu: false,
          isInjurySub:   false,
        })
      },

      // ── recordFoul / recordPick ──────────────────────────────────────────────
      recordFoul() {
        const { session } = get()
        if (!session) return
        const state = deriveGameState(session)
        if (!canRecord(state, 'foul')) return
        set({
          session: appendEvents(session, [{ ...baseRawEvent(state.pointIndex), type: 'foul' }]),
          showEventMenu: false,
        })
      },

      recordPick() {
        const { session } = get()
        if (!session) return
        const state = deriveGameState(session)
        if (!canRecord(state, 'pick')) return
        set({
          session: appendEvents(session, [{ ...baseRawEvent(state.pointIndex), type: 'pick' }]),
          showEventMenu: false,
        })
      },

      recordStall() {
        const { session } = get()
        if (!session) return
        const state = deriveGameState(session)
        if (!canRecord(state, 'turnover-stall') || !state.discHolder) return
        set({
          session: appendEvents(session, [{
            ...baseRawEvent(state.pointIndex),
            type:     'turnover-stall',
            playerId: state.discHolder,
            teamId:   state.possession,
          }]),
        })
      },

      recordTimeout() {
        const { session } = get()
        if (!session) return
        const state = deriveGameState(session)
        if (!canRecord(state, 'timeout')) return
        set({
          session: appendEvents(session, [{ ...baseRawEvent(state.pointIndex), type: 'timeout' }]),
          showEventMenu: false,
        })
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
    }),
    {
      name:    STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted, fromVersion) => {
        if (fromVersion < 2) {
          return { ...(persisted as object), recordingOptions: DEFAULT_RECORDING_OPTIONS }
        }
        return persisted
      },
      partialize: (state) => ({
        session:          state.session,
        screen:           state.screen,
        isInjurySub:      state.isInjurySub,
        uiMode:           state.uiMode,
        selPuller:        state.selPuller,
        recordingOptions: state.recordingOptions,
      }),
    },
  ),
)
