import { forwardRef, useEffect, useRef } from 'react'
import { PILL_H, PILL_FONT_SIZE, PILL_PADDING_X } from './constants'
import { pillLabel, type ChipSpec } from './physics'
import { ActionChip } from './ActionChip'
import { CHIP_LABELS, type ChipId } from './layout'
import { getVisLogColor } from '@/core/format'
import type { VisLogEntry } from '@/core/types'

interface PlayerNodeProps {
  name: string
  teamColor: string
  /** Multiplier on the base pill dimensions (height, font, padding). */
  scale: number
  isHolder: boolean
  isPuller: boolean
  isOpen: boolean
  dragging: boolean
  ineligible: boolean
  /** Chip ids that should render dimmed and ignore taps (e.g. Goal /
   *  Receiver Error during a fresh possession before any pass has been
   *  recorded). */
  disabledChipIds?: ReadonlySet<ChipId>
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
  // 28% colored fill keeps the chip body legible while still letting pass
  // arrows passing beneath read through. ActionChip layers a slight overall
  // 0.95 opacity on top.
  return `color-mix(in srgb, ${color} 28%, transparent)`
}

function chipAccent(id: ChipId): string {
  const type = chipIdToVisType(id)
  return type ? getVisLogColor(type) : 'var(--color-muted)'
}

function chipIdToVisType(id: ChipId): VisLogEntry['type'] | null {
  switch (id) {
    case 'pull':         return 'pull'
    case 'pull-bonus':   return 'pull-bonus'
    case 'brick':        return 'brick'
    case 'rec':          return 'turnover-receiver-error'
    case 'tw':           return 'turnover-throw-away'
    case 'st':           return 'turnover-stall'
    case 'blk':          return 'block'
    case 'int':          return 'intercept'
    case 'goal':         return 'goal'
  }
}

export const PlayerNode = forwardRef<HTMLDivElement, PlayerNodeProps>(function PlayerNode(
  { name, teamColor, scale, isHolder, isPuller, isOpen, dragging, ineligible, chips,
    disabledChipIds, onMouseDown, onTouchStart, onClick, onChipClick, onMeasureWidth }, ref,
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
  const borderWidth = isHolder ? 2.5 : isPuller ? 2 : 1.5

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
      {/* Connector lines from each chip back to the pill's perimeter, in
          the team colour. Rendered as a tiny SVG anchored at the pill's
          centre with overflow:visible so the lines sit in pill-local
          coordinates. */}
      {chips.length > 0 && (
        <svg
          style={{
            position: 'absolute',
            left: 0, top: 0, width: 0, height: 0,
            overflow: 'visible',
            pointerEvents: 'none',
            opacity: isOpen ? 0.95 : 0,
            transition: isOpen ? 'opacity 200ms ease 60ms' : 'opacity 120ms ease',
          }}
        >
          {chips.map(a => {
            const dist = Math.hypot(a.ax, a.ay)
            if (dist === 0) return null
            const ux = a.ax / dist, uy = a.ay / dist
            const x2 = a.ax, y2 = a.ay
            const x1 = a.ax - ux * a.connectorLength
            const y1 = a.ay - uy * a.connectorLength
            return (
              <line
                key={a.id}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={teamColor}
                strokeWidth={2}
                strokeLinecap="round"
              />
            )
          })}
        </svg>
      )}
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
          disabled={disabledChipIds?.has(a.id as ChipId) ?? false}
          onTap={onChipClick}
        />
      ))}
      <div
        ref={pillRef}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onClick={onClick}
        style={{
          height: PILL_H * scale,
          padding: `0 ${PILL_PADDING_X * scale}px`,
          boxSizing: 'border-box',
          borderRadius: 9999,
          border: `${borderWidth}px solid ${borderColor}`,
          background: bg,
          color: ineligible ? 'var(--color-dim)' : 'var(--color-content)',
          // `width: max-content` + flex makes the pill grow/shrink to its
          // label. Plain `inline-flex` on an absolutely-positioned element
          // can collapse to zero width, which is why the static heuristic
          // (and any measurement based off that DOM node) fell over before.
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 'max-content',
          position: 'absolute', left: 0, top: 0,
          transform: dragging
            ? 'translate(-50%, -50%) scale(1.06)'
            : 'translate(-50%, -50%) scale(1)',
          fontFamily: 'var(--font-sans)',
          fontSize: PILL_FONT_SIZE * scale, fontWeight: 600, letterSpacing: 0.2,
          whiteSpace: 'nowrap',
          userSelect: 'none', WebkitUserSelect: 'none',
          cursor: ineligible ? 'default' : (dragging ? 'grabbing' : 'grab'),
          touchAction: 'none',
          boxShadow: dragging
            ? `0 0 0 2px ${teamColor}4d, 0 8px 22px rgba(0,0,0,0.55), 0 0 22px ${teamColor}55`
            : isOpen
              ? `0 0 0 2px ${teamColor}33, 0 0 18px ${teamColor}55`
              : isPuller && !isHolder
                ? `0 0 0 3px ${teamColor}3d, 0 0 28px ${teamColor}99`
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
