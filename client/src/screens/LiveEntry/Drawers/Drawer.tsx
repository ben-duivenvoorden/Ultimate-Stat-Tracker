import type { ReactNode } from 'react'

interface DrawerProps {
  side: 'left' | 'right'
  expanded: boolean
  width: number
  /** Rail content (collapsed). Usually just an icon + chevron. */
  rail: ReactNode
  /** Panel content (expanded). */
  children: ReactNode
  /** Sits below the rail/panel, full drawer width, visible whether collapsed
   *  or expanded. Use for things that should be one tap away regardless of
   *  drawer state — e.g. Undo beneath the log, pill-size beneath admin. */
  footer?: ReactNode
  onToggle: () => void
}

const RAIL_W = 28

// A flex-sibling drawer that sits beside the canvas. Collapsed = a thin rail
// with an icon + chevron; expanded = full panel reserving its own width so the
// canvas shrinks to fill the rest. Drawers therefore *push* the canvas rather
// than overlap it; the canvas physics treats the smaller area as its bounds.
export function Drawer({ side, expanded, width, rail, children, footer, onToggle }: DrawerProps) {
  const isLeft = side === 'left'
  const drawerW = expanded ? width : RAIL_W
  return (
    // Vertical stack: rail/panel on top, optional footer below. Owns the
    // width transition for the whole column so the footer slides in lockstep.
    <div
      className="flex-shrink-0 flex flex-col"
      style={{
        width: drawerW,
        transition: 'width 220ms ease-in-out',
        background: 'var(--color-surf)',
        borderLeft:  isLeft ? 'none' : '1px solid var(--color-border)',
        borderRight: isLeft ? '1px solid var(--color-border)' : 'none',
        overflow: 'hidden',
      }}
    >
      <div className="flex-1 flex" style={{ minHeight: 0 }}>
        {/* Rail (always present; toggles the drawer when tapped) */}
        <button
          onClick={onToggle}
          className="flex-shrink-0 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
          style={{
            width: RAIL_W,
            background: 'transparent',
            border: 'none',
            color: 'var(--color-muted)',
          }}
          title={expanded ? 'Collapse' : 'Expand'}
        >
          {rail}
          <span style={{ fontSize: 12, lineHeight: 1 }}>
            {isLeft ? (expanded ? '◂' : '▸') : (expanded ? '▸' : '◂')}
          </span>
        </button>

        {/* Panel (visible only when expanded) */}
        {expanded && (
          <div className="flex-1 flex flex-col" style={{ minWidth: 0 }}>
            {children}
          </div>
        )}
      </div>

      {footer}
    </div>
  )
}

export const DRAWER_RAIL_W = RAIL_W
