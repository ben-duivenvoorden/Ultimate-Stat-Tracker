import type { ReactNode } from 'react'

interface DrawerProps {
  side: 'left' | 'right'
  expanded: boolean
  width: number
  /** Rail content (collapsed). Usually just an icon + chevron. */
  rail: ReactNode
  /** Panel content (expanded). */
  children: ReactNode
  onToggle: () => void
}

const RAIL_W = 28

// A fixed-position drawer that lives above the canvas. Collapsed = a thin rail
// with an icon + chevron; expanded = full panel that overlays the canvas.
// Physics inside the canvas is *not* constrained by drawer state — pills can
// drift behind. The parent shifts the canvas's logical centre to compensate.
export function Drawer({ side, expanded, width, rail, children, onToggle }: DrawerProps) {
  const isLeft = side === 'left'
  return (
    <div
      style={{
        position: 'absolute',
        top: 0, bottom: 0,
        [isLeft ? 'left' : 'right']: 0,
        width: expanded ? width : RAIL_W,
        transition: `width 220ms ease-in-out`,
        background: 'var(--color-surf)',
        borderLeft:  isLeft  ? 'none' : '1px solid var(--color-border)',
        borderRight: isLeft  ? '1px solid var(--color-border)' : 'none',
        zIndex: 20,
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden',
      }}
    >
      {/* Rail (always present; toggles the drawer when tapped) */}
      <button
        onClick={onToggle}
        className="flex-shrink-0 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
        style={{
          width: RAIL_W,
          background: 'transparent',
          border: 'none',
          borderLeft:  isLeft && expanded ? 'none' : undefined,
          borderRight: !isLeft && expanded ? 'none' : undefined,
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
  )
}

export const DRAWER_RAIL_W = RAIL_W
