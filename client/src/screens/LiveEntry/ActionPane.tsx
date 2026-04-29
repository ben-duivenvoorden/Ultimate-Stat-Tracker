import { Label } from '@/components/ui/Label'
import { Btn } from '@/components/ui/Btn'
import type { GamePhase, UiMode } from '@/core/types'
import { TerminalPanel, type TerminalPanelProps } from './TerminalPanel'

interface ActionPaneProps {
  gamePhase: GamePhase
  uiMode: UiMode
  pullerSelected: boolean
  discHolderName: string | null
  selPullerName: string | null
  defendingShort: string

  onRecordPull:        (bonus?: boolean) => void
  onThrowAway:         () => void
  onReceiverError:     () => void
  onDefensiveBlock:    (t: 'block' | 'intercept') => void
  onGoal:              () => void
  onHalfTime:          () => void
  onEndGame:           () => void
  onInjurySub:         () => void
  showEventMenu:       boolean
  setShowEventMenu:    (v: boolean) => void

  terminalProps: TerminalPanelProps
}

export function ActionPane({
  gamePhase, uiMode, pullerSelected, discHolderName, selPullerName, defendingShort,
  onRecordPull, onThrowAway, onReceiverError, onDefensiveBlock, onGoal,
  onHalfTime, onEndGame, onInjurySub,
  showEventMenu, setShowEventMenu,
  terminalProps,
}: ActionPaneProps) {
  const isTerminal = gamePhase === 'point-over' || gamePhase === 'half-time' || gamePhase === 'game-over'
  const isPickMode = uiMode === 'block-pick' || uiMode === 'intercept-pick' || uiMode === 'injury-pick'
  const isPullPhase = gamePhase === 'awaiting-pull'
  const armed = gamePhase === 'in-play' && discHolderName !== null && !isPickMode

  const contextLabel =
    isPickMode
      ? uiMode === 'injury-pick'    ? 'TAP INJURED PLAYER'
      : uiMode === 'intercept-pick' ? `PICK INTERCEPTOR FROM ${defendingShort} · tap bg to cancel`
      :                                `PICK BLOCKER FROM ${defendingShort} · tap bg to cancel`
    : isPullPhase
      ? selPullerName ? selPullerName.toUpperCase() : 'TAP PULLER FIRST'
    : discHolderName
      ? `DISC WITH ${discHolderName.toUpperCase()}`
      : 'TAP PLAYER FIRST'

  const contextColor =
    uiMode === 'injury-pick' ? 'var(--color-warn)' :
    uiMode === 'block-pick' || uiMode === 'intercept-pick' ? 'var(--color-block)' :
    'var(--color-muted)'

  return (
    <div
      className="flex-1 flex flex-col"
      style={{ borderLeft: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)' }}
    >
      <div
        className="flex-shrink-0 h-7 flex items-center px-2.5 gap-1.5"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        {isPickMode && (
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: contextColor, boxShadow: `0 0 4px ${contextColor}` }}
          />
        )}
        <Label className="text-[9px] truncate" color={contextColor}>{contextLabel}</Label>
      </div>

      {isTerminal ? (
        <TerminalPanel {...terminalProps} />
      ) : isPickMode ? (
        <PickModePlaceholder uiMode={uiMode} />
      ) : isPullPhase ? (
        <div className="flex-1 p-1.5 flex flex-col gap-1.5">
          <ActionTile label="Pull"       variant="primary" disabled={!pullerSelected} onClick={() => onRecordPull(false)} />
          <ActionTile label="Pull Bonus" variant="warn"    disabled={!pullerSelected} onClick={() => onRecordPull(true)}  />
        </div>
      ) : (
        <div className="flex-1 p-1.5 flex flex-col gap-0.5 overflow-hidden">
          <Separator>INCOMPLETE</Separator>
          <ActionTile label="Receiver Error"      variant="danger"  disabled={!armed}                       onClick={onReceiverError} />
          <Separator>TURNOVER</Separator>
          <ActionTile label="Throw Away"          variant="warn"    disabled={!armed}                       onClick={onThrowAway} />
          <ActionTile label="Defensive Block"     variant="block"   disabled={gamePhase !== 'in-play'}     onClick={() => onDefensiveBlock('block')} />
          <ActionTile label="Defensive Intercept" variant="block"   disabled={gamePhase !== 'in-play'}     onClick={() => onDefensiveBlock('intercept')} />
          <Separator>COMPLETE</Separator>
          <ActionTile label="Goal"                variant="success" disabled={!armed}                       onClick={onGoal} />
        </div>
      )}

      {/* Stoppages button */}
      {!isTerminal && !isPickMode && !(gamePhase === 'pre-game') && (
        <div className="flex-shrink-0 p-1.5" style={{ borderTop: '1px solid var(--color-border)' }}>
          <Btn variant="ghost" size="sm" full onClick={() => setShowEventMenu(!showEventMenu)}>
            Stoppages
          </Btn>
        </div>
      )}

      {showEventMenu && (
        <>
          <div className="absolute inset-0 z-10" onClick={() => setShowEventMenu(false)} />
          <div
            className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 rounded-xl p-2 flex flex-col gap-1.5 min-w-44"
            style={{
              background: 'var(--color-surf)',
              border: '1px solid var(--color-border-2)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.8)',
            }}
          >
            <Label block className="mb-1 px-1">STOPPAGES</Label>
            <Btn variant="warn"  size="md" full onClick={onInjurySub}>Injury Sub</Btn>
            <Btn variant="ghost" size="md" full onClick={onHalfTime}>Half Time</Btn>
            <Btn variant="ghost" size="md" full onClick={onEndGame}>End Game</Btn>
          </div>
        </>
      )}
    </div>
  )
}

