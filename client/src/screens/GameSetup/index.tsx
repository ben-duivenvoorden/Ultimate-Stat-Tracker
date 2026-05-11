import { useState } from 'react'
import { Btn } from '@/components/ui/Btn'
import { Chip } from '@/components/ui/Chip'
import { Label } from '@/components/ui/Label'
import { useGameStore } from '@/core/store'
import { useScheduledGames, useSession, useTeamsState } from '@/core/selectors'
import { deriveGameState, deriveGameStatus } from '@/core/engine'
import { resolveGameConfig } from '@/core/games/engine'
import type { TeamId } from '@/core/types'
import NewGameForm from '@/screens/NewGame'

// Sentinel value for the "+ New Game" row in the left list. Picked far above
// any plausible GameId.
const NEW_GAME_SENTINEL = -1

export default function GameSetup() {
  const selectGame       = useGameStore(s => s.selectGame)
  const resumeGame       = useGameStore(s => s.resumeGame)
  const openGameSettings = useGameStore(s => s.openGameSettings)
  const openTeamsManager = useGameStore(s => s.openTeamsManager)
  const session          = useSession()
  const games            = useScheduledGames()
  const teamsState       = useTeamsState()

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [pullingTeam, setPullingTeam] = useState<TeamId | null>(null)

  const isNewGameSelected = selectedId === NEW_GAME_SENTINEL
  const scheduledGame = selectedId !== null && !isNewGameSelected
    ? games.find(g => g.id === selectedId)
    : null
  const game = scheduledGame ? resolveGameConfig(scheduledGame, teamsState) : null

  // Status and score are derived from the session — never carried as static config.
  // Only the currently-selected game can have a session attached at any one time.
  const liveSession = (game && session && session.gameConfig.id === game.id) ? session : null
  const status      = deriveGameStatus(liveSession)
  const liveScore   = liveSession ? deriveGameState(liveSession).score : null
  const isFinished  = status === 'complete'
  const canResume   = status === 'in-progress'
  const skipPullPrompt = status !== 'scheduled'

  const sessionGameId = session?.gameConfig.id ?? null

  return (
    <div className="h-full flex bg-bg text-content">
      {/* ── Game list ── */}
      <div className="w-64 flex-shrink-0 flex flex-col border-r border-border">
        <div className="px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <Label block className="mb-1">GAME SETUP</Label>
              <div className="text-base font-bold">Select Game</div>
            </div>
            <button
              onClick={openGameSettings}
              className="mt-0.5 text-[18px] leading-none cursor-pointer transition-opacity hover:opacity-70"
              style={{ color: 'var(--color-dim)' }}
              title="Recording Settings"
            >
              ⚙
            </button>
          </div>
          <button
            onClick={openTeamsManager}
            className="mt-2 text-[10px] font-mono tracking-widest uppercase cursor-pointer transition-colors hover:text-content"
            style={{ color: 'var(--color-muted)' }}
            title="Manage teams + players"
          >
            ⚙ Manage teams
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {/* + New Game row sits at the top so it's the obvious first action
              after archival days. */}
          <button
            onClick={() => { setSelectedId(NEW_GAME_SENTINEL); setPullingTeam(null) }}
            className="w-full text-left px-4 py-3 border-b border-border transition-colors cursor-pointer"
            style={{
              borderLeft: `3px solid ${isNewGameSelected ? 'var(--color-success)' : 'transparent'}`,
              background: isNewGameSelected ? 'var(--color-surf-2)' : 'transparent',
            }}
          >
            <div className="text-sm font-semibold text-content mb-1.5">+ New Game</div>
            <Label>Schedule a new fixture</Label>
          </button>
          {games.map(g => {
            const isActive = selectedId === g.id
            const rowStatus = (sessionGameId === g.id) ? deriveGameStatus(session) : 'scheduled'
            const isLive    = rowStatus === 'in-progress'
            const isDone    = rowStatus === 'complete'
            const chipColor = isLive ? 'var(--color-success)' : isDone ? 'var(--color-dim)' : 'var(--color-muted)'
            const chipText  = isLive ? 'LIVE' : isDone ? 'DONE' : 'SCHED'
            return (
              <button
                key={g.id}
                onClick={() => { setSelectedId(g.id); setPullingTeam(null) }}
                className="w-full text-left px-4 py-3 border-b border-border transition-colors cursor-pointer"
                style={{
                  borderLeft: `3px solid ${isActive ? 'var(--color-team-a)' : 'transparent'}`,
                  background: isActive ? 'var(--color-surf-2)' : 'transparent',
                }}
              >
                <div className="text-sm font-semibold text-content mb-1.5">{g.name}</div>
                <div className="flex items-center gap-2">
                  <Chip color={chipColor}>{chipText}</Chip>
                  <Label>{g.scheduledTime}</Label>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Detail pane ── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-5 p-6 overflow-y-auto">
        {isNewGameSelected ? (
          <NewGameForm
            onCreated={(newId) => { setSelectedId(newId); setPullingTeam(null) }}
            onCancel={() => setSelectedId(null)}
          />
        ) : !game ? (
          <div className="text-center">
            <div className="text-4xl mb-3 opacity-30">🥏</div>
            <Label>Select a game from the list</Label>
          </div>
        ) : (
          <>
            <div className="w-full max-w-sm bg-surf border border-border-2 rounded-xl p-5 text-center">
              <Label block className="mb-2">{game.name}</Label>
              {liveScore ? (
                <div className="flex items-center justify-center gap-6 my-3">
                  <div>
                    <div className="text-xs font-bold mb-1" style={{ color: game.teams.A.color }}>{game.teams.A.short}</div>
                    <div className="text-5xl font-black text-content leading-none">{liveScore.A}</div>
                  </div>
                  <div className="text-muted text-xl">—</div>
                  <div>
                    <div className="text-xs font-bold mb-1" style={{ color: game.teams.B.color }}>{game.teams.B.short}</div>
                    <div className="text-5xl font-black text-content leading-none">{liveScore.B}</div>
                  </div>
                </div>
              ) : (
                <div className="py-3">
                  <div className="text-base text-content mb-1">
                    {game.teams.A.name} <span className="text-muted">vs</span> {game.teams.B.name}
                  </div>
                  <Label>Kick-off {game.scheduledTime}</Label>
                </div>
              )}
            </div>

            {/* Who pulls first — only when starting fresh */}
            {!skipPullPrompt && (
              <div className="w-full max-w-sm">
                <div className="text-center text-sm text-content mb-0.5">Who will pull first?</div>
                <div className="text-center text-xs italic mb-3" style={{ color: 'var(--color-muted)' }}>(Who is on Defence?)</div>
                <div className="flex gap-3">
                  {(['A', 'B'] as TeamId[]).map(t => {
                    const team = game.teams[t]
                    const selected = pullingTeam === t
                    return (
                      <button
                        key={t}
                        onClick={() => setPullingTeam(t)}
                        className="flex-1 h-11 rounded-lg border text-sm font-semibold transition-all cursor-pointer"
                        style={{
                          background: selected ? `${team.color}22` : 'transparent',
                          borderColor: selected ? `${team.color}88` : 'var(--color-border)',
                          color: selected ? team.color : 'var(--color-muted)',
                        }}
                      >
                        {team.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              {isFinished ? (
                <>
                  <Btn variant="primary" size="lg" onClick={() => resumeGame(game.id)}>
                    View Final Stats
                  </Btn>
                  <Btn variant="ghost" size="lg">Export</Btn>
                </>
              ) : canResume ? (
                <>
                  <Btn variant="primary" size="lg" onClick={() => resumeGame(game.id)}>
                    ▶  Continue Recording
                  </Btn>
                  <Btn variant="ghost" size="lg">Export</Btn>
                </>
              ) : (
                <Btn
                  variant="primary"
                  size="lg"
                  disabled={!pullingTeam}
                  onClick={() => pullingTeam && selectGame(game.id, pullingTeam)}
                >
                  Start Recording
                </Btn>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
