import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useGameStore, effectiveSession } from './store'
import { computeVisLog, deriveGameState } from './engine'
import { MOCK_GAMES } from './data'
import type { DerivedGameState, VisLogEntry, GameSession, RecordingOptions, EventId, Notification, EditModeState } from './types'
import { DEFAULT_RECORDING_OPTIONS } from './types'

// Refresh the persisted session's gameConfig from current MOCK_GAMES so
// roster/config edits flow into existing sessions without a migration.
// (Active line is derived from rawLog + this fresh roster, so it picks up
// updated names / portraits automatically.)
function resolveSession(session: GameSession): GameSession {
  const fresh = MOCK_GAMES.find(g => g.id === session.gameConfig.id)
  if (!fresh) return session
  return { ...session, gameConfig: fresh }
}

// Single subscription to the session — re-derives only when session reference changes.
//
// When edit mode is active, the recording controls operate against the draft.
// The selector returns the draft so the entire LiveEntry UI works against it
// for free; the live session is read from useLiveSession when needed.

export function useSession(): GameSession | null {
  const stored = useGameStore(s => s.session)
  const draft  = useGameStore(s => s.editMode?.draftSession ?? null)
  const active = draft ?? stored
  return useMemo(() => (active ? resolveSession(active) : null), [active])
}

/** The persisted live session, ignoring any edit-mode draft. */
export function useLiveSession(): GameSession | null {
  const stored = useGameStore(s => s.session)
  return useMemo(() => (stored ? resolveSession(stored) : null), [stored])
}

export function useEditMode(): EditModeState | null {
  return useGameStore(s => s.editMode)
}

export function useNotification(): Notification | null {
  return useGameStore(s => s.notification)
}

export function useDerivedState(): DerivedGameState | null {
  const session = useSession()
  const cursor  = useTruncateCursor()
  return useMemo(() => {
    if (!session) return null
    return deriveGameState(effectiveSession(session, cursor))
  }, [session, cursor])
}

// LogDrawer needs the full visible log so it can render greyed entries past
// the cursor. Filter at the call site if you need the cursor-aware view.
export function useVisLog(): VisLogEntry[] {
  const session = useSession()
  return useMemo(() => (session ? computeVisLog(session.rawLog) : []), [session])
}

export function useTruncateCursor(): EventId | null {
  return useGameStore(s => s.truncateCursor)
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
