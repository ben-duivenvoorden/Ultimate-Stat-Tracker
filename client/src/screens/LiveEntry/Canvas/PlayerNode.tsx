import { forwardRef, useEffect, useRef } from 'react'
import { PILL_H } from './constants'
import { pillLabel, type ChipSpec } from './physics'
import { ActionChip } from './ActionChip'
import { CHIP_LABELS, type ChipId } from './layout'
import { getVisLogColor } from '@/core/format'
import type { VisLogEntry } from '@/core/types'

interface PlayerNodeProps {
  name: string
  teamColor: string
  isHolder: boolean
  isPuller: boolean
  isOpen: boolean
  dragging: boolean
  ineligible: boolean
  /** Always-mounted chip set for this pill (driven by holder/puller status,
   *  empty otherwise). Visibility is governed by `isOpen` so the CSS
   *  transition can run from invisible→visible when the pill is opened. */
  chips: ChipSpec[]
  onMouseDown: (e: React.MouseEvent) => void
  onTouchStart: (e: React.TouchEvent) => void
  onClick: (e: React.MouseEvent) => void
  onChipClick: (id: ChipId) => void
  /** Reports the rendered pill's half-width so physics can use real metrics
   *  rather than a font-based heuristic. */
  onMeasureWidth: (halfWidth: number) => void
}

// Fill colour for a chip — derives from the action category. The chip-category
// colour comes from getVisLogColor() as a `var(--color-…)` string, so we use
// color-mix() to apply alpha (a literal hex-alpha suffix wouldn't parse).
function chipFill(id: ChipId): string {
  const type = chipIdToVisType(id)
  const color = type ? getVisLogColor(type) : 'var(--color-muted)'
  return `color-mix(in srgb, ${color} 16%, transparent)`
}

function chipAccent(id: ChipId): string {
  const type = chipIdToVisType(id)
  return type ? getVisLogColor(type) : 'var(--color-muted)'
}

function chipIdToVisType(id: ChipId): VisLogEntry['type'] | null {
  switch (id) {
    case 'pull':         return 'pull'
    case 'pull-bonus':   return 'pull-bonus'
    case 'rec':          return 'turnover-receiver-error'
    case 'tw':           return 'turnover-throw-away'
    case 'st':           return 'turnover-stall'
    case 'blk':          return 'block'
    case 'int':          return 'intercept'
    case 'goal':         return 'goal'
  }
}

export const PlayerNode = forwardRef<HTMLDivElement, PlayerNodeProps>(function PlayerNode(
  { name, teamColor, isHolder, isPuller, isOpen, dragging, ineligible, chips,
    onMouseDown, onTouchStart, onClick, onChipClick, onMeasureWidth }, ref,
) {
  const display = pillLabel(name)
  const pillRef = useRef<HTMLDivElement | null>(null)

  // Measure the rendered pill width and report up. Using useEffect (not
  // useLayoutEffect) avoids a layout thrash; physics tolerates a one-frame
  // delay before the measured width replaces the heuristic.
  useEffect(() => {
    if (!pillRef.current) return
    const measure = () => {
      const el = pillRef.current
      if (!el) return
      const w = el.offsetWidth
      if (w > 0) onMeasureWidth(w / 2)
    }
    measure()
    // Re-measure if the pill resizes (e.g. font metrics ready, name changes).
    const ro = new ResizeObserver(measure)
    ro.observe(pillRef.current)
    return () => ro.disconnect()
  }, [name, onMeasureWidth])

  // Background / border by state. Holder = thicker border + fuller fill.
  const bg =
    ineligible           ? 'var(--color-surf-2)' :
    isOpen || isHolder   ? `${teamColor}28` :
    isPuller             ? `${teamColor}18` :
                           `${teamColor}08`
  const borderColor = ineligible ? 'var(--color-border)' : teamColor
  const borderWidth = isHolder ? 2.5 : 1.5
  const borderStyle = isPuller && !isHolder ? 'dashed' : 'solid'

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute', left: 0, top: 0,
        transform: 'translate3d(0,0,0)',
        willChange: 'transform',
        zIndex: isOpen || dragging ? 5 : 2,
        opacity: ineligible ? 0.4 : 1,
        pointerEvents: ineligible ? 'none' : 'auto',
      }}
    >
      {chips.map((a, i) => (
        <ActionChip
          key={a.id}
          id={a.id as ChipId}
          label={a.label || CHIP_LABELS[a.id as ChipId]}
          ax={a.ax} ay={a.ay} align={a.align}
          visible={isOpen}
          delay={isOpen ? i * 28 : 0}
          fill={chipFill(a.id as ChipId)}
          accent={chipAccent(a.id as ChipId)}
          onTap={onChipClick}
        />
      ))}
      <div
        ref={pillRef}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onClick={onClick}
        style={{
          height: PILL_H,
          padding: '0 16px',
          boxSizing: 'border-box',
          borderRadius: 9999,
          border: `${borderWidth}px ${borderStyle} ${borderColor}`,
          background: bg,
          color: ineligible ? 'var(--color-dim)' : 'var(--color-content)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          position: 'absolute', left: 0, top: 0,
          transform: dragging
            ? 'translate(-50%, -50%) scale(1.06)'
            : 'translate(-50%, -50%) scale(1)',
          fontFamily: 'var(--font-sans)',
          fontSize: 15, fontWeight: 600, letterSpacing: 0.2,
          whiteSpace: 'nowrap',
          userSelect: 'none', WebkitUserSelect: 'none',
          cursor: ineligible ? 'default' : (dragging ? 'grabbing' : 'grab'),
          touchAction: 'none',
          boxShadow: dragging
            ? `0 0 0 2px ${teamColor}4d, 0 8px 22px rgba(0,0,0,0.55), 0 0 22px ${teamColor}55`
            : isOpen
              ? `0 0 0 2px ${teamColor}33, 0 0 18px ${teamColor}55`
              : isHolder
                ? `0 0 12px ${teamColor}33`
                : '0 0 0 0 transparent',
          transition: 'box-shadow 160ms ease, background 160ms ease, transform 140ms ease, border-color 160ms ease',
        }}
      >
        {display}
      </div>
    </div>
  )
})
