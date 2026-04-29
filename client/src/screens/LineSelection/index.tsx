import { useState } from 'react'
import { Btn } from '@/components/ui/Btn'
import { Chip } from '@/components/ui/Chip'
import { Label } from '@/components/ui/Label'
import { useSession, useDerivedState, useRecordingOptions } from '@/core/selectors'
import { useGameStore, seedDefaultLine } from '@/core/store'
import type { Player, GameMode } from '@/core/types'

export default function LineSelection() {
  const session        = useSession()
  const state          = useDerivedState()
  const isInjurySub    = useGameStore(s => s.isInjurySub)
  const confirmLine    = useGameStore(s => s.confirmLine)
  const backToGameList = useGameStore(s => s.backToGameList)
  const swapSides      = useGameStore(s => s.swapSides)
  const toggleSwap     = useGameStore(s => s.toggleSwapSides)
  const { lineRatio, gameMode } = useRecordingOptions()

  const rosters = session?.gameConfig.rosters
  const teams   = session?.gameConfig.teams

  // Seed selection from the derived activeLine if it's been set (mid-game), or
  // from a sensible default of the roster otherwise (very first point).
  const initialA = (state && state.activeLine.A.length > 0) ? state.activeLine.A : (rosters ? seedDefaultLine(rosters.A) : [])
  const initialB = (state && state.activeLine.B.length > 0) ? state.activeLine.B : (rosters ? seedDefaultLine(rosters.B) : [])
  const [selA, setSelA] = useState<Player[]>(initialA)
  const [selB, setSelB] = useState<Player[]>(initialB)
  const [overrideOpen, setOverrideOpen] = useState(false)

  if (!rosters || !teams) return null

  const toggle = (player: Player, sel: Player[], setSel: (p: Player[]) => void) => {
    if (sel.find(p => p.id === player.id)) {
      setSel(sel.filter(p => p.id !== player.id))
    } else {
      setSel([...sel, player])
    }
  }

  const validateA = validateLine(selA, gameMode, lineRatio)
  const validateB = validateLine(selB, gameMode, lineRatio)
  const linesValid = validateA.ok && validateB.ok

  const onConfirmClick = () => {
    if (linesValid) {
      confirmLine(selA, selB)
    } else {
      setOverrideOpen(true)
    }
  }

  return (
    <div className="h-full flex flex-col bg-bg text-content">
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-border">
        <button
          onClick={backToGameList}
          className="text-muted hover:text-content transition-colors cursor-pointer"
          title="Back to games"
        >
          ←
        </button>
        <div className="flex-1">
          <Label block>
            {isInjurySub ? 'INJURY SUBSTITUTION — MID-POINT' : 'LINE SELECTION'}
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Btn variant="primary" size="md" onClick={onConfirmClick}>
            {isInjurySub ? 'Confirm Substitutions' : 'Confirm Line'}
          </Btn>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Swap-sides toggle, centred between the two team names. */}
        <button
          onClick={toggleSwap}
          className="absolute top-1.5 left-1/2 -translate-x-1/2 z-10 w-8 h-8 rounded-full border flex items-center justify-center text-base leading-none transition-colors cursor-pointer"
          style={{
            background:  'var(--color-surf-2)',
            borderColor: 'var(--color-border-2)',
            color:       'var(--color-muted)',
          }}
          title="Swap team sides"
        >
          ⇆
        </button>

        <TeamColumn
          players={rosters[swapSides ? 'B' : 'A']}
          selected={swapSides ? selB : selA}
          color={teams[swapSides ? 'B' : 'A'].color}
          label={teams[swapSides ? 'B' : 'A'].name}
          onToggle={p => toggle(p, swapSides ? selB : selA, swapSides ? setSelB : setSelA)}
          onSetAll={swapSides ? setSelB : setSelA}
          gameMode={gameMode}
          targetM={lineRatio.M}
          targetF={lineRatio.F}
        />
        <TeamColumn
          players={rosters[swapSides ? 'A' : 'B']}
          selected={swapSides ? selA : selB}
          color={teams[swapSides ? 'A' : 'B'].color}
          label={teams[swapSides ? 'A' : 'B'].name}
          onToggle={p => toggle(p, swapSides ? selA : selB, swapSides ? setSelA : setSelB)}
          onSetAll={swapSides ? setSelA : setSelB}
          align="right"
          gameMode={gameMode}
          targetM={lineRatio.M}
          targetF={lineRatio.F}
        />
      </div>

      {overrideOpen && (
        <OverrideDialog
          teamAName={teams.A.short}
          teamBName={teams.B.short}
          validateA={validateA}
          validateB={validateB}
          onCancel={() => setOverrideOpen(false)}
          onConfirm={() => {
            setOverrideOpen(false)
            confirmLine(selA, selB)
          }}
        />
      )}
    </div>
  )
}

