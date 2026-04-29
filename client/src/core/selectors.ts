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

// Shallow-equality selector for picking out multiple action callbacks at once
// without causing re-renders when unrelated state changes.
export function useGameActions() {
  return useGameStore(useShallow(s => ({
    selectGame:          s.selectGame,
    resumeGame:          s.resumeGame,
    confirmLine:         s.confirmLine,
    nextPoint:           s.nextPoint,
    backToGameList:      s.backToGameList,
    tapPlayer:           s.tapPlayer,
    recordPull:          s.recordPull,
    recordThrowAway:     s.recordThrowAway,
    recordReceiverError: s.recordReceiverError,
    recordGoal:          s.recordGoal,
    triggerDefBlock:     s.triggerDefBlock,
    recordFoul:          s.recordFoul,
    recordPick:          s.recordPick,
    recordStall:         s.recordStall,
    recordTimeout:       s.recordTimeout,
    undo:                s.undo,
    triggerHalfTime:     s.triggerHalfTime,
    triggerEndGame:      s.triggerEndGame,
    triggerInjurySub:    s.triggerInjurySub,
    cancelPickMode:      s.cancelPickMode,
    setShowEventMenu:    s.setShowEventMenu,
  })))
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
