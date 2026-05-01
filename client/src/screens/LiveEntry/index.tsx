import { useEffect, useMemo, useState } from 'react'
import {
  useSession, useDerivedState, useVisLog, useGameActions, useUiState, useRecordingOptions,
} from '@/core/selectors'
import { useGameStore } from '@/core/store'
import { otherTeam, type Player, type TeamId, type VisLogEntry } from '@/core/types'
import { isPickMode, pickActiveTeam } from '@/core/pickModes'
import { Header } from './Header'
import { Stage, type StageMode } from './Canvas/Stage'
import type { PassArrowSpec } from './Canvas/PassArrowLayer'
import type { ChipAction } from './Canvas/layout'
import { LogDrawer, LOG_DRAWER_W } from './Drawers/LogDrawer'
import { AdminDrawer, ADMIN_DRAWER_W } from './Drawers/AdminDrawer'
import { DRAWER_RAIL_W } from './Drawers/Drawer'
import { useStageSize } from './Canvas/useStageSize'
import { Btn } from '@/components/ui/Btn'

// Derive pass arrows for the active team from the current point's possessions.
// Each consecutive pair of possessions on this team becomes a from→to arrow.
// Returns the most recent N arrows (newest last).
function derivePassArrows(
  visLog: VisLogEntry[],
  teamId: TeamId,
  players: Player[],
  maxArrows = 2,
): PassArrowSpec[] {
  let startIdx = 0
  for (let i = visLog.length - 1; i >= 0; i--) {
    if (visLog[i].type === 'point-start') { startIdx = i; break }
  }
  const possessions = visLog.slice(startIdx).filter(
    (e): e is Extract<VisLogEntry, { type: 'possession' }> =>
      e.type === 'possession' && e.teamId === teamId,
  )
  const arrows: PassArrowSpec[] = []
  for (let i = 1; i < possessions.length; i++) {
    const fromIdx = players.findIndex(p => p.id === possessions[i - 1].playerId)
    const toIdx   = players.findIndex(p => p.id === possessions[i].playerId)
    if (fromIdx >= 0 && toIdx >= 0) arrows.push({ fromIdx, toIdx })
  }
  return arrows.slice(-maxArrows)
}

const HEADER_H     = 48      // h-12
const PICK_STRIP_H = 32      // h-8

