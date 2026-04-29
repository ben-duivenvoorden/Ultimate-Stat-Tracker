import { useGameStore } from '@/core/store'
import { useRecordingOptions } from '@/core/selectors'
import { Label } from '@/components/ui/Label'
import { Btn } from '@/components/ui/Btn'

export default function GameSettings() {
  const closeGameSettings   = useGameStore(s => s.closeGameSettings)
  const updateRecordingOption = useGameStore(s => s.updateRecordingOption)
  const options = useRecordingOptions()

  return (
    <div className="h-full flex flex-col bg-bg text-content">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border">
        <button
          onClick={closeGameSettings}
          className="text-sm text-muted hover:text-content transition-colors cursor-pointer"
        >
          ←
        </button>
        <div>
          <Label block className="mb-0.5">RECORDING SETTINGS</Label>
          <div className="text-sm font-bold">Configure what events are tracked</div>
        </div>
      </div>

      {/* Settings body */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 max-w-lg">

        <SectionHeading>PULL PHASE</SectionHeading>
        <SettingRow
          label="Pull Bonus"
          description="Track when a pull lands in the attacking end zone"
          checked={options.pullBonus}
          onChange={v => updateRecordingOption('pullBonus', v)}
        />

        <SectionHeading>STOPPAGES</SectionHeading>
        <SettingRow
          label="Foul"
          description="Record foul calls during play"
          checked={options.foul}
          onChange={v => updateRecordingOption('foul', v)}
        />
        <SettingRow
          label="Pick"
          description="Record pick violations during play"
          checked={options.pick}
          onChange={v => updateRecordingOption('pick', v)}
        />

        <div
          className="mt-4 px-3 py-2.5 rounded-lg text-[11px]"
          style={{ background: 'var(--color-surf-2)', color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}
        >
          These settings apply to all new games. In future, some options will be locked by the league or tournament.
        </div>
      </div>

      <div className="flex-shrink-0 p-4 border-t border-border">
        <Btn variant="primary" size="md" full onClick={closeGameSettings}>
          Done
        </Btn>
      </div>
    </div>
  )
}

// ── Building blocks ────────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: string }) {
  return (
    <div className="pt-2 pb-1">
      <Label className="text-[9px]">{children}</Label>
    </div>
  )
}

interface SettingRowProps {
  label:       string
  description: string
  checked:     boolean
  onChange:    (v: boolean) => void
}

function SettingRow({ label, description, checked, onChange }: SettingRowProps) {
  return (
    <div
      className="flex items-center justify-between gap-4 px-3 py-3 rounded-lg border cursor-pointer"
      style={{
        background:  checked ? 'var(--color-surf-2)' : 'transparent',
        borderColor: checked ? 'var(--color-border-2)' : 'var(--color-border)',
      }}
      onClick={() => onChange(!checked)}
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-content leading-none mb-1">{label}</div>
        <div className="text-[11px]" style={{ color: 'var(--color-muted)' }}>{description}</div>
      </div>
      <Toggle checked={checked} />
    </div>
  )
}

function Toggle({ checked }: { checked: boolean }) {
  return (
    <div
      className="flex-shrink-0 w-10 h-6 rounded-full relative transition-colors duration-200"
      style={{ background: checked ? 'var(--color-success)' : 'var(--color-surf-2)', border: '1px solid var(--color-border-2)' }}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full transition-transform duration-200"
        style={{
          background: checked ? '#fff' : 'var(--color-dim)',
          transform: checked ? 'translateX(18px)' : 'translateX(2px)',
        }}
      />
    </div>
  )
}
