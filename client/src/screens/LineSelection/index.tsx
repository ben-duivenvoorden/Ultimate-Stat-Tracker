import { useState } from 'react'
import { Btn } from '@/components/ui/Btn'
import { Chip } from '@/components/ui/Chip'
import { Label } from '@/components/ui/Label'
import { useSession } from '@/core/selectors'
import { useGameStore } from '@/core/store'
import type { Player } from '@/core/types'

export default function LineSelection() {
  const session     = useSession()
  const isInjurySub = useGameStore(s => s.isInjurySub)
  const confirmLine = useGameStore(s => s.confirmLine)

  const rosters    = session?.gameConfig.rosters
  const teams      = session?.gameConfig.teams
  const activeLine = session?.activeLine

  const [selA, setSelA] = useState<Player[]>(activeLine?.A ?? [])
  const [selB, setSelB] = useState<Player[]>(activeLine?.B ?? [])

  if (!rosters || !teams) return null

  const toggle = (player: Player, sel: Player[], setSel: (p: Player[]) => void) => {
    if (sel.find(p => p.id === player.id)) {
      setSel(sel.filter(p => p.id !== player.id))
    } else if (sel.length < 7) {
      setSel([...sel, player])
    }
  }

  const canConfirm = selA.length > 0 && selB.length > 0
  const warnA = selA.length > 0 && selA.length < 7
  const warnB = selB.length > 0 && selB.length < 7

  return (
    <div className="h-full flex flex-col bg-bg text-content">
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-border">
        <div>
          <Label block className="mb-0.5">
            {isInjurySub ? 'INJURY SUBSTITUTION — MID-POINT' : 'LINE SELECTION'}
          </Label>
          <div className="text-sm font-bold">
            {isInjurySub ? 'Swap one player, then confirm' : 'Pick up to 7 _New Changes players per team'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(warnA || warnB) && <Chip color="var(--color-warn)">Fewer than 7 selected</Chip>}
          <Btn variant="primary" size="md" disabled={!canConfirm} onClick={() => confirmLine(selA, selB)}>
            {isInjurySub ? 'Confirm Sub' : 'Confirm Line →'}
          </Btn>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <TeamColumn
          players={rosters.A}
          selected={selA}
          color={teams.A.color}
          label={teams.A.name}
          onToggle={p => toggle(p, selA, setSelA)}
          divider
        />
        <TeamColumn
          players={rosters.B}
          selected={selB}
          color={teams.B.color}
          label={teams.B.name}
          onToggle={p => toggle(p, selB, setSelB)}
        />
      </div>
    </div>
  )
}

interface TeamColumnProps {
  players: Player[]
  selected: Player[]
  color: string
  label: string
  onToggle: (p: Player) => void
  divider?: boolean
}

function TeamColumn({ players, selected, color, label, onToggle, divider }: TeamColumnProps) {
  const count = selected.length
  const countColor = count === 7 ? 'var(--color-success)' : count > 0 ? 'var(--color-warn)' : 'var(--color-muted)'

  return (
    <div className={`flex-1 flex flex-col ${divider ? 'border-r border-border' : ''}`}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border flex-shrink-0">
        <span className="text-sm font-bold" style={{ color }}>{label}</span>
        <Chip color={countColor}>{count} / 7</Chip>
      </div>

      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
        {players.map(p => {
          const isOn = !!selected.find(s => s.id === p.id)
          return (
            <button
              key={p.id}
              onClick={() => onToggle(p)}
              className="flex items-center gap-2.5 h-10 px-3 rounded-lg border text-left cursor-pointer transition-all"
              style={{
                background:  isOn ? `${color}18` : 'var(--color-surf-2)',
                borderColor: isOn ? `${color}55` : 'var(--color-border)',
              }}
            >
              <span
                className="flex-shrink-0 w-4 h-4 rounded flex items-center justify-center text-[10px] text-white border transition-all"
                style={{
                  background:  isOn ? color : 'transparent',
                  borderColor: isOn ? color : 'var(--color-dim)',
                }}
              >
                {isOn && '✓'}
              </span>
              <span className="text-sm" style={{
                fontWeight: isOn ? 600 : 400,
                color: isOn ? 'var(--color-content)' : 'var(--color-muted)',
              }}>
                {p.name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
