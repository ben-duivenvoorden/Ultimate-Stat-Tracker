import { useRef, useState } from 'react'
import type { Player } from '@/core/types'
import { PICK_MODES, type PickUiMode } from '@/core/pickModes'
import { Label } from '@/components/ui/Label'

export type PlayerPaneMode = 'normal' | 'pull' | PickUiMode

interface PlayerPaneProps {
  players: Player[]
  teamColor: string
  teamShort: string

  mode: PlayerPaneMode
  discHolderId: string | null
  selPullerId: string | null
  align?: 'right'

  onTap: (player: Player) => void
  onReorder?: (fromIdx: number, toIdx: number) => void
}

interface PaneMeta { bg: string; label: string; accent: string | null }

function paneMeta(mode: PlayerPaneMode): PaneMeta {
  if (mode === 'normal') return { bg: 'var(--color-bg)', label: 'POSSESSION', accent: null }
  if (mode === 'pull')   return { bg: 'var(--color-bg)', label: 'PULLING',    accent: null }
  const cfg = PICK_MODES[mode]
  return { bg: cfg.bgColor, label: cfg.paneLabel, accent: cfg.color }
}

interface DragState { fromIdx: number; targetIdx: number; deltaY: number }

export function PlayerPane({
  players, teamColor, teamShort,
  mode, discHolderId, selPullerId, align,
  onTap, onReorder,
}: PlayerPaneProps) {
  const { bg, label, accent } = paneMeta(mode)
  const isRight = align === 'right'
  const isPickMode = accent !== null

  const gridRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{ fromIdx: number; startY: number; slotHeight: number } | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)

  function startDrag(idx: number, e: React.PointerEvent<HTMLSpanElement>) {
    if (!onReorder || !gridRef.current) return
    const slotHeight = gridRef.current.offsetHeight / Math.max(players.length, 1)
    e.currentTarget.setPointerCapture(e.pointerId)
    e.stopPropagation()
    dragRef.current = { fromIdx: idx, startY: e.clientY, slotHeight }
    setDrag({ fromIdx: idx, targetIdx: idx, deltaY: 0 })
  }

  function moveDrag(e: React.PointerEvent<HTMLSpanElement>) {
    if (!dragRef.current) return
    const { fromIdx, startY, slotHeight } = dragRef.current
    const deltaY = e.clientY - startY
    const slots = Math.round(deltaY / slotHeight)
    const targetIdx = Math.max(0, Math.min(players.length - 1, fromIdx + slots))
    setDrag({ fromIdx, targetIdx, deltaY })
  }

  function endDrag(e: React.PointerEvent<HTMLSpanElement>) {
    if (!dragRef.current) return
    const { fromIdx } = dragRef.current
    const targetIdx = drag?.targetIdx ?? fromIdx
    e.currentTarget.releasePointerCapture(e.pointerId)
    dragRef.current = null
    setDrag(null)
    if (onReorder && targetIdx !== fromIdx) onReorder(fromIdx, targetIdx)
  }

  return (
    <div
      className="flex-1 flex flex-col transition-colors duration-200"
      style={{ background: bg }}
    >
      <div
        className="flex-shrink-0 h-7 flex items-center px-2"
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
      </div>

      <div
        ref={gridRef}
        className="flex-1 p-1 grid gap-1 overflow-hidden"
        style={{ gridTemplateRows: `repeat(${players.length}, 1fr)` }}
      >
        {players.map((p, idx) => {
          const isHighlit  = p.id === discHolderId || p.id === selPullerId
          const isIneligible = mode === 'receiver-error-pick' && p.id === discHolderId
          const activeColor = isPickMode ? accent! : teamColor

          // Drag visualization: dragged row follows finger; rows in-between shift.
          let translateY = 0
          let zIndex = 0
          let lifted = false
          if (drag) {
            if (idx === drag.fromIdx) {
              translateY = drag.deltaY
              zIndex = 10
              lifted = true
            } else if (drag.targetIdx > drag.fromIdx && idx > drag.fromIdx && idx <= drag.targetIdx) {
              translateY = -dragRef.current!.slotHeight
            } else if (drag.targetIdx < drag.fromIdx && idx < drag.fromIdx && idx >= drag.targetIdx) {
              translateY = dragRef.current!.slotHeight
            }
          }

          return (
            <div
              key={p.id}
              className="relative"
              style={{
                transform: `translateY(${translateY}px)`,
                transition: lifted ? 'none' : 'transform 160ms ease',
                zIndex,
              }}
            >
              <button
                onClick={isIneligible ? undefined : () => onTap(p)}
                className="w-full h-full flex items-center gap-2 px-2 rounded-md border transition-colors"
                style={{
                  flexDirection: isRight ? 'row-reverse' : 'row',
                  textAlign:     isRight ? 'right' : 'left',
                  background:   isIneligible ? 'var(--color-surf-2)' : isPickMode ? `${activeColor}1a` : isHighlit ? `${teamColor}28` : 'var(--color-surf-2)',
                  borderColor:  isIneligible ? 'var(--color-border)' : isPickMode ? `${activeColor}66` : isHighlit ? teamColor : 'var(--color-border)',
                  color:        isIneligible ? 'var(--color-dim)' : 'var(--color-content)',
                  fontWeight:   isHighlit ? 700 : 400,
                  opacity:      isIneligible ? 0.4 : 1,
                  cursor:       isIneligible ? 'default' : 'pointer',
                  boxShadow:    lifted ? '0 6px 18px rgba(0,0,0,0.5)' : 'none',
                  // Pad the side opposite the photo so name doesn't run under the handle.
                  paddingLeft:  isRight ? 24 : undefined,
                  paddingRight: isRight ? undefined : 24,
                }}
              >
                {p.photoUrl ? (
                  <img
                    src={p.photoUrl}
                    alt={p.name}
                    className="w-6 h-6 rounded-full flex-shrink-0 object-cover"
                    style={{ border: `1.5px solid ${isIneligible ? 'var(--color-border)' : isPickMode ? activeColor : isHighlit ? teamColor : 'var(--color-border-2)'}` }}
                  />
                ) : (
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors"
                    style={{ background: isIneligible ? 'var(--color-border)' : isPickMode ? activeColor : isHighlit ? teamColor : 'var(--color-border)' }}
                  />
                )}
                <span className="text-sm leading-none">
                  {p.jerseyNumber !== undefined && (
                    <span
                      className="font-mono mr-1.5"
                      style={{ color: isIneligible ? 'var(--color-dim)' : 'var(--color-muted)' }}
                    >
                      #{p.jerseyNumber}
                    </span>
                  )}
                  {p.name}
                </span>
              </button>
              {onReorder && (
                <span
                  role="button"
                  aria-label="Reorder player"
                  onPointerDown={(e) => startDrag(idx, e)}
                  onPointerMove={moveDrag}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  className="absolute top-0 bottom-0 flex items-center px-2 select-none"
                  style={{
                    [isRight ? 'left' : 'right']: 0,
                    cursor: drag ? 'grabbing' : 'grab',
                    color: 'var(--color-muted)',
                    touchAction: 'none',
                  }}
                >
                  <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
                    <circle cx="2" cy="3" r="1" /><circle cx="8" cy="3" r="1" />
                    <circle cx="2" cy="7" r="1" /><circle cx="8" cy="7" r="1" />
                    <circle cx="2" cy="11" r="1" /><circle cx="8" cy="11" r="1" />
                  </svg>
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
