import { useState } from 'react'
import { Btn } from '@/components/ui/Btn'
import { Chip } from '@/components/ui/Chip'
import { Label } from '@/components/ui/Label'
import { useGameStore } from '@/core/store'
import { useTeamsState } from '@/core/selectors'
import type { GlobalTeam, GlobalPlayer, GlobalTeamId } from '@/core/teams/types'

// Sentinel for the "+ New Team" row in the left list.
const NEW_TEAM_SENTINEL = -1

const DEFAULT_NEW_TEAM_COLOR = '#1f4788'

export default function TeamsManager() {
  const teamsState       = useTeamsState()
  const closeTeamsManager = useGameStore(s => s.closeTeamsManager)
  const addTeam          = useGameStore(s => s.addTeam)
  const editTeam         = useGameStore(s => s.editTeam)
  const archiveTeam      = useGameStore(s => s.archiveTeam)
  const addPlayer        = useGameStore(s => s.addPlayer)
  const editPlayer       = useGameStore(s => s.editPlayer)
  const removePlayer     = useGameStore(s => s.removePlayer)
  const resetAllData     = useGameStore(s => s.resetAllData)

  const [selectedId, setSelectedId] = useState<GlobalTeamId | null>(
    teamsState.teams.length > 0 ? teamsState.teams[0].id : null,
  )

  const isNew = selectedId === NEW_TEAM_SENTINEL
  const selectedTeam = !isNew && selectedId !== null
    ? teamsState.teamsById.get(selectedId) ?? null
    : null

  return (
    <div className="h-full flex bg-bg text-content">
      {/* ── Team list ── */}
      <div className="w-64 flex-shrink-0 flex flex-col border-r border-border">
        <div className="px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <Label block className="mb-1">TEAMS MANAGER</Label>
              <div className="text-base font-bold">Roster</div>
            </div>
            <button
              onClick={closeTeamsManager}
              className="text-muted hover:text-content transition-colors cursor-pointer text-base"
              title="Done"
            >
              Done
            </button>
          </div>
          {/* Escape hatch when localStorage drifts from the demo seed. */}
          <button
            onClick={() => {
              if (window.confirm('Reset all teams, players and scheduled games to the demo seed? Any in-progress session will be lost.')) {
                resetAllData()
              }
            }}
            className="mt-2 text-[10px] font-mono tracking-widest uppercase cursor-pointer transition-colors hover:text-danger"
            style={{ color: 'var(--color-muted)' }}
            title="Wipe persisted teams + games and reseed"
          >
            ⚠ Reset all data
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <button
            onClick={() => setSelectedId(NEW_TEAM_SENTINEL)}
            className="w-full text-left px-4 py-3 border-b border-border transition-colors cursor-pointer"
            style={{
              borderLeft: `3px solid ${isNew ? 'var(--color-success)' : 'transparent'}`,
              background: isNew ? 'var(--color-surf-2)' : 'transparent',
            }}
          >
            <div className="text-sm font-semibold text-content mb-1.5">+ New Team</div>
            <Label>Add to your roster</Label>
          </button>
          {teamsState.teams.map(t => {
            const isActive = selectedId === t.id
            const count = teamsState.rosterByTeam.get(t.id)?.length ?? 0
            return (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className="w-full text-left px-4 py-3 border-b border-border transition-colors cursor-pointer"
                style={{
                  borderLeft: `3px solid ${isActive ? t.color : 'transparent'}`,
                  background: isActive ? 'var(--color-surf-2)' : 'transparent',
                }}
              >
                <div className="text-sm font-semibold text-content mb-1.5">{t.name}</div>
                <div className="flex items-center gap-2">
                  <Chip color={t.color}>{t.short}</Chip>
                  <Label>{count} {count === 1 ? 'player' : 'players'}</Label>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Detail pane ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {isNew ? (
          <NewTeamPane
            onCreate={(name, short, color) => {
              const id = addTeam(name, short, color)
              setSelectedId(id)
            }}
            onCancel={() => setSelectedId(selectedTeam?.id ?? null)}
          />
        ) : selectedTeam ? (
          <TeamDetailPane
            team={selectedTeam}
            roster={teamsState.rosterByTeam.get(selectedTeam.id) ?? []}
            onEditTeam={(patch) => editTeam(selectedTeam.id, patch)}
            onArchive={() => {
              if (window.confirm(`Archive ${selectedTeam.name}? Historical games will still resolve their rosters.`)) {
                archiveTeam(selectedTeam.id)
                setSelectedId(null)
              }
            }}
            onAddPlayer={(p) => addPlayer(selectedTeam.id, p.name, p.gender, p.extras)}
            onEditPlayer={editPlayer}
            onRemovePlayer={removePlayer}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="text-4xl mb-3 opacity-30">👥</div>
            <Label>Select a team from the list</Label>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── New team pane ───────────────────────────────────────────────────────────

function NewTeamPane({ onCreate, onCancel }: {
  onCreate: (name: string, short: string, color: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [short, setShort] = useState('')
  const [color, setColor] = useState(DEFAULT_NEW_TEAM_COLOR)
  const canSave = name.trim().length > 0 && short.trim().length > 0

  return (
    <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
      <div className="w-full max-w-md flex flex-col gap-4">
        <div className="text-center">
          <Label block className="mb-1">NEW TEAM</Label>
          <div className="text-base font-bold">Add to your roster</div>
        </div>
        <TextField label="Name"  value={name}  onChange={setName}  placeholder="Empire" autoFocus />
        <TextField label="Short" value={short} onChange={s => setShort(s.toUpperCase())} placeholder="NYE" />
        <ColorField label="Colour" value={color} onChange={setColor} />
        <div className="flex gap-2">
          <Btn variant="ghost"   size="md" full onClick={onCancel}>Cancel</Btn>
          <Btn variant="primary" size="md" full disabled={!canSave}
            onClick={() => onCreate(name.trim(), short.trim(), color)}>
            Save
          </Btn>
        </div>
      </div>
    </div>
  )
}

// ─── Team detail pane ────────────────────────────────────────────────────────

function TeamDetailPane({ team, roster, onEditTeam, onArchive, onAddPlayer, onEditPlayer, onRemovePlayer }: {
  team:           GlobalTeam
  roster:         GlobalPlayer[]
  onEditTeam:     (patch: { name?: string; short?: string; color?: string }) => void
  onArchive:      () => void
  onAddPlayer:    (p: { name: string; gender: 'M' | 'F'; extras?: { jerseyNumber?: number } }) => void
  onEditPlayer:   (id: number, patch: { name?: string; gender?: 'M' | 'F'; jerseyNumber?: number | null }) => void
  onRemovePlayer: (id: number) => void
}) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header — rename / short / colour inline. */}
      <div className="flex-shrink-0 border-b border-border p-4 flex items-center gap-3 flex-wrap">
        <Chip color={team.color}>{team.short}</Chip>
        <input
          type="text"
          value={team.name}
          onChange={e => onEditTeam({ name: e.target.value })}
          className="flex-1 min-w-[12rem] h-10 px-3 rounded-md border text-base font-bold text-content"
          style={{ background: 'var(--color-surf-2)', borderColor: 'var(--color-border-2)' }}
        />
        <input
          type="text"
          value={team.short}
          onChange={e => onEditTeam({ short: e.target.value.toUpperCase().slice(0, 4) })}
          className="w-16 h-10 px-2 rounded-md border text-sm font-mono font-bold text-center text-content"
          style={{ background: 'var(--color-surf-2)', borderColor: 'var(--color-border-2)' }}
          title="Short tag"
        />
        <input
          type="color"
          value={team.color}
          onChange={e => onEditTeam({ color: e.target.value })}
          className="w-10 h-10 rounded-md border cursor-pointer"
          style={{ borderColor: 'var(--color-border-2)' }}
          title="Team colour"
        />
        <Btn variant="ghost" size="sm" onClick={onArchive}>Archive</Btn>
      </div>

      {/* Roster table */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-[3rem_1fr_4rem_5rem] gap-2 text-[10px] font-mono tracking-widest mb-2"
             style={{ color: 'var(--color-muted)' }}>
          <span>GENDER</span>
          <span>NAME</span>
          <span>#</span>
          <span></span>
        </div>
        <div className="flex flex-col gap-1.5">
          {roster.map(p => (
            <PlayerRow
              key={p.id}
              player={p}
              onEdit={patch => onEditPlayer(p.id, patch)}
              onRemove={() => {
                if (window.confirm(`Remove ${p.name}? Existing games still resolve their roster by id.`)) {
                  onRemovePlayer(p.id)
                }
              }}
            />
          ))}
        </div>
        <div className="mt-4">
          <AddPlayerInline onAdd={onAddPlayer} />
        </div>
      </div>
    </div>
  )
}

function PlayerRow({ player, onEdit, onRemove }: {
  player:   GlobalPlayer
  onEdit:   (patch: { name?: string; gender?: 'M' | 'F'; jerseyNumber?: number | null }) => void
  onRemove: () => void
}) {
  return (
    <div className="grid grid-cols-[3rem_1fr_4rem_5rem] gap-2 items-center">
      <select
        value={player.gender}
        onChange={e => onEdit({ gender: e.target.value as 'M' | 'F' })}
        className="h-9 px-2 rounded-md border text-sm font-mono text-content cursor-pointer"
        style={{ background: 'var(--color-surf-2)', borderColor: 'var(--color-border-2)' }}
      >
        <option value="M">M</option>
        <option value="F">F</option>
      </select>
      <input
        type="text"
        value={player.name}
        onChange={e => onEdit({ name: e.target.value })}
        className="h-9 px-3 rounded-md border text-sm text-content"
        style={{ background: 'var(--color-surf-2)', borderColor: 'var(--color-border-2)' }}
      />
      <input
        type="number"
        value={player.jerseyNumber ?? ''}
        onChange={e => {
          const raw = e.target.value
          onEdit({ jerseyNumber: raw === '' ? null : Number(raw) })
        }}
        placeholder="#"
        className="h-9 px-2 rounded-md border text-sm font-mono text-center text-content"
        style={{ background: 'var(--color-surf-2)', borderColor: 'var(--color-border-2)' }}
      />
      <Btn variant="ghost" size="sm" onClick={onRemove}>Remove</Btn>
    </div>
  )
}

function AddPlayerInline({ onAdd }: {
  onAdd: (p: { name: string; gender: 'M' | 'F'; extras?: { jerseyNumber?: number } }) => void
}) {
  const [name, setName] = useState('')
  const [gender, setGender] = useState<'M' | 'F'>('M')
  const [jersey, setJersey] = useState('')
  const canAdd = name.trim().length > 0

  const submit = () => {
    if (!canAdd) return
    const extras: { jerseyNumber?: number } = jersey === '' ? {} : { jerseyNumber: Number(jersey) }
    onAdd({ name: name.trim(), gender, extras })
    setName('')
    setJersey('')
  }

  return (
    <div
      className="grid grid-cols-[3rem_1fr_4rem_5rem] gap-2 items-center p-2 rounded-md border"
      style={{ background: 'var(--color-surf)', borderColor: 'var(--color-border)' }}
    >
      <select
        value={gender}
        onChange={e => setGender(e.target.value as 'M' | 'F')}
        className="h-9 px-2 rounded-md border text-sm font-mono text-content cursor-pointer"
        style={{ background: 'var(--color-surf-2)', borderColor: 'var(--color-border-2)' }}
      >
        <option value="M">M</option>
        <option value="F">F</option>
      </select>
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit() }}
        placeholder="Player name…"
        className="h-9 px-3 rounded-md border text-sm text-content"
        style={{ background: 'var(--color-surf-2)', borderColor: 'var(--color-border-2)' }}
      />
      <input
        type="number"
        value={jersey}
        onChange={e => setJersey(e.target.value)}
        placeholder="#"
        className="h-9 px-2 rounded-md border text-sm font-mono text-center text-content"
        style={{ background: 'var(--color-surf-2)', borderColor: 'var(--color-border-2)' }}
      />
      <Btn variant="primary" size="sm" disabled={!canAdd} onClick={submit}>+ Add</Btn>
    </div>
  )
}

// ─── Shared form bits ────────────────────────────────────────────────────────

function TextField({ label, value, onChange, placeholder, autoFocus }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoFocus?: boolean
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-mono tracking-widest" style={{ color: 'var(--color-muted)' }}>
        {label.toUpperCase()}
      </span>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="h-10 px-3 rounded-md border text-sm font-medium text-content"
        style={{ background: 'var(--color-surf-2)', borderColor: 'var(--color-border-2)' }}
      />
    </label>
  )
}

function ColorField({ label, value, onChange }: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3 px-3 h-10 rounded-md border"
      style={{ background: 'var(--color-surf-2)', borderColor: 'var(--color-border-2)' }}>
      <span className="text-sm font-semibold text-content">{label}</span>
      <input
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-10 h-7 rounded cursor-pointer"
      />
    </label>
  )
}
