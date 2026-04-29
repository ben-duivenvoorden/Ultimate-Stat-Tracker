import type { GameConfig, Player, Team } from './types'

function team(id: 'A' | 'B', name: string, short: string, color: string): Team {
  return { id, name, short, color }
}

function player(id: string, name: string, teamId: 'A' | 'B'): Player {
  return { id, name, teamId }
}

const BRI = team('A', 'Brisbanites', 'BRI', '#4a9eff')
const EXT = team('B', 'Extinction',  'EXT', '#ff6640')

const BRI_ROSTER: Player[] = [
  player('a1', 'Sam W.',      'A'),
  player('a2', 'Jordan K.',   'A'),
  player('a3', 'Mia T.',      'A'),
  player('a4', 'Lachlan B.',  'A'),
  player('a5', 'Priya S.',    'A'),
  player('a6', 'Tom H.',      'A'),
  player('a7', 'Evie R.',     'A'),
  player('a8', 'Kai M.',      'A'),
  player('a9', 'Dana F.',     'A'),
]

const EXT_ROSTER: Player[] = [
  player('b1', 'Callum D.',   'B'),
  player('b2', 'Jess O.',     'B'),
  player('b3', 'Marcus L.',   'B'),
  player('b4', 'Tara N.',     'B'),
  player('b5', 'Flynn M.',    'B'),
  player('b6', 'Soph C.',     'B'),
  player('b7', 'Rhys P.',     'B'),
  player('b8', 'Ava G.',      'B'),
  player('b9', 'Zane T.',     'B'),
]

export const MOCK_GAMES: GameConfig[] = [
  {
    id: 1,
    name: 'Pool Play — Round 1',
    scheduledTime: '09:00',
    status: 'scheduled',
    teams: { A: BRI, B: EXT },
    rosters: { A: BRI_ROSTER, B: EXT_ROSTER },
    halfTimeAt: 8,
    scoreCapAt: 15,
  },
  {
    id: 2,
    name: 'Pool Play — Round 2',
    scheduledTime: '11:30',
    status: 'in-progress',
    score: { A: 5, B: 4 },
    teams: { A: BRI, B: EXT },
    rosters: { A: BRI_ROSTER, B: EXT_ROSTER },
    halfTimeAt: 8,
    scoreCapAt: 15,
  },
  {
    id: 3,
    name: 'Crossover',
    scheduledTime: '14:00',
    status: 'scheduled',
    teams: { A: BRI, B: EXT },
    rosters: { A: BRI_ROSTER, B: EXT_ROSTER },
    halfTimeAt: 8,
    scoreCapAt: 15,
  },
  {
    id: 4,
    name: 'Semi-Final',
    scheduledTime: '16:30',
    status: 'scheduled',
    teams: { A: BRI, B: EXT },
    rosters: { A: BRI_ROSTER, B: EXT_ROSTER },
    halfTimeAt: 8,
    scoreCapAt: 15,
  },
]
