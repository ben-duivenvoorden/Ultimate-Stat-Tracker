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
  player('a1', 'Alex Atkins', 'A', avatarUrl('AA', '#1f4788')),
  player('a2', 'Caoba Nichim-Luta', 'A', avatarUrl('CN', '#1f4788')),
  player('a3', 'Matt LaBar', 'A', avatarUrl('ML', '#1f4788')),
  player('a4', 'Ben Jagt', 'A', avatarUrl('BJ', '#1f4788')),
  player('a5', 'Benjamin Simmons', 'A', avatarUrl('BS', '#1f4788')),
  player('a6', 'Nicholas Whitlock', 'A', avatarUrl('NW', '#1f4788')),
  player('a7', 'Samuel McCrory', 'A', avatarUrl('SM', '#1f4788')),
  player('a8', 'Solomon Rueschemeyer-Bailey', 'A', avatarUrl('SR', '#1f4788')),
  player('a9', 'Tej Murthy', 'A', avatarUrl('TM', '#1f4788')),
]

const BREEZE_ROSTER: Player[] = [
  player('b1', 'Xavier Schafer', 'B', avatarUrl('XS', '#ff6640')),
  player('b2', 'Graham Turner', 'B', avatarUrl('GT', '#ff6640')),
  player('b3', 'Aidan Downey', 'B', avatarUrl('AD', '#ff6640')),
  player('b4', 'Charlie McCutcheon', 'B', avatarUrl('CM', '#ff6640')),
  player('b5', 'AJ Merriman', 'B', avatarUrl('AM', '#ff6640')),
  player('b6', 'Zachary Burpee', 'B', avatarUrl('ZB', '#ff6640')),
  player('b7', 'Lev Blumenfeld', 'B', avatarUrl('LB', '#ff6640')),
  player('b8', 'Wiebe van den Brink', 'B', avatarUrl('WV', '#ff6640')),
  player('b9', 'Ben Greenberg', 'B', avatarUrl('BG', '#ff6640')),
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
    lineSize: 7,
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
    lineSize: 7,
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
    lineSize: 7,
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
    lineSize: 7,
  },
]
