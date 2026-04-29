import type { GameConfig, Player, Team } from './types'

function team(id: 'A' | 'B', name: string, short: string, color: string): Team {
  return { id, name, short, color }
}

function player(
  id: string, name: string, teamId: 'A' | 'B', gender: 'M' | 'F',
  photoUrl?: string, jerseyNumber?: number,
): Player {
  return {
    id, name, teamId, gender,
    ...(photoUrl ? { photoUrl } : {}),
    ...(jerseyNumber !== undefined ? { jerseyNumber } : {}),
  }
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

// Real-looking athlete portraits via randomuser.me (CC-licensed staged photos).
const portrait = (g: 'men' | 'women', n: number) => `https://randomuser.me/api/portraits/${g}/${n}.jpg`

const EMPIRE_ROSTER: Player[] = [
  player('a1',  'Alex Atkins',                  'A', 'M', portrait('men', 32),         7),
  player('a2',  'Caoba Nichim-Luta',            'A', 'M', portrait('men', 64)            ),
  player('a3',  'Matt LaBar',                   'A', 'M', avatarUrl('ML', '#1f4788'),  11),
  player('a4',  'Ben Jagt',                     'A', 'M', portrait('men', 17),         23),
  player('a5',  'Benjamin Simmons',             'A', 'M', avatarUrl('BS', '#1f4788')     ),
  player('a6',  'Nicholas Whitlock',            'A', 'M', avatarUrl('NW', '#1f4788'),   4),
  player('a7',  'Samuel McCrory',               'A', 'M', portrait('men', 45)            ),
  player('a8',  'Solomon Rueschemeyer-Bailey',  'A', 'M', portrait('men', 83),         42),
  player('a9',  'Tej Murthy',                   'A', 'M', avatarUrl('TM', '#1f4788')     ),
  player('a10', 'Sarah Mitchell',               'A', 'F', portrait('women', 26),        6),
  player('a11', 'Jordan Reyes',                 'A', 'F', portrait('women', 51)           ),
  player('a12', 'Megan Fernandez',              'A', 'F', portrait('women', 9),        18),
  player('a13', 'Leah Cohen',                   'A', 'F', avatarUrl('LC', '#1f4788')     ),
]

const BREEZE_ROSTER: Player[] = [
  player('b1',  'Xavier Schafer',      'B', 'M', portrait('men', 12),          8),
  player('b2',  'Graham Turner',       'B', 'M', avatarUrl('GT', '#ff6640'),  13),
  player('b3',  'Aidan Downey',        'B', 'M', portrait('men', 76)            ),
  player('b4',  'Charlie McCutcheon',  'B', 'M', portrait('men', 29),         21),
  player('b5',  'AJ Merriman',         'B', 'M', avatarUrl('AM', '#ff6640')     ),
  player('b6',  'Zachary Burpee',      'B', 'M', avatarUrl('ZB', '#ff6640'),  88),
  player('b7',  'Lev Blumenfeld',      'B', 'M', portrait('men', 53)            ),
  player('b8',  'Wiebe van den Brink', 'B', 'M', portrait('men', 88),          3),
  player('b9',  'Ben Greenberg',       'B', 'M', avatarUrl('BG', '#ff6640')     ),
  player('b10', 'Maya Patel',          'B', 'F', portrait('women', 33),       14),
  player('b11', 'Olivia Brooks',       'B', 'F', portrait('women', 68)           ),
  player('b12', 'Emily Wong',          'B', 'F', avatarUrl('EW', '#ff6640'),   2),
  player('b13', 'Hannah Reilly',       'B', 'F', portrait('women', 12)           ),
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
