import { beforeEach, describe, it, expect } from 'vitest'
import { deriveTeamsState } from '../teams/engine'
import type { TeamEvent } from '../teams/types'

let counter = 0
function ev(partial: Omit<TeamEvent, 'id' | 'timestamp'>): TeamEvent {
  return { id: ++counter, timestamp: 0, ...partial } as TeamEvent
}

beforeEach(() => { counter = 0 })

describe('deriveTeamsState', () => {
  it('empty log returns empty state', () => {
    const s = deriveTeamsState([])
    expect(s.teams).toHaveLength(0)
    expect(s.teamsById.size).toBe(0)
    expect(s.rosterByTeam.size).toBe(0)
    expect(s.playersById.size).toBe(0)
  })

  it('team-add materialises an active team', () => {
    const log: TeamEvent[] = [
      ev({ type: 'team-add', teamId: 1, name: 'Empire', short: 'NYE', color: '#fff' }),
    ]
    const s = deriveTeamsState(log)
    expect(s.teams).toHaveLength(1)
    expect(s.teams[0].name).toBe('Empire')
    expect(s.teams[0].archived).toBe(false)
    expect(s.teamsById.get(1)?.short).toBe('NYE')
  })

  it('team-edit patches just the supplied fields', () => {
    const log: TeamEvent[] = [
      ev({ type: 'team-add',  teamId: 1, name: 'Empire', short: 'NYE', color: '#fff' }),
      ev({ type: 'team-edit', teamId: 1, name: 'New York Empire' }),
      ev({ type: 'team-edit', teamId: 1, color: '#000' }),
    ]
    const t = deriveTeamsState(log).teamsById.get(1)!
    expect(t.name).toBe('New York Empire')
    expect(t.short).toBe('NYE')         // untouched by either edit
    expect(t.color).toBe('#000')
  })

  it('team-archive hides from active list but keeps the byId lookup', () => {
    const log: TeamEvent[] = [
      ev({ type: 'team-add',     teamId: 1, name: 'Empire',  short: 'NYE', color: '#fff' }),
      ev({ type: 'team-add',     teamId: 2, name: 'Breeze',  short: 'DCB', color: '#000' }),
      ev({ type: 'team-archive', teamId: 1 }),
    ]
    const s = deriveTeamsState(log)
    expect(s.teams.map(t => t.id)).toEqual([2])
    expect(s.teamsById.get(1)?.archived).toBe(true)
  })

  it('player-add lands in rosterByTeam and playersById', () => {
    const log: TeamEvent[] = [
      ev({ type: 'team-add',   teamId: 1, name: 'E', short: 'E', color: '#fff' }),
      ev({ type: 'player-add', playerId: 10, teamId: 1, name: 'Alice', gender: 'F' }),
      ev({ type: 'player-add', playerId: 11, teamId: 1, name: 'Bob',   gender: 'M', jerseyNumber: 7 }),
    ]
    const s = deriveTeamsState(log)
    expect(s.rosterByTeam.get(1)!.map(p => p.name)).toEqual(['Alice', 'Bob'])
    expect(s.playersById.get(11)?.jerseyNumber).toBe(7)
  })

  it('player-edit patches; jersey null clears', () => {
    const log: TeamEvent[] = [
      ev({ type: 'team-add',    teamId: 1, name: 'E', short: 'E', color: '#fff' }),
      ev({ type: 'player-add',  playerId: 10, teamId: 1, name: 'Alice', gender: 'F', jerseyNumber: 6 }),
      ev({ type: 'player-edit', playerId: 10, name: 'Alicia' }),
      ev({ type: 'player-edit', playerId: 10, jerseyNumber: null }),
    ]
    const p = deriveTeamsState(log).playersById.get(10)!
    expect(p.name).toBe('Alicia')
    expect(p.jerseyNumber).toBeUndefined()
  })

  it('player-remove hides from active roster but keeps lookup (historical resolve)', () => {
    const log: TeamEvent[] = [
      ev({ type: 'team-add',      teamId: 1, name: 'E', short: 'E', color: '#fff' }),
      ev({ type: 'player-add',    playerId: 10, teamId: 1, name: 'Alice', gender: 'F' }),
      ev({ type: 'player-add',    playerId: 11, teamId: 1, name: 'Bob',   gender: 'M' }),
      ev({ type: 'player-remove', playerId: 10 }),
    ]
    const s = deriveTeamsState(log)
    expect(s.rosterByTeam.get(1)!.map(p => p.id)).toEqual([11])
    expect(s.playersById.get(10)?.removed).toBe(true)
  })

  it('add → edit → archive → remove invariants: no entry vanishes from byId maps', () => {
    const log: TeamEvent[] = [
      ev({ type: 'team-add',      teamId: 1, name: 'E', short: 'E', color: '#fff' }),
      ev({ type: 'player-add',    playerId: 10, teamId: 1, name: 'Alice', gender: 'F' }),
      ev({ type: 'team-edit',     teamId: 1, name: 'Empire' }),
      ev({ type: 'player-edit',   playerId: 10, name: 'Alicia' }),
      ev({ type: 'team-archive',  teamId: 1 }),
      ev({ type: 'player-remove', playerId: 10 }),
    ]
    const s = deriveTeamsState(log)
    expect(s.teamsById.has(1)).toBe(true)
    expect(s.playersById.has(10)).toBe(true)
    expect(s.teams).toHaveLength(0)               // archived
    expect(s.rosterByTeam.get(1)).toHaveLength(0) // removed
  })

  it('events targeting unknown ids are no-ops (defensive)', () => {
    const log: TeamEvent[] = [
      ev({ type: 'team-edit',     teamId:   999, name: 'ghost' }),
      ev({ type: 'player-edit',   playerId: 999, name: 'ghost' }),
      ev({ type: 'team-archive',  teamId:   999 }),
      ev({ type: 'player-remove', playerId: 999 }),
    ]
    const s = deriveTeamsState(log)
    expect(s.teams).toHaveLength(0)
    expect(s.playersById.size).toBe(0)
  })
})