// ── Building blocks ────────────────────────────────────────────────────────────

type TileVariant = 'primary' | 'danger' | 'warn' | 'block' | 'success'

const tileColors: Record<TileVariant, { bg: string; color: string }> = {
  primary: { bg: 'var(--color-team-a)',  color: '#fff'             },
  danger:  { bg: 'var(--color-danger)',  color: '#fff'             },
  warn:    { bg: 'var(--color-warn)',    color: 'var(--color-bg)'  },
  block:   { bg: 'var(--color-block)',   color: '#fff'             },
  success: { bg: 'var(--color-success)', color: '#fff'             },
}

function ActionTile({
  label, variant, disabled, onClick,
}: {
  label: string
  variant: TileVariant
  disabled: boolean
  onClick: () => void
}) {
  const c = tileColors[variant]
  return (
    <button
      onClick={disabled ? undefined : onClick}
      className="flex-1 flex items-center justify-center rounded-lg border text-sm font-semibold transition-opacity"
      style={{
        background:  disabled ? 'var(--color-surf-2)' : c.bg,
        borderColor: disabled ? 'var(--color-border)' : 'transparent',
        color:       disabled ? 'var(--color-dim)'   : c.color,
        opacity:     disabled ? 0.4 : 1,
        cursor:      disabled ? 'default' : 'pointer',
      }}
    >
      {label}
    </button>
  )
}

function Separator({ children }: { children: string }) {
  return (
    <div
      className="flex items-center justify-center text-[9px] font-mono tracking-widest flex-shrink-0"
      style={{
        height: 20,
        color: 'var(--color-dim)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      {children}
    </div>
  )
}

function PickModePlaceholder({ uiMode }: { uiMode: UiMode }) {
  const isInjury    = uiMode === 'injury-pick'
  const isIntercept = uiMode === 'intercept-pick'
  const color = isInjury ? 'var(--color-warn)' : 'var(--color-block)'
  const label = isInjury    ? 'Injury Sub'
              : isIntercept ? 'Defensive Intercept'
              :               'Defensive Block'

  return (
    <div className="flex-1 p-1.5 flex flex-col gap-1.5">
      <div
        className="flex-shrink-0 h-12 rounded-lg flex items-center justify-center text-sm font-bold border"
        style={{ background: `${color}28`, borderColor: color, color }}
      >
        {label}
      </div>
    </div>
  )
}
