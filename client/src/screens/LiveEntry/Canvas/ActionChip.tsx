import type { ChipAlign } from './physics'
import type { ChipId } from './layout'

interface ActionChipProps {
  id: ChipId
  label: string
  ax: number
  ay: number
  align: ChipAlign
  visible: boolean
  delay: number
  /** Background tint (typically `${teamColor}28` or the event's category colour). */
  fill: string
  /** Border + text colour. */
  accent: string
  onTap: (id: ChipId) => void
}

export function ActionChip({
  id, label, ax, ay, align, visible, delay, fill, accent, onTap,
}: ActionChipProps) {
  let tx = '-50%', ty = '-50%'
  if (align === 'left-center')   { tx = '0%';    ty = '-50%' }
  if (align === 'right-center')  { tx = '-100%'; ty = '-50%' }
  if (align === 'center-top')    { tx = '-50%';  ty = '0%'   }
  if (align === 'center-bottom') { tx = '-50%';  ty = '-100%' }

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onClick={(e) => { e.stopPropagation(); onTap(id) }}
      style={{
        position: 'absolute',
        left: '50%', top: '50%',
        transform: visible
          ? `translate(${ax}px, ${ay}px) translate(${tx}, ${ty}) scale(1)`
          : `translate(0px, 0px) translate(-50%, -50%) scale(0.5)`,
        // Slightly translucent so pass arrows are visible passing under
        // chips, but legibility is preserved. Chips still sit above the
        // arrow layer (z-index inherited from PlayerNode).
        opacity: visible ? 0.95 : 0,
        transition: visible
          ? `transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms, opacity 160ms ease ${delay}ms`
          : 'transform 140ms ease, opacity 120ms ease',
        pointerEvents: visible ? 'auto' : 'none',
        padding: '5px 10px',
        borderRadius: 9999,
        border: `1px solid ${accent}`,
        background: fill,
        color: accent,
        fontSize: 11, fontWeight: 600, letterSpacing: 0.2,
        whiteSpace: 'nowrap',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        cursor: 'pointer',
      }}
    >
      {label}
    </div>
  )
}
