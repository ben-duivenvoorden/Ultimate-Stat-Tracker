# Plan: Append-only logs for teams + scheduled games

## Context

Part 1 of `docs/plans/2026-05-04-slot-canvas-and-team-management.md` (slot canvas + drag-to-swap) is now shipped (commits `2e0b335`, `a953373`). Part 2 — replacing the hardcoded `MOCK_GAMES` / rosters with two append-only logs that mirror the existing `rawLog` pattern — is fully outstanding.

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

`PlayerId` (number) and a new `GlobalTeamId = number` become globally unique across the app. The in-game positional `TeamId = 'A' | 'B'` stays — `GameConfig` records which `GlobalTeamId` is `A` and which is `B`:

```ts
GameConfig {
  id: GameId
  name: string
  scheduledTime: string
  teamAGlobalId: GlobalTeamId      // ← new
  teamBGlobalId: GlobalTeamId      // ← new
  halfTimeAt: number
  scoreCapAt: number
  // teams, rosters: removed; resolved from teamsLog at read time
}
```

A new selector resolves `{ teams, rosters }` for a given `GameConfig` by looking up its A/B GlobalTeamIds in the live teams state. Replaces `resolveSession()`'s `MOCK_GAMES.find(...)` trick in `selectors.ts:11-15`.

### 3. Store wiring (`client/src/core/store.ts`)

Add to state:
- `teamsLog: TeamEvent[]`
- `scheduledGamesLog: ScheduledGameEvent[]`

Add `appendTeamEvents` / `appendScheduledGameEvents` helpers — same shape as the existing `appendEvents` (`store.ts` ~line 100, the helper that monotonic-stamps + appends to `session.rawLog`). Add actions: `addTeam`, `editTeam`, `archiveTeam`, `addPlayer`, `editPlayer`, `removePlayer`, `addScheduledGame`, `editScheduledGame`, `cancelScheduledGame`. All funnel through the new helpers.

Replace `selectGame`'s `MOCK_GAMES.find(g => g.id === gameId)` (`store.ts:128`) with a builder that reads from `deriveScheduledGames(scheduledGamesLog)`.

**Persist version bump 5 → 6**, with a migration that:
- For `fromVersion < 5` — drop session as today.
- For `fromVersion === 5` — keep session, but if `teamsLog` / `scheduledGamesLog` are missing (they will be on first load after upgrade), seed them from the existing `MOCK_GAMES` constant via a new `seedTeamsAndGames()` in `core/data.ts`. The seed produces `team-add` + `player-add` events for both rosters and `game-add` events for the three mock games. Existing persisted sessions keep their `gameConfig.id` reference and resolve through the freshly-seeded log.

### 4. Data seeding (`client/src/core/data.ts`)

Convert today's `MOCK_GAMES`/`EMPIRE_ROSTER`/`BREEZE_ROSTER` into a `seedTeamsAndGames(): { teamEvents: TeamEvent[]; gameEvents: ScheduledGameEvent[] }` function. Same player names, colours, ids — so existing manual testing data is preserved verbatim. `MOCK_GAMES` itself can stay exported for the engine tests in `core/__tests__/engine.test.ts:4,9,19` if convenient; otherwise update those tests to read from a freshly-seeded fixture store.

### 5. Screens

**`client/src/screens/GameSetup/index.tsx`** —
- Source the game list from `deriveScheduledGames(scheduledGamesLog)`.
- Add a `+ New Game` row at the top of the list (selecting it shows the new-game form in the right pane).
- Add a "Manage teams" link in the header that pushes to `screen: 'teams-manager'`.

**`client/src/screens/NewGame/index.tsx`** (NEW) — fields: name, scheduled time, Team A picker, Team B picker, halfTimeAt, scoreCapAt. Pickers are dropdowns of teams from `deriveTeamsState`, each with an `+ Add new team` option that opens an inline create form. Save → `addScheduledGame` action → screen switches to `game-setup` with the new game selected. Rendered inside `GameSetup`'s right pane when the `+ New Game` row is selected — same component, no new screen route.

