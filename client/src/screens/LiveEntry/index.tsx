import { useSession, useDerivedState, useVisLog, useGameActions, useUiState } from '@/core/selectors'
import { otherTeam, type TeamId } from '@/core/types'
import { Label } from '@/components/ui/Label'
import { PlayerPane, type PlayerPaneMode } from './PlayerPane'
import { ActionPane } from './ActionPane'
import { LogPane } from './LogPane'
import type { TerminalPanelProps } from './TerminalPanel'

export default function LiveEntry() {
  const session = useSession()
  const state   = useDerivedState()
  const visLog  = useVisLog()
  const ui      = useUiState()
  const actions = useGameActions()

  if (!session || !state) return null

  const { teams } = session.gameConfig
  const { gameStartPullingTeam } = session

  const isPickMode  = ui.uiMode === 'block-pick' || ui.uiMode === 'intercept-pick' || ui.uiMode === 'injury-pick'
  const isPullPhase = state.gamePhase === 'awaiting-pull'
  const isTerminal  = state.gamePhase === 'point-over' || state.gamePhase === 'half-time' || state.gamePhase === 'game-over'

  // ── Which team's players to show in the player pane ──
  let displayTeam: TeamId
  if (isPullPhase) {
    displayTeam = otherTeam(state.possession)            // pulling team
  } else if (ui.uiMode === 'block-pick' || ui.uiMode === 'intercept-pick') {
    displayTeam = otherTeam(state.possession)            // defending team
  } else {
    displayTeam = state.possession
  }
  const displayPlayers = session.activeLine[displayTeam]
  const displayTeamData = teams[displayTeam]

  // Player pane sits on the LEFT when its team attacks left → right
  const playersOnLeft = displayTeam === state.attackLeft

  const playerMode: PlayerPaneMode =
    ui.uiMode === 'injury-pick' ? 'injury' :
    ui.uiMode === 'block-pick' || ui.uiMode === 'intercept-pick' ? 'block' :
    isPullPhase ? 'pull' :
    'normal'

  // ── Names for context strings (engine deals in IDs; UI surfaces names) ──
  const allPlayers = [...session.gameConfig.rosters.A, ...session.gameConfig.rosters.B]
  const lookupName = (id: string | null) => id ? (allPlayers.find(p => p.id === id)?.name ?? id) : null
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

  // ── Field direction cue ──
  const attackingTeam = teams[state.attackLeft]
  const defendingTeam = teams[otherTeam(state.attackLeft)]

  return (
    <div className="h-full flex flex-col bg-bg">
      <div
        className="flex-shrink-0 flex items-center justify-between px-4 h-6 text-[9px] font-mono tracking-widest"
        style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-dim)' }}
      >
        <span style={{ color: attackingTeam.color }}>{attackingTeam.short} ←</span>
        <span>ATTACKING →</span>
        <span style={{ color: defendingTeam.color }}>→ {defendingTeam.short}</span>
      </div>

      {/* Three-pane layout — pane order swaps with possession direction */}
      <div className="flex-1 flex overflow-hidden relative">
        {!isTerminal && (
          <div style={{ order: playersOnLeft ? 1 : 3, flex: 1, display: 'flex' }}>
            <PlayerPane
              players={displayPlayers}
              teamColor={displayTeamData.color}
              teamShort={displayTeamData.short}
              scoreA={state.score.A}
              scoreB={state.score.B}
              teamAColor={teams.A.color}
              teamBColor={teams.B.color}
              teamAShort={teams.A.short}
              teamBShort={teams.B.short}
              mode={playerMode}
              discHolderId={state.discHolder}
              selPullerId={ui.selPuller}
              onTap={(p) => isPickMode ? actions.tapPlayer(p) : actions.tapPlayer(p)}
            />
          </div>
        )}

        {/* Pick-mode dismiss area (covers entire layout when active) */}
        {isPickMode && (
          <div
            className="absolute inset-0 z-0"
            onClick={actions.cancelPickMode}
          />
        )}

        <div style={{ order: 2, flex: 1, display: 'flex', position: 'relative', zIndex: 1 }}>
          <ActionPane
            gamePhase={state.gamePhase}
            uiMode={ui.uiMode}
            pullerSelected={ui.selPuller !== null}
            discHolderName={discHolderName}
            selPullerName={selPullerName}
            defendingShort={teams[otherTeam(state.possession)].short}
            onRecordPull={actions.recordPull}
            onThrowAway={actions.recordThrowAway}
            onReceiverError={actions.recordReceiverError}
            onDefensiveBlock={actions.triggerDefBlock}
            onGoal={actions.recordGoal}
            onHalfTime={actions.triggerHalfTime}
            onEndGame={actions.triggerEndGame}
            onInjurySub={actions.triggerInjurySub}
            showEventMenu={ui.showEventMenu}
            setShowEventMenu={actions.setShowEventMenu}
            terminalProps={terminalProps}
          />
        </div>

        <div style={{ order: playersOnLeft ? 3 : 1, flex: 1, display: 'flex', position: 'relative', zIndex: 1 }}>
          <LogPane
            visLog={visLog}
            players={allPlayers}
            isGameOver={state.gamePhase === 'game-over'}
            onUndo={actions.undo}
            onExport={() => alert('Export coming soon')}
          />
        </div>
      </div>

      {/* Dev state strip — easy to remove */}
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
