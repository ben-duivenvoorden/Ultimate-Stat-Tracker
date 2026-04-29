import { useRef, useEffect } from 'react'
import type { VisLogEntry, Player } from '@/core/types'
import { Label } from '@/components/ui/Label'
import { Btn } from '@/components/ui/Btn'
import { formatVisLogEntry, getVisLogColor, isMutedLogEntry } from '@/core/format'

interface LogPaneProps {
  visLog: VisLogEntry[]
  players: Player[]
  isGameOver: boolean
  onUndo: () => void
  onExport?: () => void
}

export function LogPane({ visLog, players, isGameOver, onUndo, onExport }: LogPaneProps) {
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [visLog.length])

  return (
    <div className="flex-1 flex flex-col" style={{ minWidth: 0 }}>
      <div
        className="flex-shrink-0 h-7 flex items-center justify-between px-2.5"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <Label>EVENT LOG</Label>
        {!isGameOver && <Btn variant="ghost" size="xs">Edit</Btn>}
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
                className="py-1 px-2 rounded text-[11px] border-l-2"
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
        {isGameOver ? (
          <Btn variant="primary" size="sm" full onClick={onExport}>Export Stats</Btn>
        ) : (
          <Btn variant="ghost" size="sm" full onClick={onUndo}>↩ Undo</Btn>
        )}
      </div>
    </div>
  )
}
