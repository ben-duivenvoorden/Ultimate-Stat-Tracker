import { Btn } from '@/components/ui/Btn'
import { Label } from '@/components/ui/Label'
import type { Score, GamePhase, TeamId } from '@/core/types'

export interface TerminalPanelProps {
  gamePhase: GamePhase
  score: Score
  goalScorerName?: string
  teamAName: string
  teamBName: string
  teamAColor: string
  teamBColor: string
  gameStartPullingTeam: TeamId
  onNext: () => void
  onBackToGames: () => void
}

export function TerminalPanel({
  gamePhase, score, goalScorerName,
  teamAName, teamBName, teamAColor, teamBColor,
  gameStartPullingTeam,
  onNext, onBackToGames,
}: TerminalPanelProps) {
  const isHalf = gamePhase === 'half-time'
  const isEnd  = gamePhase === 'game-over'

  // Second half: team that did NOT pull at game start now pulls
  const secondHalfPullerName = gameStartPullingTeam === 'A' ? teamBName : teamAName

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4 text-center">
      {isEnd ? (
        <>
          <Label color="var(--color-muted)" className="tracking-widest">GAME OVER · SESSION CLOSED</Label>
          <ScoreBlock score={score} teamAColor={teamAColor} teamBColor={teamBColor} teamAName={teamAName} teamBName={teamBName} large />
          <Label>No further entries</Label>
          <Btn variant="ghost" size="md" onClick={onBackToGames}>← Back to Games</Btn>
        </>
      ) : isHalf ? (
        <>
          <Label color="var(--color-warn)" className="text-sm tracking-widest">HALF TIME</Label>
          <ScoreBlock score={score} teamAColor={teamAColor} teamBColor={teamBColor} teamAName={teamAName} teamBName={teamBName} />
          <div className="text-xs text-muted">
            Ends switched — {secondHalfPullerName} pulls in 2nd half
          </div>
          <Btn variant="primary" size="md" onClick={onNext}>Line Selection →</Btn>
        </>
      ) : (
        <>
          <Label color="var(--color-success)" className="tracking-widest">POINT OVER</Label>
          <ScoreBlock score={score} teamAColor={teamAColor} teamBColor={teamBColor} teamAName={teamAName} teamBName={teamBName} />
          {goalScorerName && (
            <div className="text-xs text-muted">Goal: {goalScorerName}</div>
          )}
          <Btn variant="primary" size="md" onClick={onNext}>Next Point →</Btn>
        </>
      )}
    </div>
  )
}

function ScoreBlock({
  score, teamAColor, teamBColor, teamAName, teamBName, large = false,
}: {
  score: Score
  teamAColor: string
  teamBColor: string
  teamAName: string
  teamBName: string
  large?: boolean
}) {
  const scoreSize = large ? 'text-5xl' : 'text-4xl'
  return (
    <div className="flex items-center gap-5">
      <div>
        <div className="text-xs font-bold mb-1" style={{ color: teamAColor }}>{teamAName}</div>
        <div className={`${scoreSize} font-black text-content leading-none`}>{score.A}</div>
      </div>
      <div className="text-muted text-lg">—</div>
      <div>
        <div className="text-xs font-bold mb-1" style={{ color: teamBColor }}>{teamBName}</div>
        <div className={`${scoreSize} font-black text-content leading-none`}>{score.B}</div>
      </div>
    </div>
  )
}