**`client/src/screens/TeamsManager/index.tsx`** (NEW) — left list (teams + `+ New team`), right detail (team header with rename + colour edit + roster table with inline add/edit/remove). Reuses `Btn`/`Chip`/`Label` primitives; identical layout structure to `GameSetup`.

**`client/src/screens/LineSelection/index.tsx`** —
- Source `rosters` and `teams` from the resolved teamsLog instead of `session.gameConfig.rosters`.
- Append a sticky `+ Add player` row at the bottom of each `TeamColumn` players list. Tap → small inline form (name, gender, optional number) → `addPlayer` action → list refreshes via the selector (the active line picks up the new id immediately because activeLine derives from rawLog).
- Add a "Manage teams" link in the screen header that routes to `teams-manager`.

**`client/src/core/types.ts`** — extend `AppScreen` with `'teams-manager'`. (`new-game` lives inside `'game-setup'` so no new route.) **`client/src/App.tsx`** — add the `'teams-manager'` case to the screen-switch render.

## Files to change

```
client/src/core/types.ts                                     (+GlobalTeamId, GameConfig reshape, AppScreen extend)
client/src/core/store.ts                                     (+teamsLog, +scheduledGamesLog, +9 actions, persist v6 + migration)
client/src/core/data.ts                                      (MOCK_GAMES → seedTeamsAndGames())
client/src/core/teams/{types,engine,actions}.ts              NEW (3 files)
client/src/core/games/{types,engine,actions}.ts              NEW (3 files)
client/src/core/selectors.ts                                 (resolveSession reads from teamsLog instead of MOCK_GAMES)
client/src/core/__tests__/teams-engine.test.ts               NEW (add → edit → archive → remove invariants)
client/src/core/__tests__/games-engine.test.ts               NEW (add → edit → cancel)
client/src/core/__tests__/engine.test.ts                     (update fixture from seed function)
client/src/screens/GameSetup/index.tsx                       (read from log; + New Game; Manage teams link)
client/src/screens/NewGame/index.tsx                         NEW
client/src/screens/TeamsManager/index.tsx                    NEW
client/src/screens/LineSelection/index.tsx                   (read from teamsLog; + Add player inline; Manage teams link)
client/src/App.tsx                                           (route teams-manager)
docs/plans/<YYYY-MM-DD>-teams-and-games-logs.md              NEW (archive this plan as step 0 of implementation)
```

## Verification

1. From `client/`: `npx tsc --noEmit` then `npx vitest run`. Existing engine tests still pass (after updating their fixture); new tests for `deriveTeamsState` and `deriveScheduledGames` cover add → edit → archive/cancel.
2. **Fresh load** (clear localStorage) — app boots with the mock teams + games already present (seeded by the migration). Existing in-progress sessions on a v5 persist payload also work because the migration seeds the logs before resolving the session.
3. **Manual round-trip** —
   - GameSetup → `+ New Game` → fill form (incl. `+ Add team` from inside the picker) → save → row appears in the list and is selected; `Start Recording` works once a roster is built.
   - LineSelection → `+ Add player` inline → player appears immediately and is selectable.
   - TeamsManager → rename team, edit player number, remove player → reflected in GameSetup / LineSelection without reload.
4. **Persistence** — refresh: new game / team / player survive. `localStorage` key `ust-game`, version `6`.
5. **Append-only invariant** — every CRUD action shows up as a new event in `teamsLog` / `scheduledGamesLog`; nothing mutates earlier entries (verified by snapshotting log length before/after each test action).

## Out of scope

- Remote sync of the new logs (shape is sync-ready; `wire.ts` extension is a follow-up).
- Bench/sideline rendering on the canvas.
- Multiple slot-shape presets / formation-aware homes.
- Drag-from-canvas-to-bench substitutions.