// ─── Validation ───────────────────────────────────────────────────────────────

interface LineValidation {
  ok: boolean
  warnings: string[]
}

function validateLine(sel: Player[], mode: GameMode, ratio: { M: number; F: number }): LineValidation {
  const target = ratio.M + ratio.F
  const total  = sel.length
  const warnings: string[] = []

  if (total !== target) {
    const delta = total - target
    warnings.push(delta > 0 ? `${delta} too many` : `${-delta} short`)
  }

  if (mode === 'mixed') {
    const m = sel.filter(p => p.gender === 'M').length
    const f = sel.filter(p => p.gender === 'F').length
    if (m !== ratio.M) warnings.push(`M ${m}/${ratio.M}`)
    if (f !== ratio.F) warnings.push(`F ${f}/${ratio.F}`)
  }

  return { ok: warnings.length === 0, warnings }
}

// ─── Team column ──────────────────────────────────────────────────────────────

interface TeamColumnProps {
  players: Player[]
  selected: Player[]
  color: string
  label: string
  onToggle: (p: Player) => void
  onSetAll: (next: Player[]) => void
  align?: 'right'
  gameMode: GameMode
  targetM: number
  targetF: number
}

function TeamColumn({
  players, selected, color, label, onToggle, onSetAll, align,
  gameMode, targetM, targetF,
}: TeamColumnProps) {
  const isRight = align === 'right'
  const total  = selected.length
  const countM = selected.filter(p => p.gender === 'M').length
  const countF = selected.filter(p => p.gender === 'F').length
  const target = targetM + targetF
  const allSelected = players.length > 0 && total === players.length

  const chipColor = (count: number, t: number) =>
    count > t ? 'var(--color-danger)'
      : count === t ? 'var(--color-success)'
      : count > 0 ? 'var(--color-warn)'
      : 'var(--color-muted)'

  return (
    <div className={`flex-1 flex flex-col ${!isRight ? 'border-r border-border' : ''}`}>
      {/* Team header — All/None + count chips grouped on the outside (above the ticks),
          team name bunched toward the centre divider. */}
      <div
        className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border flex-shrink-0"
        style={{ flexDirection: isRight ? 'row-reverse' : 'row' }}
      >
        <div
          className="flex items-center gap-2"
          style={{ flexDirection: isRight ? 'row-reverse' : 'row' }}
        >
          <button
            type="button"
            onClick={() => onSetAll(allSelected ? [] : players)}
            className="text-xs font-mono uppercase tracking-widest px-2.5 h-7 rounded border cursor-pointer transition-colors"
            style={{
              color: 'var(--color-muted)',
              borderColor: 'var(--color-border)',
              background: 'transparent',
            }}
            title={allSelected ? 'Deselect all' : 'Select all'}
          >
            {allSelected ? 'None' : 'All'}
          </button>
          {gameMode === 'mixed' ? (
            <>
              <Chip color={chipColor(countM, targetM)}>M {countM}/{targetM}</Chip>
              <Chip color={chipColor(countF, targetF)}>F {countF}/{targetF}</Chip>
            </>
          ) : (
            <Chip color={chipColor(total, target)}>{total}/{target}</Chip>
          )}
        </div>

        <span className="text-base font-bold" style={{ color }}>{label}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
        {[...players].sort((a, b) => a.name.localeCompare(b.name)).map(p => {
          const isOn = !!selected.find(s => s.id === p.id)
          return (
            <button
              key={p.id}
              onClick={() => onToggle(p)}
              className="flex items-center gap-3 h-13 px-4 rounded-lg border cursor-pointer transition-all"
              style={{
                background:  isOn ? `${color}18` : 'var(--color-surf-2)',
                borderColor: isOn ? `${color}55` : 'var(--color-border)',
                flexDirection: isRight ? 'row-reverse' : 'row',
                height: 52,
              }}
            >
              <span
                className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-sm text-white border transition-all"
                style={{
                  background:  isOn ? color : 'transparent',
                  borderColor: isOn ? color : 'var(--color-dim)',
                }}
              >
                {isOn && '✓'}
              </span>
              {gameMode === 'mixed' && (
                <span
                  className="flex-shrink-0 w-5 text-center text-xs font-mono font-bold"
                  style={{ color: p.gender === 'F' ? 'var(--color-warn)' : 'var(--color-muted)' }}
                  title={p.gender === 'F' ? 'Female-matching' : 'Male-matching'}
                >
                  {p.gender}
                </span>
              )}
              <span
                className="text-lg flex-1"
                style={{
                  fontWeight: isOn ? 600 : 400,
                  color: isOn ? 'var(--color-content)' : 'var(--color-muted)',
                  textAlign: isRight ? 'right' : 'left',
                }}
              >
                {/* Jersey number sits on the centre-divider side of the name. */}
                {isRight && p.jerseyNumber !== undefined && (
                  <span className="font-mono mr-2 text-base" style={{ color: 'var(--color-dim)' }}>
                    #{p.jerseyNumber}
                  </span>
                )}
                {p.name}
                {!isRight && p.jerseyNumber !== undefined && (
                  <span className="font-mono ml-2 text-base" style={{ color: 'var(--color-dim)' }}>
                    #{p.jerseyNumber}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Override dialog ──────────────────────────────────────────────────────────

interface OverrideDialogProps {
  teamAName: string
  teamBName: string
  validateA: LineValidation
  validateB: LineValidation
  onCancel: () => void
  onConfirm: () => void
}

function OverrideDialog({ teamAName, teamBName, validateA, validateB, onCancel, onConfirm }: OverrideDialogProps) {
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onClick={onCancel}
    >
      <div
        className="rounded-xl p-5 w-full max-w-sm flex flex-col gap-3"
        style={{ background: 'var(--color-surf)', border: '1px solid var(--color-border-2)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="text-sm font-bold text-content">Confirm with mismatch?</div>
        <div className="text-[12px]" style={{ color: 'var(--color-muted)' }}>
          The line(s) below don't match the configured composition. You can override and continue, or cancel and adjust.
        </div>

        {!validateA.ok && (
          <div
            className="px-3 py-2 rounded-md text-[11px] font-mono"
            style={{ background: 'var(--color-warn-bg)', color: 'var(--color-warn)', border: '1px solid var(--color-warn)' }}
          >
            <span className="font-bold mr-1.5">{teamAName}:</span>{validateA.warnings.join(' · ')}
          </div>
        )}
        {!validateB.ok && (
          <div
            className="px-3 py-2 rounded-md text-[11px] font-mono"
            style={{ background: 'var(--color-warn-bg)', color: 'var(--color-warn)', border: '1px solid var(--color-warn)' }}
          >
            <span className="font-bold mr-1.5">{teamBName}:</span>{validateB.warnings.join(' · ')}
          </div>
        )}

        <div className="flex gap-2 mt-1">
          <Btn variant="ghost"   size="md" full onClick={onCancel}>Cancel</Btn>
          <Btn variant="primary" size="md" full onClick={onConfirm}>Override &amp; Continue</Btn>
        </div>
      </div>
    </div>
  )
}
