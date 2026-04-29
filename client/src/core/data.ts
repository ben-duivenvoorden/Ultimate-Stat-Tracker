import type { GameConfig, Player, Team } from './types'

function team(id: 'A' | 'B', name: string, short: string, color: string): Team {
  return { id, name, short, color }
}

function player(id: string, name: string, teamId: 'A' | 'B', photoUrl?: string): Player {
  return { id, name, teamId, ...(photoUrl ? { photoUrl } : {}) }
}

function avatarUrl(initials: string, color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" fill="${color}"/><text x="64" y="75" font-size="48" font-weight="bold" text-anchor="middle" fill="white" font-family="system-ui">${initials}</text></svg>`
  if (typeof btoa !== 'undefined') {
    return `data:image/svg+xml;base64,${btoa(svg)}`
  } else if (typeof Buffer !== 'undefined') {
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
  } else {
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
  }
}

const EMPIRE = team('A', 'New York Empire', 'NYE', '#1f4788')
const BREEZE = team('B', 'DC Breeze', 'DCB', '#ff6640')

const EMPIRE_ROSTER: Player[] = [
  player('a1', 'Matt Geyer', 'A', avatarUrl('MG', '#1f4788')),
  player('a2', 'Kyle Weigand', 'A', avatarUrl('KW', '#1f4788')),
  player('a3', 'Brodie Smith', 'A', avatarUrl('BS', '#1f4788')),
  player('a4', 'Jimmy Mickle', 'A', avatarUrl('JM', '#1f4788')),
  player('a5', 'Ben Jagt', 'A', avatarUrl('BJ', '#1f4788')),
  player('a6', 'Chase Reznik', 'A', avatarUrl('CR', '#1f4788')),
  player('a7', 'David Pfeiffer', 'A', avatarUrl('DP', '#1f4788')),
  player('a8', 'Brannon Redmond', 'A', avatarUrl('BR', '#1f4788')),
  player('a9', 'Andrew Hull', 'A', avatarUrl('AH', '#1f4788')),
]

const BREEZE_ROSTER: Player[] = [
  player('b1', 'Marques Browlee', 'B', avatarUrl('MB', '#ff6640')),
  player('b2', 'Patrick Smith', 'B', avatarUrl('PS', '#ff6640')),
  player('b3', 'Ashlin Joye', 'B', avatarUrl('AJ', '#ff6640')),
  player('b4', 'Trey Katzenmeyer', 'B', avatarUrl('TK', '#ff6640')),
  player('b5', 'Pio Fernandez', 'B', avatarUrl('PF', '#ff6640')),
  player('b6', 'Beau Kittredge', 'B', avatarUrl('BK', '#ff6640')),
  player('b7', 'Nolan Thorne', 'B', avatarUrl('NT', '#ff6640')),
  player('b8', 'Alex Thorne', 'B', avatarUrl('AT', '#ff6640')),
  player('b9', 'Kevin Pyle', 'B', avatarUrl('KP', '#ff6640')),
]

export const MOCK_GAMES: GameConfig[] = [
  {
    id: 1,
    name: 'Empire vs Breeze',
    scheduledTime: '09:00',
    status: 'scheduled',
    teams: { A: EMPIRE, B: BREEZE },
    rosters: { A: EMPIRE_ROSTER, B: BREEZE_ROSTER },
    halfTimeAt: 8,
    scoreCapAt: 15,
  },
  {
    id: 2,
    name: 'AUDL Summer Series',
    scheduledTime: '11:30',
    status: 'in-progress',
    score: { A: 7, B: 6 },
    teams: { A: EMPIRE, B: BREEZE },
    rosters: { A: EMPIRE_ROSTER, B: BREEZE_ROSTER },
    halfTimeAt: 8,
    scoreCapAt: 15,
  },
  {
    id: 3,
    name: 'Playoffs Match 1',
    scheduledTime: '14:00',
    status: 'scheduled',
    teams: { A: EMPIRE, B: BREEZE },
    rosters: { A: EMPIRE_ROSTER, B: BREEZE_ROSTER },
    halfTimeAt: 8,
    scoreCapAt: 15,
  },
  {
    id: 4,
    name: 'Championship',
    scheduledTime: '16:30',
    status: 'scheduled',
    teams: { A: EMPIRE, B: BREEZE },
    rosters: { A: EMPIRE_ROSTER, B: BREEZE_ROSTER },
    halfTimeAt: 8,
    scoreCapAt: 15,
  },
]
