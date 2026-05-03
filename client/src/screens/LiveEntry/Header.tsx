import type { TeamId, Score, Team } from '@/core/types'
import { resolveContextLabel, type PickUiMode } from '@/core/pickModes'

interface HeaderProps {
  teams: Record<TeamId, Team>
  score: Score
  pickMode: PickUiMode | null
  defendingShort: string
  onBack: () => void
  onCancelPickMode: () => void
}

// Top strip: back · score. When pick mode is active, a second amber strip
// appears below with the context label and a tap-to-cancel affordance.
export function Header({
  teams, score, pickMode, defendingShort, onBack, onCancelPickMode,
}: HeaderProps) {
  const teamLeft   = 'A'
  const teamCentre = 'B'

  return (
    <div className="flex-shrink-0 flex flex-col" style={{ borderBottom: '1px solid var(--color-border)' }}>
      <div className="flex items-center justify-between px-3 h-12">
        <button
          onClick={onBack}
          className="text-muted hover:text-content transition-colors cursor-pointer text-lg leading-none"
          title="Back to games"
        >
          ←
        </button>
        <div className="flex-1 flex items-center justify-center gap-2 min-w-0 px-2">
          <span
            className="text-sm font-bold truncate text-right flex-1"
            style={{ color: teams[teamLeft].color }}
          >
            {teams[teamLeft].name}
          </span>
          <strong className="text-3xl font-black tabular-nums leading-none text-content flex-shrink-0">{score[teamLeft]}</strong>
          <span className="text-dim text-base flex-shrink-0">–</span>
          <strong className="text-3xl font-black tabular-nums leading-none text-content flex-shrink-0">{score[teamCentre]}</strong>
          <span
            className="text-sm font-bold truncate text-left flex-1"
            style={{ color: teams[teamCentre].color }}
          >
            {teams[teamCentre].name}
          </span>
        </div>
        <span className="w-4" />
      </div>

      {pickMode && (
        <button
          onClick={onCancelPickMode}
          className="h-8 w-full flex items-center justify-center text-[11px] font-semibold tracking-widest cursor-pointer transition-colors"
          style={{
            background: 'var(--color-warn-bg)',
            color: 'var(--color-warn)',
            borderTop: '1px solid var(--color-warn)',
          }}
          title="Tap to cancel"
        >
          {resolveContextLabel(pickMode, { defendingShort })} · TAP TO CANCEL
        </button>
      )}
    </div>
  )
}
