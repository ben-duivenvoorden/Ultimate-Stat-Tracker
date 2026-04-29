import { Label } from '@/components/ui/Label'
import { Btn } from '@/components/ui/Btn'
import type { GamePhase, UiMode, RecordingOptions } from '@/core/types'
import { PICK_MODES, isPickMode, resolveContextLabel, type PickUiMode } from '@/core/pickModes'
import { deadDiscLabel, type DeadDiscEventType } from '@/core/format'
import { TerminalPanel, type TerminalPanelProps } from './TerminalPanel'

interface ActionPaneProps {
  gamePhase: GamePhase
  uiMode: UiMode
  pullerSelected: boolean
  discHolderName: string | null
  selPullerName: string | null
  defendingShort: string
  recordingOptions: RecordingOptions
  deadDiscEvent: DeadDiscEventType | null

  onRecordPull:        (bonus?: boolean) => void
  onThrowAway:         () => void
  onReceiverError:     () => void
  onDefensiveBlock:    (t: 'block' | 'intercept') => void
  onCancelPickMode:    () => void
  onGoal:              () => void
  onHalfTime:          () => void
  onEndGame:           () => void
  onInjurySub:         () => void
  onStall:             () => void
  onFoul:              () => void
  onPick:              () => void
  onTimeout:           () => void
  showEventMenu:       boolean
  setShowEventMenu:    (v: boolean) => void

  terminalProps: TerminalPanelProps
}

export function ActionPane({
  gamePhase, uiMode, pullerSelected, discHolderName, selPullerName, defendingShort,
  recordingOptions, deadDiscEvent,
  onRecordPull, onThrowAway, onReceiverError, onDefensiveBlock, onGoal,
  onHalfTime, onEndGame, onInjurySub, onStall, onFoul, onPick, onTimeout,
  onCancelPickMode,
  showEventMenu, setShowEventMenu,
  terminalProps,
}: ActionPaneProps) {
  const isTerminal = gamePhase === 'point-over' || gamePhase === 'half-time' || gamePhase === 'game-over'
  const pickMode   = isPickMode(uiMode) ? uiMode : null
  const isPullPhase = gamePhase === 'awaiting-pull'
  const armed = gamePhase === 'in-play' && discHolderName !== null && !pickMode

  const contextLabel = pickMode
    ? resolveContextLabel(pickMode, { defendingShort })
    : isPullPhase
      ? selPullerName ? selPullerName.toUpperCase() : 'SELECT PULLER'
    : discHolderName
      ? `DISC WITH ${discHolderName.toUpperCase()}`
    : deadDiscEvent
      ? deadDiscLabel(deadDiscEvent)
      : 'TAP PLAYER FIRST'

  const contextColor = pickMode ? PICK_MODES[pickMode].color : 'var(--color-muted)'

  return (
    <div
      className="flex-1 flex flex-col"
      style={{ borderLeft: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)' }}
    >
      {!pickMode && !isTerminal && (
        <div
          className="flex-shrink-0 h-7 flex items-center justify-center px-2.5"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <Label className="text-[9px] truncate" color={contextColor}>{contextLabel}</Label>
        </div>
      )}

      {isTerminal ? (
        <TerminalPanel {...terminalProps} />
      ) : pickMode ? (
        <PickModePlaceholder uiMode={pickMode} onCancel={onCancelPickMode} />
      ) : isPullPhase ? (
        <div className="flex-1 p-1.5 flex flex-col gap-1.5">
          <ActionTile label="Pull"       variant="primary" disabled={!pullerSelected} onClick={() => onRecordPull(false)} compact />
          {recordingOptions.pullBonus && (
            <ActionTile label="Pull Bonus" variant="warn" disabled={!pullerSelected} onClick={() => onRecordPull(true)} compact />
          )}
        </div>
      ) : (
        <div className="flex-1 p-1.5 flex flex-col gap-0.5 overflow-hidden">
          <Separator>INCOMPLETE</Separator>
          <ActionTile label="Receiver Error"      variant="warn"    disabled={!armed}                       onClick={onReceiverError} />
          <Separator>TURNOVERS</Separator>
          <ActionTile label="Throw Away"          variant="danger"    disabled={!armed}                       onClick={onThrowAway} />
          <ActionTile label="Blocked by Defence"    variant="block"     disabled={!armed} onClick={() => onDefensiveBlock('block')} />
          <ActionTile label="Intercepted by Defence" variant="intercept" disabled={!armed} onClick={() => onDefensiveBlock('intercept')} />
          {recordingOptions.stall && (
            <ActionTile label="Stall"               variant="stall"     disabled={!armed}                       onClick={onStall} />
          )}
          <Separator>COMPLETE</Separator>
          <ActionTile label="Goal"                variant="success" disabled={!armed}                       onClick={onGoal} />
        </div>
      )}

      {/* Stoppages button */}
      {!isTerminal && !pickMode && !(gamePhase === 'pre-game') && (
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
            {recordingOptions.foul && (
              <Btn variant="ghost" size="md" full onClick={onFoul}>Foul</Btn>
            )}
            {recordingOptions.pick && (
              <Btn variant="ghost" size="md" full onClick={onPick}>Pick</Btn>
            )}
            <Btn variant="ghost" size="md" full onClick={onTimeout}>Timeout</Btn>
            <Btn variant="ghost" size="md" full onClick={onHalfTime}>Half Time</Btn>
            <Btn variant="ghost" size="md" full onClick={onEndGame}>End Game</Btn>
          </div>
        </>
      )}
    </div>
  )
}

// ── Building blocks ────────────────────────────────────────────────────────────

type TileVariant = 'primary' | 'danger' | 'warn' | 'stall' | 'block' | 'intercept' | 'success'

const tileColors: Record<TileVariant, { bg: string; color: string }> = {
  primary:   { bg: 'var(--color-team-a)',    color: '#fff'            },
  danger:    { bg: 'var(--color-danger)',    color: '#fff'            },
  warn:      { bg: 'var(--color-warn)',      color: 'var(--color-bg)' },
  stall:     { bg: 'var(--color-stall)',     color: '#fff'            },
  block:     { bg: 'var(--color-block)',     color: '#fff'            },
  intercept: { bg: 'var(--color-intercept)', color: 'var(--color-bg)' },
  success:   { bg: 'var(--color-success)',   color: '#fff'            },
}

function ActionTile({
  label, variant, disabled, onClick, compact,
}: {
  label: string
  variant: TileVariant
  disabled: boolean
  onClick: () => void
  /** Fixed height instead of flex-1 — for phases with only a couple of tiles
      (e.g. pull/pull-bonus) so they don't stretch to fill the column. */
  compact?: boolean
}) {
  const c = tileColors[variant]
  return (
    <button
      onClick={disabled ? undefined : onClick}
      className={`${compact ? 'h-14 flex-shrink-0' : 'flex-1'} flex items-center justify-center rounded-lg border text-sm font-semibold transition-opacity`}
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

function PickModePlaceholder({
  uiMode,
  onCancel,
}: {
  uiMode: PickUiMode
  onCancel: () => void
}) {
  const { color, displayName } = PICK_MODES[uiMode]

  return (
    <div className="flex-1 p-1.5 flex flex-col gap-1.5">
      <div
        className="flex-shrink-0 h-12 rounded-lg flex items-center justify-center text-sm font-bold border"
        style={{ background: `${color}28`, borderColor: color, color }}
      >
        {displayName}
      </div>
      <div className="flex-1" />
      <Btn variant="ghost" size="sm" full onClick={onCancel}>
        Cancel
      </Btn>
    </div>
  )
}