export default function LiveEntry() {
  // ── All hooks declared up front (no conditional hooks) ───────────────────
  const session          = useSession()
  const state            = useDerivedState()
  const visLog           = useVisLog()
  const ui               = useUiState()
  const actions          = useGameActions()
  const recordingOptions = useRecordingOptions()
  const swapSides        = useGameStore(s => s.swapSides)
  const stageSize        = useStageSize()

  const [logExpanded, setLogExpanded]     = useState(false)
  const [adminExpanded, setAdminExpanded] = useState(false)

  // Active context — derived even when state is null so all hooks below can
  // run unconditionally. Default values are inert (null active team, empty
  // arrows, etc.) and the early return below the hooks guards rendering.
  const phase   = state?.gamePhase
  const pickMode = isPickMode(ui.uiMode) ? ui.uiMode : null

  const activeTeam: TeamId | null = state
    ? (pickMode
        ? pickActiveTeam(pickMode, state.possession)
        : phase === 'awaiting-pull'
          ? otherTeam(state.possession)
          : state.possession)
    : null

  const activePlayers = useMemo<Player[]>(
    () => (state && activeTeam ? state.activeLine[activeTeam] : []),
    [state, activeTeam],
  )

  const arrows = useMemo(
    () => (activeTeam ? derivePassArrows(visLog, activeTeam, activePlayers) : []),
    [visLog, activeTeam, activePlayers],
  )

  // Auto-navigate to LineSelection after a goal or half-time. game-over stays
  // on the canvas with an inline banner (no end-game screen yet).
  useEffect(() => {
    if (phase === 'point-over' || phase === 'half-time') actions.nextPoint()
  }, [phase, actions])

  if (!session || !state || !activeTeam) return null

  const { teams } = session.gameConfig
  const stageMode: StageMode = pickMode
    ? 'pick'
    : phase === 'awaiting-pull'
      ? 'awaiting-pull'
      : 'in-play'

  const ineligibleIds = pickMode === 'receiver-error-pick' && state.discHolder !== null
    ? [state.discHolder]
    : []

  // Logical canvas centre — shifted to compensate for any expanded drawer so
  // chips at the canvas edge stay on-screen.
  const headerH = HEADER_H + (pickMode ? PICK_STRIP_H : 0)
  const stageW  = stageSize.w
  const stageH  = Math.max(0, stageSize.h - headerH)
  const leftOffset  = adminExpanded ? (ADMIN_DRAWER_W - DRAWER_RAIL_W) : 0
  const rightOffset = logExpanded   ? (LOG_DRAWER_W   - DRAWER_RAIL_W) : 0
  const cx = stageW / 2 + leftOffset / 2 - rightOffset / 2
  const cy = stageH / 2

  // ─── Pill / chip dispatchers ────────────────────────────────────────────────
  const onPillTap = (player: Player) => {
    // tapPlayer in the engine covers all three flows: pick-mode dispatch,
    // puller-toggle in awaiting-pull, and auto-possession in in-play.
    actions.tapPlayer(player)
  }

  const onChipTap = (_player: Player, action: ChipAction) => {
    switch (action.kind) {
      case 'pull':            actions.recordPull(action.bonus); break
      case 'throwaway':       actions.recordThrowAway();        break
      case 'goal':            actions.recordGoal();             break
      case 'stall':           actions.recordStall();            break
      case 'def-block':       actions.triggerDefBlock(action.type); break
      case 'receiver-error':  actions.triggerReceiverError();   break
    }
  }

  const onBackgroundTap = () => {
    if (pickMode) actions.cancelPickMode()
  }

  const isGameOver = phase === 'game-over'

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--color-bg)' }}>
      <Header
        teams={teams}
        score={state.score}
        swapSides={swapSides}
        pickMode={pickMode}
        defendingShort={teams[otherTeam(state.possession)].short}
        onBack={actions.backToGameList}
        onSwap={actions.toggleSwapSides}
        onCancelPickMode={actions.cancelPickMode}
      />

      <div className="flex-1 relative overflow-hidden">
        {isGameOver ? (
          <GameOverBanner score={state.score} teams={teams} onBack={actions.backToGameList} />
        ) : (
          <Stage
            // Re-key on team change so Stage remounts cleanly (physics + arrows reset).
            key={activeTeam}
            teamId={activeTeam}
            players={activePlayers}
            teamColor={teams[activeTeam].color}
            mode={stageMode}
            holderId={state.discHolder}
            pullerId={ui.selPuller}
            ineligibleIds={ineligibleIds}
            stallShown={recordingOptions.stall}
            bonusShown={recordingOptions.pullBonus}
            arrows={arrows}
            centre={{ x: cx, y: cy }}
            bounds={{ w: stageW, h: stageH }}
            onPillTap={onPillTap}
            onChipTap={onChipTap}
            onBackgroundTap={onBackgroundTap}
          />
        )}

        <AdminDrawer
          state={state}
          recordingOptions={recordingOptions}
          expanded={adminExpanded}
          onToggle={() => setAdminExpanded(v => !v)}
          onTimeout={actions.recordTimeout}
          onFoul={actions.recordFoul}
          onPick={actions.recordPick}
          onInjurySub={actions.triggerInjurySub}
          onHalfTime={actions.triggerHalfTime}
          onEndGame={actions.triggerEndGame}
        />

        <LogDrawer
          visLog={visLog}
          players={[...session.gameConfig.rosters.A, ...session.gameConfig.rosters.B]}
          expanded={logExpanded}
          onToggle={() => setLogExpanded(v => !v)}
          onUndo={actions.undo}
        />
      </div>
    </div>
  )
}

function GameOverBanner({
  score, teams, onBack,
}: {
  score: { A: number; B: number }
  teams: Record<TeamId, { name: string; short: string; color: string }>
  onBack: () => void
}) {
  const winner: TeamId = score.A >= score.B ? 'A' : 'B'
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 px-6">
        <div className="text-xs tracking-widest font-mono text-muted">GAME OVER</div>
        <div className="text-5xl font-black tabular-nums" style={{ color: teams[winner].color }}>
          {score.A} – {score.B}
        </div>
        <div className="text-sm text-muted">{teams[winner].name} wins</div>
        <Btn variant="ghost" size="md" onClick={onBack}>Back to games</Btn>
      </div>
    </div>
  )
}
