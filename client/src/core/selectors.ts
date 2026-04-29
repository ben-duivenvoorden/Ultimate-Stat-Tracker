import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useGameStore } from './store'
import { computeVisLog, deriveGameState } from './engine'
import type { DerivedGameState, VisLogEntry, GameSession, RecordingOptions } from './types'
import { DEFAULT_RECORDING_OPTIONS } from './types'

// Single subscription to the session — re-derives only when session reference changes.
// (Session reference changes only when an action mutates the rawLog or activeLine.)

export function useSession(): GameSession | null {
  return useGameStore(s => s.session)
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
  return useGameStore(s => s.recordingOptions) ?? DEFAULT_RECORDING_OPTIONS
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
