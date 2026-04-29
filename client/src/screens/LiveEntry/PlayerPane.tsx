import type { Player } from '@/core/types'
import { Label } from '@/components/ui/Label'

export type PlayerPaneMode = 'normal' | 'pull' | 'block' | 'injury'

interface PlayerPaneProps {
  players: Player[]
  teamColor: string
  teamShort: string
  scoreA: number
  scoreB: number
  teamAColor: string
  teamBColor: string
  teamAShort: string
  teamBShort: string

  mode: PlayerPaneMode
  discHolderId: string | null
  selPullerId: string | null

  onTap: (player: Player) => void
}

const modeMeta = {
  normal: { bg: 'var(--color-bg)',         label: 'POSSESSION',   accent: null },
  pull:   { bg: 'var(--color-bg)',         label: 'PULLING',      accent: null },
  block:  { bg: 'var(--color-block-bg)',   label: 'PICK BLOCKER', accent: 'var(--color-block)' },
  injury: { bg: 'var(--color-injury-bg)', label: 'PICK INJURED', accent: 'var(--color-warn)' },
} as const

export function PlayerPane({
  players, teamColor, teamShort,
  scoreA, scoreB, teamAShort, teamBShort, teamAColor, teamBColor,
  mode, discHolderId, selPullerId,
  onTap,
}: PlayerPaneProps) {
  const { bg, label, accent } = modeMeta[mode]

  return (
    <div
      className="flex-1 flex flex-col transition-colors duration-200"
      style={{ background: bg }}
    >
      <div
        className="flex-shrink-0 h-7 flex items-center justify-between px-2"
        style={{ borderBottom: `1px solid ${accent ? `${accent}33` : 'var(--color-border)'}` }}
      >
        <div>
          <Label
            className="text-[9px] block leading-none mb-px"
            color={accent ?? 'var(--color-muted)'}
          >
            {label}
          </Label>
          <div className="text-[11px] font-bold leading-none" style={{ color: accent ?? teamColor }}>
            {teamShort}
          </div>
        </div>

        <div className="flex items-center gap-1 text-[10px]">
          <span className="font-bold" style={{ color: teamAColor }}>{teamAShort}</span>
          <strong className="text-[15px] font-black text-content">{scoreA}</strong>
          <span className="text-dim text-[9px]">–</span>
          <strong className="text-[15px] font-black text-content">{scoreB}</strong>
          <span className="font-bold" style={{ color: teamBColor }}>{teamBShort}</span>
        </div>
      </div>

      <div
        className="flex-1 p-1 grid gap-1 overflow-hidden"
        style={{ gridTemplateRows: `repeat(${players.length}, 1fr)` }}
      >
        {players.map(p => {
          const isHighlit = p.id === discHolderId || p.id === selPullerId
          const isPickMode = mode === 'block' || mode === 'injury'
          const activeColor = isPickMode ? accent! : teamColor

          return (
            <button
              key={p.id}
              onClick={() => onTap(p)}
              className="flex items-center gap-2 px-3 rounded-md border transition-all cursor-pointer text-left"
              style={{
                background:   isPickMode ? `${activeColor}1a` : isHighlit ? `${teamColor}28` : 'var(--color-surf-2)',
                borderColor:  isPickMode ? `${activeColor}66` : isHighlit ? teamColor : 'var(--color-border)',
                color:        'var(--color-content)',
                fontWeight:   isHighlit ? 700 : 400,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors"
                style={{ background: isPickMode ? activeColor : isHighlit ? teamColor : 'var(--color-border)' }}
              />
              <span className="text-sm leading-none">{p.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
