// ─── Seed data ────────────────────────────────────────────────────────────────
// On first boot (and on migrations from a v5 persist payload missing the new
// logs), `seedTeamsAndGames()` produces the team-add / player-add events for
// the two demo rosters plus the game-add events for the three demo games.
// Engine tests also build their fixture sessions from this seed.

import type { GameConfig, Player, Team } from './types'
import type { TeamEvent, TeamEventInput } from './teams/types'
import type { ScheduledGameEvent, ScheduledGameEventInput } from './games/types'
import { addPlayer, addTeam } from './teams/actions'
import { addScheduledGame } from './games/actions'

// ─── Reusable team/player builders ────────────────────────────────────────────

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

// Global identifiers reserved for the seeded teams. Picked far above any
// likely user-added id so the first user-created team can simply use
// `Math.max(...existing) + 1` without colliding.
const EMPIRE_GID = 1
const BREEZE_GID = 2

const EMPIRE = team('A', 'New York Empire', 'NYE', '#1f4788')
const BREEZE = team('B', 'DC Breeze', 'DCB', '#ff6640')

const portrait = (g: 'men' | 'women', n: number) => `https://randomuser.me/api/portraits/${g}/${n}.jpg`

// PlayerIds are surrogate integers, globally unique. The first 13 belong to
// Empire (the seeded GlobalTeamId 1), the next 13 to Breeze (GlobalTeamId 2).
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

// ─── Seed function ────────────────────────────────────────────────────────────

interface SeedResult {
  teamEvents: TeamEvent[]
  gameEvents: ScheduledGameEvent[]
}

let timestampCursor = 0
function stampTeam(events: TeamEventInput[]): TeamEvent[] {
  // Stamp deterministic ids/timestamps starting at 1 — matches the production
  // appender shape but doesn't depend on Date.now() (so seed output stays
  // stable across test runs).
  return events.map((e, i) => ({ ...e, id: i + 1, timestamp: timestampCursor }) as TeamEvent)
}
function stampGame(events: ScheduledGameEventInput[]): ScheduledGameEvent[] {
  return events.map((e, i) => ({ ...e, id: i + 1, timestamp: timestampCursor }) as ScheduledGameEvent)
}

/** Produce the team-add/player-add/game-add events that materialise the demo
 *  state. Pure — safe to call from store init, migrations, and tests. */
export function seedTeamsAndGames(): SeedResult {
  const teamInputs: TeamEventInput[] = []

  teamInputs.push(addTeam(EMPIRE_GID, EMPIRE.name, EMPIRE.short, EMPIRE.color))
  for (const p of EMPIRE_ROSTER) {
    teamInputs.push(addPlayer(
      p.id, EMPIRE_GID, p.name, p.gender,
      {
        ...(p.jerseyNumber !== undefined ? { jerseyNumber: p.jerseyNumber } : {}),
        ...(p.photoUrl     !== undefined ? { photoUrl:     p.photoUrl     } : {}),
      },
    ))
  }
  teamInputs.push(addTeam(BREEZE_GID, BREEZE.name, BREEZE.short, BREEZE.color))
  for (const p of BREEZE_ROSTER) {
    teamInputs.push(addPlayer(
      p.id, BREEZE_GID, p.name, p.gender,
      {
        ...(p.jerseyNumber !== undefined ? { jerseyNumber: p.jerseyNumber } : {}),
        ...(p.photoUrl     !== undefined ? { photoUrl:     p.photoUrl     } : {}),
      },
    ))
  }

  const gameInputs: ScheduledGameEventInput[] = [
    addScheduledGame({
      gameId: 1, name: 'Empire vs Breeze', scheduledTime: '09:00',
      teamAGlobalId: EMPIRE_GID, teamBGlobalId: BREEZE_GID,
      halfTimeAt: 8, scoreCapAt: 15,
    }),
    addScheduledGame({
      gameId: 2, name: 'AUDL Summer Series', scheduledTime: '11:30',
      teamAGlobalId: EMPIRE_GID, teamBGlobalId: BREEZE_GID,
      halfTimeAt: 8, scoreCapAt: 15,
    }),
    addScheduledGame({
      gameId: 4, name: 'Championship', scheduledTime: '16:30',
      teamAGlobalId: EMPIRE_GID, teamBGlobalId: BREEZE_GID,
      halfTimeAt: 8, scoreCapAt: 15,
    }),
  ]

  return {
    teamEvents: stampTeam(teamInputs),
    gameEvents: stampGame(gameInputs),
  }
}

// ─── Compatibility export ─────────────────────────────────────────────────────
// `MOCK_GAMES` is still re-exported because the existing `engine.test.ts`
// fixtures read rosters directly off it. The runtime app no longer consults
// it — everything flows through the seeded teamsLog / scheduledGamesLog.

export const MOCK_GAMES: GameConfig[] = [
  {
    id: 1, name: 'Empire vs Breeze', scheduledTime: '09:00',
    teamAGlobalId: EMPIRE_GID, teamBGlobalId: BREEZE_GID,
    teams: { A: EMPIRE, B: BREEZE },
    rosters: { A: EMPIRE_ROSTER, B: BREEZE_ROSTER },
    halfTimeAt: 8, scoreCapAt: 15,
  },
  {
    id: 2, name: 'AUDL Summer Series', scheduledTime: '11:30',
    teamAGlobalId: EMPIRE_GID, teamBGlobalId: BREEZE_GID,
    teams: { A: EMPIRE, B: BREEZE },
    rosters: { A: EMPIRE_ROSTER, B: BREEZE_ROSTER },
    halfTimeAt: 8, scoreCapAt: 15,
  },
  {
    id: 4, name: 'Championship', scheduledTime: '16:30',
    teamAGlobalId: EMPIRE_GID, teamBGlobalId: BREEZE_GID,
    teams: { A: EMPIRE, B: BREEZE },
    rosters: { A: EMPIRE_ROSTER, B: BREEZE_ROSTER },
    halfTimeAt: 8, scoreCapAt: 15,
  },
]
