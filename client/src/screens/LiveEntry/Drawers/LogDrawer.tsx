import { useLayoutEffect, useRef } from 'react'
import type { VisLogEntry, Player } from '@/core/types'
import { formatVisLogEntry, getVisLogColor, isMutedLogEntry } from '@/core/format'
import { Label } from '@/components/ui/Label'
import { Btn } from '@/components/ui/Btn'
import { Drawer } from './Drawer'

interface LogDrawerProps {
  visLog: VisLogEntry[]
  players: Player[]
  expanded: boolean
  onToggle: () => void
  onUndo: () => void
}

export const LOG_DRAWER_W = 280

export function LogDrawer({ visLog, players, expanded, onToggle, onUndo }: LogDrawerProps) {
  const logRef = useRef<HTMLDivElement>(null)

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

  return (
    <Drawer
      side="right"
      expanded={expanded}
      width={LOG_DRAWER_W}
      onToggle={onToggle}
      rail={<LogRailIcon />}
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
            const color = getVisLogColor(e.type)
            const muted = isMutedLogEntry(e.type)
            return (
              <div
                key={e.id}
                className="py-1 px-2 rounded text-[11px] border-l-2 text-center"
                style={{
                  borderLeftColor: color,
                  background: `${color}12`,
                  color: muted ? 'var(--color-muted)' : color,
                  fontFamily: e.type === 'system' || e.type === 'point-start' ? 'var(--font-mono)' : 'var(--font-sans)',
                }}
              >
                {formatVisLogEntry(e, players)}
              </div>
            )
          })
        )}
      </div>

      <div className="flex-shrink-0 p-1.5" style={{ borderTop: '1px solid var(--color-border)' }}>
        <Btn variant="ghost" size="sm" full onClick={onUndo}>↩ Undo</Btn>
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
