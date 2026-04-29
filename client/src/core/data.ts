import type { GameConfig, Player, Team } from './types'

function team(id: 'A' | 'B', name: string, short: string, color: string): Team {
  return { id, name, short, color }
}

function player(
  id: number, name: string, teamId: 'A' | 'B', gender: 'M' | 'F',
  photoUrl?: string, jerseyNumber?: number,
): Player {
  return {
    id, name, teamId, gender,
    ...(photoUrl ? { photoUrl } : {}),
    ...(jerseyNumber !== undefined ? { jerseyNumber } : {}),
  }
}

const EMPIRE = team('A', 'New York Empire', 'NYE', '#1f4788')
const BREEZE = team('B', 'DC Breeze', 'DCB', '#ff6640')

// Real-looking athlete portraits via randomuser.me (CC-licensed staged photos).
// Players without a portrait fall through to the avatar fallback chain in
// PlayerPane: jersey number in a circle if set, otherwise initials in a circle.
const portrait = (g: 'men' | 'women', n: number) => `https://randomuser.me/api/portraits/${g}/${n}.jpg`

// PlayerIds are surrogate integers, unique per game (Empire 1-13, Breeze 14-26).
const EMPIRE_ROSTER: Player[] = [
  player( 1, 'Alex Atkins',                  'A', 'M', portrait('men', 32),    7),
  player( 2, 'Caoba Nichim-Luta',            'A', 'M', portrait('men', 64)      ),
  player( 3, 'Matt LaBar',                   'A', 'M', undefined,             11),
  player( 4, 'Ben Jagt',                     'A', 'M', portrait('men', 17),   23),
  player( 5, 'Benjamin Simmons',             'A', 'M'                           ),
  player( 6, 'Nicholas Whitlock',            'A', 'M', undefined,              4),
  player( 7, 'Samuel McCrory',               'A', 'M', portrait('men', 45)      ),
  player( 8, 'Solomon Rueschemeyer-Bailey',  'A', 'M', portrait('men', 83),   42),
  player( 9, 'Tej Murthy',                   'A', 'M'                           ),
  player(10, 'Sarah Mitchell',               'A', 'F', portrait('women', 26),  6),
  player(11, 'Jordan Reyes',                 'A', 'F', portrait('women', 51)    ),
  player(12, 'Megan Fernandez',              'A', 'F', portrait('women', 9),  18),
  player(13, 'Leah Cohen',                   'A', 'F'                           ),
]

const BREEZE_ROSTER: Player[] = [
  player(14, 'Xavier Schafer',      'B', 'M', portrait('men', 12),     8),
  player(15, 'Graham Turner',       'B', 'M', undefined,              13),
  player(16, 'Aidan Downey',        'B', 'M', portrait('men', 76)       ),
  player(17, 'Charlie McCutcheon',  'B', 'M', portrait('men', 29),    21),
  player(18, 'AJ Merriman',         'B', 'M'                            ),
  player(19, 'Zachary Burpee',      'B', 'M', undefined,              88),
  player(20, 'Lev Blumenfeld',      'B', 'M', portrait('men', 53)       ),
  player(21, 'Wiebe van den Brink', 'B', 'M', portrait('men', 88),     3),
  player(22, 'Ben Greenberg',       'B', 'M'                            ),
  player(23, 'Maya Patel',          'B', 'F', portrait('women', 33),  14),
  player(24, 'Olivia Brooks',       'B', 'F', portrait('women', 68)     ),
  player(25, 'Emily Wong',          'B', 'F', undefined,               2),
  player(26, 'Hannah Reilly',       'B', 'F', portrait('women', 12)     ),
]

export const MOCK_GAMES: GameConfig[] = [
  {
    id: 1,
    name: 'Empire vs Breeze',
    scheduledTime: '09:00',
    teams: { A: EMPIRE, B: BREEZE },
    rosters: { A: EMPIRE_ROSTER, B: BREEZE_ROSTER },
    halfTimeAt: 8,
    scoreCapAt: 15,
  },
  {
    id: 2,
    name: 'AUDL Summer Series',
    scheduledTime: '11:30',
    teams: { A: EMPIRE, B: BREEZE },
    rosters: { A: EMPIRE_ROSTER, B: BREEZE_ROSTER },
    halfTimeAt: 8,
    scoreCapAt: 15,
  },
  {
    id: 4,
    name: 'Championship',
    scheduledTime: '16:30',
    teams: { A: EMPIRE, B: BREEZE },
    rosters: { A: EMPIRE_ROSTER, B: BREEZE_ROSTER },
    halfTimeAt: 8,
    scoreCapAt: 15,
  },
]
