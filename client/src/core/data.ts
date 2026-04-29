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
  player('a1', 'Matt Geyer', 'A', 'https://ui-avatars.com/api/name=MG&background=4a9eff&color=fff&bold=true&size=128'),
  player('a2', 'Kyle Weigand', 'A', 'https://ui-avatars.com/api/name=KW/background=4a9eff/color=fff&bold=true&size=128'),
  player('a3', 'Brodie Smith', 'A', 'https://ui-avatars.com/api/name=BS/background=4a9eff/color=fff&bold=true&size=128'),
  player('a4', 'Jimmy Mickle', 'A', 'https://ui-avatars.com/api/name=JM/background=4a9eff/color=fff&bold=true&size=128'),
  player('a5', 'Ben Jagt', 'A', 'https://ui-avatars.com/api/name=BJ/background=4a9eff/color=fff&bold=true&size=128'),
  player('a6', 'Chase Reznik', 'A', 'https://ui-avatars.com/api/name=CR/background=4a9eff/color=fff&bold=true&size=128'),
  player('a7', 'David Pfeiffer', 'A', 'https://ui-avatars.com/api/name=DP/background=4a9eff/color=fff&bold=true&size=128'),
  player('a8', 'Brannon Redmond', 'A', 'https://ui-avatars.com/api/name=BR/background=4a9eff/color=fff&bold=true&size=128'),
  player('a9', 'Andrew Hull', 'A', 'https://ui-avatars.com/api/name=AH/background=4a9eff/color=fff&bold=true&size=128'),
]

const BREEZE_ROSTER: Player[] = [
  player('b1', 'Marques Browlee', 'B', 'https://ui-avatars.com/api/name=MB/background=ff6640/color=fff&bold=true&size=128'),
  player('b2', 'Patrick Smith', 'B', 'https://ui-avatars.com/api/name=PS/background=ff6640/color=fff&bold=true&size=128'),
  player('b3', 'Ashlin Joye', 'B', 'https://ui-avatars.com/api/name=AJ/background=ff6640/color=fff&bold=true&size=128'),
  player('b4', 'Trey Katzenmeyer', 'B', 'https://ui-avatars.com/api/name=TK/background=ff6640/color=fff&bold=true&size=128'),
  player('b5', 'Pio Fernandez', 'B', 'https://ui-avatars.com/api/name=PF/background=ff6640/color=fff&bold=true&size=128'),
  player('b6', 'Beau Kittredge', 'B', 'https://ui-avatars.com/api/name=BK/background=ff6640/color=fff&bold=true&size=128'),
  player('b7', 'Nolan Thorne', 'B', 'https://ui-avatars.com/api/name=NT/background=ff6640/color=fff&bold=true&size=128'),
  player('b8', 'Alex Thorne', 'B', 'https://ui-avatars.com/api/name=AT/background=ff6640/color=fff&bold=true&size=128'),
  player('b9', 'Kevin Pyle', 'B', 'https://ui-avatars.com/api/name=KP/background=ff6640/color=fff&bold=true&size=128'),
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
