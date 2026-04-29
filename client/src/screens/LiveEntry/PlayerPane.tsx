import type { Player } from '@/core/types'
import { PICK_MODES, type PickUiMode } from '@/core/pickModes'
import { Label } from '@/components/ui/Label'

export type PlayerPaneMode = 'normal' | 'pull' | PickUiMode

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
  align?: 'right'

  onTap: (player: Player) => void
}

interface PaneMeta { bg: string; label: string; accent: string | null }

function paneMeta(mode: PlayerPaneMode): PaneMeta {
  if (mode === 'normal') return { bg: 'var(--color-bg)', label: 'POSSESSION', accent: null }
  if (mode === 'pull')   return { bg: 'var(--color-bg)', label: 'PULLING',    accent: null }
  const cfg = PICK_MODES[mode]
  return { bg: cfg.bgColor, label: cfg.paneLabel, accent: cfg.color }
}

export function PlayerPane({
  players, teamColor, teamShort,
  scoreA, scoreB, teamAShort, teamBShort, teamAColor, teamBColor,
  mode, discHolderId, selPullerId, align,
  onTap,
}: PlayerPaneProps) {
  const { bg, label, accent } = paneMeta(mode)
  const isRight = align === 'right'
  const isPickMode = accent !== null

  return (
    <div
      className="flex-1 flex flex-col transition-colors duration-200"
      style={{ background: bg }}
    >
      <div
        className="flex-shrink-0 h-7 flex items-center justify-between px-2"
        style={{
          borderBottom: `1px solid ${accent ? `${accent}33` : 'var(--color-border)'}`,
          flexDirection: isRight ? 'row-reverse' : 'row',
        }}
      >
        <div style={{ textAlign: isRight ? 'right' : 'left' }}>
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

        <div
          className="flex items-center gap-1 text-[10px]"
          style={{ flexDirection: isRight ? 'row-reverse' : 'row' }}
        >
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
          const isHighlit  = p.id === discHolderId || p.id === selPullerId
          const activeColor = isPickMode ? accent! : teamColor

          return (
            <button
              key={p.id}
              onClick={() => onTap(p)}
              className="flex items-center gap-2 px-2 rounded-md border transition-all cursor-pointer"
              style={{
                flexDirection: isRight ? 'row-reverse' : 'row',
                textAlign:     isRight ? 'right' : 'left',
                background:   isPickMode ? `${activeColor}1a` : isHighlit ? `${teamColor}28` : 'var(--color-surf-2)',
                borderColor:  isPickMode ? `${activeColor}66` : isHighlit ? teamColor : 'var(--color-border)',
                color:        'var(--color-content)',
                fontWeight:   isHighlit ? 700 : 400,
              }}
            >
              {p.photoUrl ? (
                <img
                  src={p.photoUrl}
                  alt={p.name}
                  className="w-6 h-6 rounded-full flex-shrink-0 object-cover"
                  style={{ border: `1.5px solid ${isPickMode ? activeColor : isHighlit ? teamColor : 'var(--color-border-2)'}` }}
                />
              ) : (
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors"
                  style={{ background: isPickMode ? activeColor : isHighlit ? teamColor : 'var(--color-border)' }}
                />
              )}
              <span className="text-sm leading-none">{p.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
