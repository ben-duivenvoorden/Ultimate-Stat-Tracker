# Plan: Append-only logs for teams + scheduled games

> Archived 2026-05-11 as step 0 of implementation. This is Part 2 of
> `docs/plans/2026-05-04-slot-canvas-and-team-management.md` — Part 1 (slot
> canvas + drag-to-swap) shipped in `2e0b335` / `a953373`.

## Context

Today the entire game/team list is baked-in mock data:
- `client/src/core/data.ts:59` — `MOCK_GAMES: GameConfig[]` with two hardcoded rosters
- `client/src/core/store.ts:31,128` — `selectGame` reads `MOCK_GAMES.find(...)` directly
- `client/src/core/selectors.ts:5,14` — `resolveSession()` "refreshes" the persisted gameConfig from `MOCK_GAMES` on every read so roster edits would propagate (but there's no UI to make those edits)
- `client/src/screens/GameSetup/index.tsx` — read-only list driven by `MOCK_GAMES`
- `client/src/screens/LineSelection/index.tsx` — read-only roster

There's no way to create a game, create or rename a team, or add a player from inside the app. We want both managed via append-only logs (mirroring the `rawLog` + `appendEvents` pattern in `core/store.ts`) so the same engine + persist + future-sync story applies. `client/src/core/wire.ts` already speaks "append-only log slice" over the wire for `rawLog`; teams/games sync is left out-of-scope but the shape stays sync-ready.

## Approach

Stay close to the existing `rawLog` shape so engineers reading one log can read the others. Each new log is its own append-only event array with monotonic ids + timestamps. The two logs do **not** join the existing `RawEvent` union — they aren't game-history events.

### 1. Event types and engine modules

**`client/src/core/teams/types.ts`** — `TeamEvent` union:
- `team-add` `{ teamId, name, short, color }`
- `team-edit` `{ teamId, name?, short?, color? }`
- `team-archive` `{ teamId }` (soft delete; hidden from pickers, kept for historical games)
- `player-add` `{ playerId, teamId, name, gender, jerseyNumber?, photoUrl? }`
- `player-edit` `{ playerId, name?, gender?, jerseyNumber?, photoUrl? }`
- `player-remove` `{ playerId }` (soft remove, same reasoning as team-archive)

Each carries `{ id: number, timestamp: number }` like `BaseRawEvent` (no `pointIndex` — these aren't game-scoped).

**`client/src/core/teams/engine.ts`** — `deriveTeamsState(teamsLog) → { teams, players, rosterByTeam }`. Pure walk over events; archived teams / removed players are filtered from the *active* maps but stay materialised in a `byId` lookup so existing games can still resolve their old rosters by id.

**`client/src/core/teams/actions.ts`** — `addTeam`, `editTeam`, `archiveTeam`, `addPlayer`, `editPlayer`, `removePlayer`. Action builders that emit the right event and return it; the store wraps them in an `appendTeamEvents` helper that mirrors `appendEvents` in `store.ts` (monotonic id + `Date.now()` timestamp).

**`client/src/core/games/types.ts`** — `ScheduledGameEvent` union:
- `game-add` `{ gameId, name, scheduledTime, teamAGlobalId, teamBGlobalId, halfTimeAt, scoreCapAt }`
- `game-edit` `{ gameId, ...partial }`
- `game-cancel` `{ gameId }` (soft cancel)

**`client/src/core/games/engine.ts`** — `deriveScheduledGames(scheduledGamesLog) → ScheduledGame[]` in scheduled order, with a `cancelled` flag.

### 2. Identifier model

`PlayerId` (number) and a new `GlobalTeamId = number` become globally unique across the app. The in-game positional `TeamId = 'A' | 'B'` stays — `GameConfig` records which `GlobalTeamId` is `A` and which is `B`. A new selector resolves `{ teams, rosters }` for a given `GameConfig` by looking up its A/B GlobalTeamIds in the live teams state.

### 3. Store wiring (`client/src/core/store.ts`)

Add to state: `teamsLog: TeamEvent[]`, `scheduledGamesLog: ScheduledGameEvent[]`. Add `appendTeamEvents` / `appendScheduledGameEvents` helpers — same shape as the existing `appendEvents`. Add actions: `addTeam`, `editTeam`, `archiveTeam`, `addPlayer`, `editPlayer`, `removePlayer`, `addScheduledGame`, `editScheduledGame`, `cancelScheduledGame`. Replace `selectGame`'s `MOCK_GAMES.find` lookup with one against `deriveScheduledGames`.

**Persist version bump 5 → 6** with a migration that seeds `teamsLog` / `scheduledGamesLog` from the existing `MOCK_GAMES` data so existing sessions keep working.

### 4. Data seeding (`client/src/core/data.ts`)

Convert today's `MOCK_GAMES` / `EMPIRE_ROSTER` / `BREEZE_ROSTER` into a `seedTeamsAndGames(): { teamEvents: TeamEvent[]; gameEvents: ScheduledGameEvent[] }` function. Same player names, colours, ids verbatim.

### 5. Screens

- **GameSetup** — source from `deriveScheduledGames`; `+ New Game` row; Manage teams link.
- **NewGame** (NEW, rendered inside `GameSetup`'s right pane) — name, scheduled time, Team A/B pickers (with inline `+ Add new team`), halfTimeAt, scoreCapAt.
- **TeamsManager** (NEW, screen) — left list + right detail with rename/colour/roster add-edit-remove.
- **LineSelection** — read rosters from teamsLog; sticky `+ Add player` per team.
- **types.ts AppScreen** + **App.tsx** add `'teams-manager'` case.

## Verification

1. `npx tsc --noEmit` then `npx vitest run`.
2. Fresh load (clear localStorage) — app boots seeded.
3. Manual round-trip — `+ New Game`, `+ Add team`, `+ Add player`, rename, edit, remove all reflect across screens without reload.
4. Persist — refresh: new entities survive. `localStorage` key `ust-game`, version `6`.
5. Append-only invariant — every CRUD action appends a new event; nothing mutates.

## Out of scope

- Remote sync of the new logs (shape is sync-ready; `wire.ts` extension is a follow-up).
- Bench/sideline rendering on the canvas.
