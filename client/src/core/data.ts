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
  player('a1', 'Matt Geyer', 'A', 'https://randomuser.me/api/portraits/men/1.jpg'),
  player('a2', 'Kyle Weigand', 'A', 'https://randomuser.me/api/portraits/men/2.jpg'),
  player('a3', 'Brodie Smith', 'A', 'https://randomuser.me/api/portraits/men/3.jpg'),
  player('a4', 'Jimmy Mickle', 'A', 'https://randomuser.me/api/portraits/men/4.jpg'),
  player('a5', 'Ben Jagt', 'A', 'https://randomuser.me/api/portraits/men/5.jpg'),
  player('a6', 'Chase Reznik', 'A', 'https://randomuser.me/api/portraits/men/6.jpg'),
  player('a7', 'David Pfeiffer', 'A', 'https://randomuser.me/api/portraits/men/7.jpg'),
  player('a8', 'Brannon Redmond', 'A', 'https://randomuser.me/api/portraits/men/8.jpg'),
  player('a9', 'Andrew Hull', 'A', 'https://randomuser.me/api/portraits/men/9.jpg'),
]

const BREEZE_ROSTER: Player[] = [
  player('b1', 'Marques Browlee', 'B', 'https://randomuser.me/api/portraits/men/10.jpg'),
  player('b2', 'Patrick Smith', 'B', 'https://randomuser.me/api/portraits/men/11.jpg'),
  player('b3', 'Ashlin Joye', 'B', 'https://randomuser.me/api/portraits/women/1.jpg'),
  player('b4', 'Trey Katzenmeyer', 'B', 'https://randomuser.me/api/portraits/men/12.jpg'),
  player('b5', 'Pio Fernandez', 'B', 'https://randomuser.me/api/portraits/men/13.jpg'),
  player('b6', 'Beau Kittredge', 'B', 'https://randomuser.me/api/portraits/men/14.jpg'),
  player('b7', 'Nolan Thorne', 'B', 'https://randomuser.me/api/portraits/men/15.jpg'),
  player('b8', 'Alex Thorne', 'B', 'https://randomuser.me/api/portraits/men/16.jpg'),
  player('b9', 'Kevin Pyle', 'B', 'https://randomuser.me/api/portraits/men/17.jpg'),
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
