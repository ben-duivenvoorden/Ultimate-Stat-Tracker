import type { GameConfig, Player, Team } from './types'

function team(id: 'A' | 'B', name: string, short: string, color: string): Team {
  return { id, name, short, color }
}

function player(id: string, name: string, teamId: 'A' | 'B', photoUrl?: string): Player {
  return { id, name, teamId, ...(photoUrl ? { photoUrl } : {}) }
}

const EMPIRE = team('A', 'Sacramento Empire', 'EMP', '#4a9eff')
const BREEZE = team('B', 'DC Breeze', 'DCB', '#ff6640')

const EMPIRE_ROSTER: Player[] = [
  player('a1', 'Matt Geyer', 'A', 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=MattGeyer'),
  player('a2', 'Kyle Weigand', 'A', 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=KyleWeigand'),
  player('a3', 'Brodie Smith', 'A', 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=BrodieSmith'),
  player('a4', 'Jimmy Mickle', 'A', 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=JimmyMickle'),
  player('a5', 'Ben Jagt', 'A', 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=BenJagt'),
  player('a6', 'Chase Reznik', 'A', 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=ChaseReznik'),
  player('a7', 'David Pfeiffer', 'A', 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=DavidPfeiffer'),
  player('a8', 'Brannon Redmond', 'A', 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=BrannonRedmond'),
  player('a9', 'Andrew Hull', 'A', 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=AndrewHull'),
]

const BREEZE_ROSTER: Player[] = [
  player('b1', 'Marques Browlee', 'B', 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=MarquesBrowlee'),
  player('b2', 'Patrick Smith', 'B', 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=PatrickSmith'),
  player('b3', 'Ashlin Joye', 'B', 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=AshlinJoye'),
  player('b4', 'Trey Katzenmeyer', 'B', 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=TreyKatzenmeyer'),
  player('b5', 'Pio Fernandez', 'B', 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=PioFernandez'),
  player('b6', 'Beau Kittredge', 'B', 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=BeauKittredge'),
  player('b7', 'Nolan Thorne', 'B', 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=NolanThorne'),
  player('b8', 'Alex Thorne', 'B', 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=AlexThorne'),
  player('b9', 'Kevin Pyle', 'B', 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=KevinPyle'),
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
