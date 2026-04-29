import { useSession, useDerivedState, useVisLog, useGameActions, useUiState, useRecordingOptions } from '@/core/selectors'
import { useGameStore } from '@/core/store'
import { otherTeam, type PlayerId } from '@/core/types'
import { isPickMode, pickActiveTeam } from '@/core/pickModes'
import { lastDeadDiscEvent } from '@/core/format'
import { PlayerPane, type PlayerPaneMode } from './PlayerPane'
import { ActionPane } from './ActionPane'
import { LogPane } from './LogPane'
import type { TerminalPanelProps } from './TerminalPanel'

export default function LiveEntry() {
  const session         = useSession()
  const state           = useDerivedState()
  const visLog          = useVisLog()
  const ui              = useUiState()
  const actions         = useGameActions()
  const recordingOptions = useRecordingOptions()
  const backToGameList  = useGameStore(s => s.backToGameList)

  if (!session || !state) return null

  const { teams } = session.gameConfig
  const { gameStartPullingTeam } = session

  const pickMode    = isPickMode(ui.uiMode) ? ui.uiMode : null
  const isPullPhase = state.gamePhase === 'awaiting-pull'
  const isTerminal  = state.gamePhase === 'point-over' || state.gamePhase === 'half-time' || state.gamePhase === 'game-over'

  // Which team's players are "active" (shown, interactable)
  const activeTeam = pickMode
    ? pickActiveTeam(pickMode, state.possession)
    : isPullPhase
      ? otherTeam(state.possession)
      : state.possession

  const playerMode: PlayerPaneMode = pickMode ?? (isPullPhase ? 'pull' : 'normal')

  const allPlayers     = [...session.gameConfig.rosters.A, ...session.gameConfig.rosters.B]
  const lookupName     = (id: PlayerId | null): string | null =>
    id !== null ? (allPlayers.find(p => p.id === id)?.name ?? String(id)) : null
  const discHolderName = lookupName(state.discHolder)
  const selPullerName  = lookupName(ui.selPuller)
  const goalScorerName = isTerminal
    ? lookupName([...visLog].reverse().find(e => e.type === 'goal')?.playerId ?? null)
    : null

  const terminalProps: TerminalPanelProps = {
    gamePhase:            state.gamePhase,
    score:                state.score,
    goalScorerName:       goalScorerName ?? undefined,
    teamAName:            teams.A.name,
    teamBName:            teams.B.name,
    teamAColor:           teams.A.color,
    teamBColor:           teams.B.color,
    gameStartPullingTeam: gameStartPullingTeam,
    onNext:               actions.nextPoint,
    onBackToGames:        actions.backToGameList,
  }

  // Layout: [team-on-left-pane | team-on-centre-pane | Log].
  // swapSides flips which physical side each team is on (used when teams
  // change ends or the scorer walks around the field).
  const swapSides   = useGameStore(s => s.swapSides)
  const toggleSwap  = useGameStore(s => s.toggleSwapSides)
  const teamLeft    = swapSides ? 'B' : 'A'
  const teamCentre  = swapSides ? 'A' : 'B'

  // Action pane covers the *inactive* team. translateX(0%) sits over the left
  // pane; translateX(100%) shifts to the centre pane.
  const actionTranslateX = activeTeam === teamLeft ? '100%' : '0%'

  const sharedPlayerPaneProps = {
    discHolderId: state.discHolder,
    selPullerId:  ui.selPuller,
    onTap:        actions.tapPlayer,
  }

  return (
    <div className="h-full flex flex-col bg-bg">
      {/* Top bar — back button + centred scoreboard */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-3 h-12"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <button
          onClick={backToGameList}
          className="text-muted hover:text-content transition-colors cursor-pointer text-lg leading-none"
          title="Back to games"
        >
          ←
        </button>
        <div className="flex-1 flex items-center justify-center gap-3">
          <span className="text-sm font-bold" style={{ color: teams[teamLeft].color }}>{teams[teamLeft].short}</span>
          <strong className="text-3xl font-black tabular-nums leading-none text-content">{state.score[teamLeft]}</strong>
          <span className="text-dim text-base">–</span>
          <strong className="text-3xl font-black tabular-nums leading-none text-content">{state.score[teamCentre]}</strong>
          <span className="text-sm font-bold" style={{ color: teams[teamCentre].color }}>{teams[teamCentre].short}</span>
        </div>
        <button
          onClick={toggleSwap}
          className="text-muted hover:text-content transition-colors cursor-pointer text-base leading-none px-1"
          title="Swap team sides"
        >
          ⇆
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden relative">

        {/* Pane 1: left side */}
        <div style={{ flex: 1, display: 'flex' }}>
          {!isTerminal && (
            <PlayerPane
              {...sharedPlayerPaneProps}
              players={state.activeLine[teamLeft]}
              teamColor={teams[teamLeft].color}
              teamShort={teams[teamLeft].short}
              mode={activeTeam === teamLeft ? playerMode : 'normal'}
              onReorder={(f, t) => actions.reorderActiveLine(teamLeft, f, t)}
            />
          )}
        </div>

        {/* Pane 2: centre, right-aligned (mirrored layout) */}
        <div style={{ flex: 1, display: 'flex' }}>
          {!isTerminal && (
            <PlayerPane
              {...sharedPlayerPaneProps}
              players={state.activeLine[teamCentre]}
              teamColor={teams[teamCentre].color}
              teamShort={teams[teamCentre].short}
              mode={activeTeam === teamCentre ? playerMode : 'normal'}
              align="right"
              onReorder={(f, t) => actions.reorderActiveLine(teamCentre, f, t)}
            />
          )}
        </div>

        {/* Pane 3: Event log — always right, never moves */}
        <div style={{ flex: 1, display: 'flex' }}>
          <LogPane
            visLog={visLog}
            players={allPlayers}
            isGameOver={state.gamePhase === 'game-over'}
            onUndo={actions.undo}
            onExport={() => alert('Export coming soon')}
          />
        </div>

        {/* Pane 4: Action pane — slides over inactive team's column.
            In pick mode it shows PickModePlaceholder (no buttons),
            so tapping it cancels pick mode naturally. */}
        <div
          style={{
            position:   'absolute',
            top: 0, bottom: 0, left: 0,
            width:      'calc(100% / 3)',
            transform:  `translateX(${actionTranslateX})`,
            transition: 'transform 220ms ease-in-out',
            zIndex:     10,
            display:    'flex',
            background: 'var(--color-bg)',
          }}
          onClick={pickMode ? actions.cancelPickMode : undefined}
        >
          <ActionPane
            gamePhase={state.gamePhase}
            uiMode={ui.uiMode}
            pullerSelected={ui.selPuller !== null}
            discHolderName={discHolderName}
            selPullerName={selPullerName}
            defendingShort={teams[otherTeam(state.possession)].short}
            recordingOptions={recordingOptions}
            deadDiscEvent={lastDeadDiscEvent(visLog)}
            onRecordPull={actions.recordPull}
            onThrowAway={actions.recordThrowAway}
            onReceiverError={actions.triggerReceiverError}
            onDefensiveBlock={actions.triggerDefBlock}
            onGoal={actions.recordGoal}
            onHalfTime={actions.triggerHalfTime}
            onEndGame={actions.triggerEndGame}
            onInjurySub={actions.triggerInjurySub}
            onStall={actions.recordStall}
            onFoul={actions.recordFoul}
            onPick={actions.recordPick}
            onTimeout={actions.recordTimeout}
            onCancelPickMode={actions.cancelPickMode}
            showEventMenu={ui.showEventMenu}
            setShowEventMenu={actions.setShowEventMenu}
            terminalProps={terminalProps}
          />
        </div>


      </div>
    </div>
  )
}
