import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useGameStore } from './store'
import { computeVisLog, deriveGameState } from './engine'
import { MOCK_GAMES } from './data'
import type { DerivedGameState, VisLogEntry, GameSession, RecordingOptions } from './types'
import { DEFAULT_RECORDING_OPTIONS } from './types'

// Refresh the persisted session's gameConfig (and re-resolve activeLine players by id)
// from the current MOCK_GAMES. Lets new fields on Player / GameConfig (e.g. gender) flow
// into existing sessions without a storage migration.
function resolveSession(session: GameSession): GameSession {
  const fresh = MOCK_GAMES.find(g => g.id === session.gameConfig.id)
  if (!fresh) return session
  const resolve = (p: { id: string }, teamId: 'A' | 'B') =>
    fresh.rosters[teamId].find(rp => rp.id === p.id) ?? p
  return {
    ...session,
    gameConfig: fresh,
    activeLine: {
      A: session.activeLine.A.map(p => resolve(p, 'A') as typeof p),
      B: session.activeLine.B.map(p => resolve(p, 'B') as typeof p),
    },
  }
}

// Single subscription to the session — re-derives only when session reference changes.
// (Session reference changes only when an action mutates the rawLog or activeLine.)

export function useSession(): GameSession | null {
  const stored = useGameStore(s => s.session)
  return useMemo(() => (stored ? resolveSession(stored) : null), [stored])
}

export function useDerivedState(): DerivedGameState | null {
  const session = useSession()
  return useMemo(() => (session ? deriveGameState(session) : null), [session])
}

export function useVisLog(): VisLogEntry[] {
  const session = useSession()
  return useMemo(() => (session ? computeVisLog(session.rawLog) : []), [session])
}

// ─── Action accessor ──────────────────────────────────────────────────────────
// Auto-derived from the store: every function on GameStore is exposed.
// No hand-maintained list = no drift when actions are added/renamed.

type StoreShape = ReturnType<typeof useGameStore.getState>
type GameActions = {
  [K in keyof StoreShape as StoreShape[K] extends (...args: never[]) => unknown ? K : never]: StoreShape[K]
}

function pickActions(s: StoreShape): GameActions {
  const out: Record<string, unknown> = {}
  for (const k in s) {
    const v = s[k as keyof StoreShape]
    if (typeof v === 'function') out[k] = v
  }
  return out as GameActions
}

export function useGameActions(): GameActions {
  return useGameStore(useShallow(pickActions))
}

export function useRecordingOptions(): RecordingOptions {
  const stored = useGameStore(s => s.recordingOptions)
  // Merge with defaults so newly-added option fields don't crash callers when the
  // in-memory state is stale (e.g. across HMR reloads before storage rehydrate).
  return {
    ...DEFAULT_RECORDING_OPTIONS,
    ...(stored ?? {}),
    gameMode:  stored?.gameMode  ?? DEFAULT_RECORDING_OPTIONS.gameMode,
    lineRatio: stored?.lineRatio ?? DEFAULT_RECORDING_OPTIONS.lineRatio,
  }
}

export function useUiState() {
  return useGameStore(useShallow(s => ({
    screen:        s.screen,
    uiMode:        s.uiMode,
    selPuller:     s.selPuller,
    isInjurySub:   s.isInjurySub,
    showEventMenu: s.showEventMenu,
  })))
}
