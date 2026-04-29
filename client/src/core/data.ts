import type { GameConfig, Player, Team } from './types'

function team(id: 'A' | 'B', name: string, short: string, color: string): Team {
  return { id, name, short, color }
}

function player(id: string, name: string, teamId: 'A' | 'B', photoUrl?: string): Player {
  return { id, name, teamId, ...(photoUrl ? { photoUrl } : {}) }
}

const BRI = team('A', 'Brisbanites', 'BRI', '#4a9eff')
const EXT = team('B', 'Extinction',  'EXT', '#ff6640')

const BRI_ROSTER: Player[] = [
  player('a1', 'Sam W',     'A', 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=SamW'),
  player('a2', 'Jordan K',  'A', 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=JordanK'),
  player('a3', 'Mia T',     'A', 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=MiaT'),
  player('a4', 'Lachlan B', 'A', 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=LachlanB'),
  player('a5', 'Priya S',   'A', 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=PriyaS'),
  player('a6', 'Tom H',     'A', 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=TomH'),
  player('a7', 'Evie R',    'A', 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=EvieR'),
  player('a8', 'Kai M',     'A', 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=KaiM'),
  player('a9', 'Dana F',    'A', 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=DanaF'),
]

const EXT_ROSTER: Player[] = [
  player('b1', 'Callum D',  'B', 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=CallumD'),
  player('b2', 'Jess O',    'B', 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=JessO'),
  player('b3', 'Marcus L',  'B', 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=MarcusL'),
  player('b4', 'Tara N',    'B', 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=TaraN'),
  player('b5', 'Flynn M',   'B', 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=FlynnM'),
  player('b6', 'Soph C',    'B', 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=SophC'),
  player('b7', 'Rhys P',    'B', 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=RhysP'),
  player('b8', 'Ava G',     'B', 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=AvaG'),
  player('b9', 'Zane T',    'B', 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=ZaneT'),
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
