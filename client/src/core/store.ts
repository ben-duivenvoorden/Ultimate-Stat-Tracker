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

  // Transient (not persisted)
  showEventMenu: boolean

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
  setShowEventMenu:  (show: boolean) => void
}

// ─── Persistence ──────────────────────────────────────────────────────────────

const STORAGE_VERSION = 3
const STORAGE_KEY     = 'ust-game'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function freshSession(gameId: number, pullingTeam: TeamId): GameSession | null {
  const config = MOCK_GAMES.find(g => g.id === gameId)
  if (!config) return null

  // Seed each line with the first 4 male-matching and first 3 female-matching players
  // (the default 4M/3F ratio). User can adjust on LineSelection.
  const seed = (roster: Player[]) => {
    const males   = roster.filter(p => p.gender === 'M').slice(0, 4)
    const females = roster.filter(p => p.gender === 'F').slice(0, 3)
    return [...males, ...females]
  }

  return {
    gameConfig:           config,
    gameStartPullingTeam: pullingTeam,
    rawLog:               [],
    activeLine: {
      A: seed(config.rosters.A),
      B: seed(config.rosters.B),
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
      // Also appends a 'system' event listing the confirmed line-up for both teams so
      // the recorder has an audit trail of who was on the field per point.
      confirmLine(lineA, lineB) {
        const { session, isInjurySub } = get()
        if (!session) return

        const newActiveLine = { A: lineA, B: lineB }
        const teams = session.gameConfig.teams
        const fmt = (team: 'A' | 'B', line: Player[]) =>
          `${teams[team].short} line: ${line.map(p => p.name).join(', ')}`

        if (isInjurySub) {
          const state = deriveGameState(session)
          const updated = appendEvents(
            { ...session, activeLine: newActiveLine },
            [
              { ...baseRawEvent(state.pointIndex), type: 'system', text: `Injury sub — ${fmt('A', lineA)} | ${fmt('B', lineB)}` },
            ],
          )
          set({
            session: updated,
            screen: 'live-entry',
            isInjurySub: false,
            uiMode: 'idle',
          })
          return
        }

        // Normal line confirmation: start the next point and log the line-up.
        const state = deriveGameState(session)
        const updatedSession = appendEvents(
          { ...session, activeLine: newActiveLine },
          [
            { ...baseRawEvent(state.pointIndex), type: 'point-start' },
            { ...baseRawEvent(state.pointIndex), type: 'system', text: fmt('A', lineA) },
            { ...baseRawEvent(state.pointIndex), type: 'system', text: fmt('B', lineB) },
          ],
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

        // Pick-mode dispatch — registry-driven (see core/pickModes.ts)
        if (isPickMode(uiMode)) {
          const { onTap } = PICK_MODES[uiMode]
          if (onTap.kind === 'navigate') {
            set({
              screen:        onTap.screen,
              isInjurySub:   onTap.setIsInjurySub ?? false,
              showEventMenu: false,
              uiMode:        'idle',
            })
            return
          }
          if (!canRecord(state, onTap.eventType)) return
          // Receiver Error can't be the thrower — guard against UI bypass
          if (onTap.eventType === 'turnover-receiver-error' && player.id === state.discHolder) return
          const teamId = onTap.team === 'defending' ? otherTeam(state.possession) : state.possession
          set({
            session: appendEvents(session, [{
              ...baseRawEvent(state.pointIndex),
              type:     onTap.eventType,
              playerId: player.id,
              teamId,
            } as RawEvent]),
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

      // ── triggerReceiverError ────────────────────────────────────────────────
      triggerReceiverError() {
        const { session } = get()
        if (!session) return
        const state = deriveGameState(session)
        if (!canRecord(state, 'turnover-receiver-error') || !state.discHolder) return
        set({
          uiMode: 'receiver-error-pick',
          showEventMenu: false,
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

      // ── reorderActiveLine ────────────────────────────────────────────────────
      // Reorders the on-field display order for a team. Pure visual rearrangement.
      reorderActiveLine(teamId, fromIdx, toIdx) {
        const { session } = get()
        if (!session || fromIdx === toIdx) return
        const line = [...session.activeLine[teamId]]
        if (fromIdx < 0 || fromIdx >= line.length || toIdx < 0 || toIdx >= line.length) return
        const [moved] = line.splice(fromIdx, 1)
        line.splice(toIdx, 0, moved)
        set({
          session: {
            ...session,
            activeLine: { ...session.activeLine, [teamId]: line },
          },
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
      migrate: (persisted) => {
        // Always merge persisted recordingOptions with current defaults so newly-added
        // option fields (e.g. lineRatio) get sensible values without losing user toggles.
        const obj = persisted as { recordingOptions?: Partial<RecordingOptions> }
        return {
          ...obj,
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
      }),
    },
  ),
)
