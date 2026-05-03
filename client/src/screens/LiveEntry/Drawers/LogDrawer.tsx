import { useLayoutEffect, useRef, useState } from 'react'
import type { VisLogEntry, Player, EventId } from '@/core/types'
import { formatVisLogEntry, getVisLogColor, isMutedLogEntry } from '@/core/format'
import { Label } from '@/components/ui/Label'
import { Btn } from '@/components/ui/Btn'
import { Drawer } from './Drawer'

interface LogDrawerProps {
  visLog: VisLogEntry[]
  players: Player[]
  expanded: boolean
  /** When set, entries with id > cursor are greyed/struck-through and the
   *  cursor entry itself is marked with a thick border + ▶ glyph. */
  truncateCursor: EventId | null
  /** Edit-mode range: entries with id in [from..to] render with a strike +
   *  warn-tint background. null = no range selected. */
  editRange: { from: EventId; to: EventId } | null
  /** True iff the system clipboard holds a UST log slice for THIS game.
   *  Drives the "long-press = paste here" affordance. */
  clipboardReady: boolean
  /** True while edit mode is active — long-press sets the replace range
   *  instead of triggering copy/paste. */
  editActive: boolean
  onToggle:    () => void
  onUndo:      () => void
  onSetCursor: (cursor: EventId | null) => void
  /** Long-press handler. Disambiguated by the parent based on
   *  truncateCursor / clipboardReady / editActive. */
  onLongPress: (entryId: EventId) => void
}

export const LOG_DRAWER_W = 280
const LONG_PRESS_MS = 500

export function LogDrawer({
  visLog, players, expanded, truncateCursor, editRange, clipboardReady, editActive,
  onToggle, onUndo, onSetCursor, onLongPress,
}: LogDrawerProps) {
  const logRef = useRef<HTMLDivElement>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFired = useRef(false)
  const [pressedId, setPressedId] = useState<EventId | null>(null)

  // Pin the scroll to the most-recent entry whenever the log changes OR the
  // drawer expands. The drawer's children are unmounted while collapsed, so
  // every expansion is effectively a fresh mount of this scroller — without
  // the `expanded` dep, the scrollTop stays at 0 and the user sees the
  // oldest events first.
  useLayoutEffect(() => {
    if (expanded && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [visLog.length, expanded])

  const startPress = (id: EventId) => {
    longPressFired.current = false
    setPressedId(id)
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true
      longPressTimer.current = null
      setPressedId(null)
      onLongPress(id)
    }, LONG_PRESS_MS)
  }
  const cancelPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    setPressedId(null)
  }
  const tapEntry = (id: EventId) => {
    // If the long-press already fired, the tap event is a release after — ignore.
    if (longPressFired.current) {
      longPressFired.current = false
      return
    }
    onSetCursor(truncateCursor === id ? null : id)
  }

  const longPressHint = editActive
    ? 'Long-press to set range end'
    : truncateCursor !== null
      ? 'Long-press to copy from cursor to here'
      : clipboardReady
        ? 'Long-press to paste after this entry'
        : 'Long-press to copy this entry'

  return (
    <Drawer
      side="right"
      expanded={expanded}
      width={LOG_DRAWER_W}
      onToggle={onToggle}
      rail={<LogRailIcon />}
      footer={
        <div className="flex-shrink-0 p-1.5" style={{ borderTop: '1px solid var(--color-border)' }}>
          <Btn variant="ghost" size="sm" full onClick={onUndo}>↩ Undo</Btn>
        </div>
      }
    >
      <div
        className="flex-shrink-0 h-7 flex items-center justify-center px-2.5"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <Label>EVENT LOG</Label>
      </div>

      <div ref={logRef} className="flex-1 p-1.5 flex flex-col gap-0.5 overflow-y-auto">
        {visLog.length === 0 ? (
          <Label className="py-2 text-center block">No events yet</Label>
        ) : (
          visLog.map(e => {
            const color    = getVisLogColor(e.type)
            const muted    = isMutedLogEntry(e.type)
            const past     = truncateCursor !== null && e.id > truncateCursor
            const isCursor = truncateCursor !== null && e.id === truncateCursor
            const inRange  = editRange !== null && e.id >= editRange.from && e.id <= editRange.to
            const pressed  = pressedId === e.id
            return (
              <div
                key={e.id}
                onClick={() => tapEntry(e.id)}
                onPointerDown={() => startPress(e.id)}
                onPointerUp={cancelPress}
                onPointerLeave={cancelPress}
                onPointerCancel={cancelPress}
                className="py-1 px-2 rounded text-[11px] text-center cursor-pointer select-none"
                style={{
                  borderLeft: `${isCursor ? 3 : 2}px solid ${color}`,
                  background: inRange ? 'var(--color-warn-bg)' : `${color}12`,
                  color: muted ? 'var(--color-muted)' : color,
                  fontFamily: e.type === 'system' || e.type === 'point-start' ? 'var(--font-mono)' : 'var(--font-sans)',
                  opacity: past ? 0.4 : 1,
                  textDecoration: past || inRange ? 'line-through' : 'none',
                  outline: pressed ? '2px solid var(--color-warn)' : 'none',
                  transition: 'outline 120ms',
                }}
                title={isCursor ? 'Tap to cancel preview' : longPressHint}
              >
                {isCursor && <span style={{ marginRight: 4 }}>▶</span>}
                {formatVisLogEntry(e, players)}
              </div>
            )
          })
        )}
      </div>
    </Drawer>
  )
}

function LogRailIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
      <rect x="2" y="3" width="10" height="1.4" rx="0.7" />
      <rect x="2" y="6.3" width="10" height="1.4" rx="0.7" />
      <rect x="2" y="9.6" width="10" height="1.4" rx="0.7" />
    </svg>
  )
}
