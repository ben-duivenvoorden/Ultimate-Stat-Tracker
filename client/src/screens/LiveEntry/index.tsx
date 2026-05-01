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

// Derive pass arrows for the active team's *current* possession run.
//
// Walks the visLog backwards collecting consecutive `possession` events for
// `teamId`. Any other event (a turnover, block, intercept, pull/brick, the
// other team's possession, or point-start) breaks the chain — so as soon as
// the team loses possession, prior arrows are cleared. When they regain it
// later in the same point, only the new run shows.
//
// Returns at most `maxArrows` most recent arrows (newest last).
function derivePassArrows(
  visLog: VisLogEntry[],
  teamId: TeamId,
  players: Player[],
  maxArrows = 2,
): PassArrowSpec[] {
  type Possession = Extract<VisLogEntry, { type: 'possession' }>
  const chain: Possession[] = []
  for (let i = visLog.length - 1; i >= 0; i--) {
    const e = visLog[i]
    if (e.type === 'possession' && e.teamId === teamId) {
      chain.push(e)
    } else {
      break
    }
  }
  chain.reverse()

  const arrows: PassArrowSpec[] = []
  for (let i = 1; i < chain.length; i++) {
    const fromIdx = players.findIndex(p => p.id === chain[i - 1].playerId)
    const toIdx   = players.findIndex(p => p.id === chain[i].playerId)
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
  const pillSize         = useGameStore(s => s.pillSize)
  const stageSize        = useStageSize()

  // One drawer at most may be expanded at a time; toggling one collapses the
  // other. Drawers reserve their own width in the flex row, so the canvas
  // shrinks when a drawer expands rather than being overlaid.
  type ExpandedDrawer = 'log' | 'admin' | null
  const [expandedDrawer, setExpandedDrawer] = useState<ExpandedDrawer>(null)
  const logExpanded   = expandedDrawer === 'log'
  const adminExpanded = expandedDrawer === 'admin'
  const toggleDrawer = (which: 'log' | 'admin') =>
    setExpandedDrawer(prev => (prev === which ? null : which))

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

  // Drawer rails (collapsed) and full panels (expanded) both reserve width
  // from the canvas. Compute the actual stage area = window - drawer widths
  // - header. Centre is the midpoint of that area; the Stage's coordinate
  // system is its parent's local space.
  const headerH = HEADER_H + (pickMode ? PICK_STRIP_H : 0)
  const leftDrawerW  = adminExpanded ? ADMIN_DRAWER_W : DRAWER_RAIL_W
  const rightDrawerW = logExpanded   ? LOG_DRAWER_W   : DRAWER_RAIL_W
  const stageW  = Math.max(0, stageSize.w - leftDrawerW - rightDrawerW)
  const stageH  = Math.max(0, stageSize.h - headerH)
  const cx = stageW / 2
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
      case 'brick':           actions.recordBrick();            break
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

      {/*
        Layout: AdminDrawer | Stage | LogDrawer (flex row).
        Drawers reserve their width so the canvas shrinks when one is
        expanded, rather than overlapping. Only one drawer expanded at a
        time (mutual exclusion via toggleDrawer).
      */}
      <div className="flex-1 flex overflow-hidden">
        <AdminDrawer
          state={state}
          recordingOptions={recordingOptions}
          expanded={adminExpanded}
          onToggle={() => toggleDrawer('admin')}
          onTimeout={actions.recordTimeout}
          onFoul={actions.recordFoul}
          onPick={actions.recordPick}
          onInjurySub={actions.triggerInjurySub}
          onHalfTime={actions.triggerHalfTime}
          onEndGame={actions.triggerEndGame}
          pillSize={pillSize}
          onCyclePillSize={actions.cyclePillSize}
        />

        <div className="flex-1 relative overflow-hidden" style={{ minWidth: 0 }}>
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
              pillSize={pillSize}
              arrows={arrows}
              centre={{ x: cx, y: cy }}
              bounds={{ w: stageW, h: stageH }}
              onPillTap={onPillTap}
              onChipTap={onChipTap}
              onBackgroundTap={onBackgroundTap}
            />
          )}
        </div>

        <LogDrawer
          visLog={visLog}
          players={[...session.gameConfig.rosters.A, ...session.gameConfig.rosters.B]}
          expanded={logExpanded}
          onToggle={() => toggleDrawer('log')}
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
