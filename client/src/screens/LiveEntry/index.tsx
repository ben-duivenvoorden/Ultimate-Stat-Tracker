import { useSession, useDerivedState, useVisLog, useGameActions, useUiState, useRecordingOptions } from '@/core/selectors'
import { useGameStore } from '@/core/store'
import { otherTeam } from '@/core/types'
import { isPickMode, pickActiveTeam } from '@/core/pickModes'
import { Label } from '@/components/ui/Label'
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
  const lookupName     = (id: string | null) => id ? (allPlayers.find(p => p.id === id)?.name ?? id) : null
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

  const attackingTeam = teams[state.attackLeft]
  const defendingTeam = teams[otherTeam(state.attackLeft)]

  // Action pane is the sliding overlay — it always covers the inactive team.
  // Layout columns: [Team A | Team B | Log]
  //   Team A active → action covers Team B (centre) → translateX(100%)
  //   Team B active → action covers Team A (left)   → translateX(0%)
  const actionTranslateX = activeTeam === 'A' ? '100%' : '0%'

  const sharedPlayerPaneProps = {
    scoreA:       state.score.A,
    scoreB:       state.score.B,
    teamAColor:   teams.A.color,
    teamBColor:   teams.B.color,
    teamAShort:   teams.A.short,
    teamBShort:   teams.B.short,
    discHolderId: state.discHolder,
    selPullerId:  ui.selPuller,
    onTap:        actions.tapPlayer,
  }

  return (
    <div className="h-full flex flex-col bg-bg">
      {/* Field direction cue */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-4 h-6 text-[9px] font-mono tracking-widest"
        style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-dim)' }}
      >
        <button
          onClick={backToGameList}
          className="text-muted hover:text-content transition-colors cursor-pointer"
          title="Back to games"
        >
          ←
        </button>
        <div className="flex-1 flex items-center justify-center gap-6">
          <span style={{ color: attackingTeam.color }}>{attackingTeam.short} ←</span>
          <span>ATTACKING →</span>
          <span style={{ color: defendingTeam.color }}>→ {defendingTeam.short}</span>
        </div>
        <div className="w-5" />
      </div>

      <div className="flex-1 flex overflow-hidden relative">

        {/* Pane 1: Team A — always left */}
        <div style={{ flex: 1, display: 'flex' }}>
          {!isTerminal && (
            <PlayerPane
              {...sharedPlayerPaneProps}
              players={session.activeLine.A}
              teamColor={teams.A.color}
              teamShort={teams.A.short}
              mode={activeTeam === 'A' ? playerMode : 'normal'}
            />
          )}
        </div>

        {/* Pane 2: Team B — always centre, right-aligned */}
        <div style={{ flex: 1, display: 'flex' }}>
          {!isTerminal && (
            <PlayerPane
              {...sharedPlayerPaneProps}
              players={session.activeLine.B}
              teamColor={teams.B.color}
              teamShort={teams.B.short}
              mode={activeTeam === 'B' ? playerMode : 'normal'}
              align="right"
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
            onBackToGames={actions.backToGameList}
            onCancelPickMode={actions.cancelPickMode}
            showEventMenu={ui.showEventMenu}
            setShowEventMenu={actions.setShowEventMenu}
            terminalProps={terminalProps}
          />
        </div>


</div>

      {/* Dev state strip */}
      <div
        className="flex-shrink-0 flex items-center px-4 h-5 text-[9px] font-mono"
        style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-dim)' }}
      >
        <Label className="text-[9px]">{state.gamePhase}</Label>
        <span className="mx-2 text-border">·</span>
        <Label className="text-[9px]">ui: {ui.uiMode}</Label>
        <span className="mx-2 text-border">·</span>
        <Label className="text-[9px]">poss: {teams[state.possession].short}</Label>
        <span className="mx-2 text-border">·</span>
        <Label className="text-[9px]">attackL: {teams[state.attackLeft].short}</Label>
      </div>
    </div>
  )
}
