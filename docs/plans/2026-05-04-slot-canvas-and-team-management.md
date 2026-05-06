# Plan: Slot canvas + game/team management

> **Convention note** — This is the first plan filed under `docs/plans/`. Going
> forward, every approved plan is committed here as `<descriptive-slug>.md`
> before any implementation work begins.

## Context

Two pieces of the live-scoring UX are friction:

1. **Player pills drift.** `Stage.tsx` runs an rAF physics loop (centre-spring is off, but pairwise repulsion + bounds clamp + chip push-out actively reposition pills every frame). Names move while you're hunting for them and can corner each other if dragged. We want **stable distribution**: 7 fixed home slots; the only way a pill moves is a deliberate drag-onto-another-pill swap.

2. **Games and rosters are baked-in mock data.** `client/src/core/data.ts` defines `MOCK_GAMES` with two hardcoded rosters; `GameSetup` reads it directly and `LineSelection` is read-only. There is no way to create a game, create/rename a team, or add a player from inside the app. We want both managed via append-only logs (mirroring the existing `rawLog` pattern in `GameSession`) so the same engine + persist + future-sync story applies.

Decisions captured from the conversation:
- Slot shape: distribution-only (not formation) — 4 corners + 1 centred + 2 lower-middle. Corners are inset enough that opening chips on a corner pill doesn't push it off-canvas.
- Empty-space drop ⇒ snap back to home.
- Replace `MOCK_GAMES` end-to-end; seed the new logs at first boot from a small subset of the mock data.
- Team/player CRUD is reachable both inline in LineSelection (quick `+ Add`) and via a dedicated Teams Manager screen (full edit).
- Both new logs share the existing `GameSetup` left-list / right-detail sidebar pattern.

---

## Part 1 — Slot canvas with drag-to-swap

### Approach

Replace the per-frame physics with deterministic slot placement. Player order in the active line determines slot assignment: `players[i]` lives at `SLOT_POSITIONS[i]`. A drag follows the cursor; on release over another pill, swap the two players in the line (via the existing `reorder-line` event); on release elsewhere, do nothing — next render lays both back on their home slots.

### Files to modify

- `client/src/screens/LiveEntry/Canvas/constants.ts` — add `SLOT_POSITIONS: ReadonlyArray<{ x: number; y: number }>` (fractional 0..1, applied as `{ x: f.x * w, y: f.y * h }`). Seven entries:
  ```
  [0] TL corner   ~(0.14, 0.18)
  [1] TR corner   ~(0.86, 0.18)
  [2] centre      ~(0.50, 0.45)
  [3] mid-low L   ~(0.32, 0.68)
  [4] mid-low R   ~(0.68, 0.68)
  [5] BL corner   ~(0.14, 0.86)
  [6] BR corner   ~(0.86, 0.86)
  ```
  Tune so a corner pill's chip rosette (max ~150 px in any direction at md scale, more at lg) still fits within `BOUNDS_MARGIN_*`.
  Keep `PILL_H`, `HH`, `PILL_SCALE_FACTORS`, `TAP_THRESH`, `BOUNDS_MARGIN_*`, `CHIP_H`. Drop / leave-unused: `CENTER_K`, `REPULSE_R`, `REPULSE_K`, `FRICTION`, `MIN_SPEED`, `BUFFER`, `ARROW_REPEL_*`.

- `client/src/screens/LiveEntry/Canvas/physics.ts` — add `slotPositions(bounds, n)` returning `{ x, y }[]` from `SLOT_POSITIONS × bounds`. Keep `computeArrowPath`, `eventXY`, `rectExitDist`, `pillHalfWidth`, `chipWidth`, `pillLabel`, `openZoneRects`. Delete `stepPhysics`, `initialPositions`, `PhysicsStepInput`, `Vec.vx/vy` (collapse `Vec` to `{ x, y }`). `sampleBezier` stays (used elsewhere if anywhere; otherwise drop).

- `client/src/screens/LiveEntry/Canvas/Stage.tsx` —
  - Remove the rAF physics tick. Keep a much smaller rAF (or `useLayoutEffect`-driven update) that:
    - For each `i`: if `i === dragIdx`, write the cursor xy into `posRef.current[i]`; else write `slotPositions(bounds)[i]`.
    - Re-runs the existing arrow-update block (lines 181–203) so `PassArrowLayer` keeps working unchanged.
    - Calls `applyDOM()`.
  - Modify `beginDrag` (line 213): on `onEnd`, if `dragInfo.current.moved`, hit-test the cursor against every other pill's slot rect (centre = `slotPositions[i]`, half-width = `halfWidthsRef.current[i]`, half-height = `HH × scale`). If a hit: dispatch `swapLineSlots(teamId, i, j)` (new store action — see below). If no hit: do nothing.
  - Drop `setOpenIdx(-1)` on `useLayoutEffect` re-init for `N`/`teamId` change (still needed). Remove `halfWidthsRef` reset based on `initialPositions` — replace with the slot lookup.
  - Keep `chipsForPlayer`, `openIdx` auto-open from holder/puller, ineligible handling, tap-vs-drag distinction.

### Engine / store integration (reuses existing primitives)

The `LineReorderRawEvent` type already exists (`types.ts:82`) and is wired through the engine for visual reordering. A swap is exactly `reorder-line` with two indices swapped on the team's current `activeLine`.

- `client/src/core/store.ts` — add `swapLineSlots(teamId: TeamId, i: number, j: number)`. Reads `state.activeLine[teamId]` from `deriveGameState(session)`, swaps the two ids, calls the existing `recordVia` builder to append a single `reorder-line` event (same shape as the existing reorder action, whichever already calls `appendEvents` for `reorder-line` — reuse it; do not duplicate plumbing).

### What still works untouched

- `PlayerNode.tsx`, `ActionChip.tsx`, `layout.ts`, `PassArrowLayer.tsx` — chips are computed from `halfWidthsRef` only and are position-agnostic; arrows read `posRef` which we keep current.
- Tap-to-open chips, tap-on-empty-canvas-cancel, ineligible (low-opacity) styling, pill-size cycling, drawer width offset (centre x).
- Edit-mode / undo-rail / splice-block — operate on the rawLog, untouched.

### Notes

- **No bench rendering on canvas.** Active line = 7 pills; the rest of the roster is managed in `LineSelection`. (Open future: shrunk sideline strip — out of scope here.)
- **Chip explosion still pushes nothing now.** Other pills no longer need to dodge — chips simply render on top. If a corner pill's chips still feel cramped against the canvas edge in practice, tune `SLOT_POSITIONS` inwards rather than re-introducing push-out logic.
- **Ineligible pills** (e.g. receiver-error pick) still render at low opacity at their slot — fine.

---

## Part 2 — Append-only logs for games and teams

### New event-typed logs

Two top-level append-only arrays, modelled on `rawLog`:

**`teamsLog: TeamEvent[]`** — events with monotonic id + timestamp:
- `team-add` `{ teamId, name, short, color }`
- `team-edit` `{ teamId, name?, short?, color? }`
- `team-archive` `{ teamId }` *(soft delete; hidden from pickers)*
- `player-add` `{ playerId, teamId, name, gender, jerseyNumber?, photoUrl? }`
- `player-edit` `{ playerId, name?, gender?, jerseyNumber?, photoUrl? }`
- `player-remove` `{ playerId }`

**`scheduledGamesLog: ScheduledGameEvent[]`**:
- `game-add` `{ gameId, name, scheduledTime, teamAId, teamBId, halfTimeAt, scoreCapAt }`
- `game-edit` `{ gameId, ...partial }`
- `game-cancel` `{ gameId }`

Both reuse the existing `BaseRawEvent`-style frame: `{ id, timestamp }` (no `pointIndex`). They live in their own files; they intentionally do **not** join the `RawEvent` union — they aren't game-history events.

### Identifier model change

Currently `PlayerId` is documented as a per-game surrogate. With cross-game teams, ids become global. Introduce `GlobalTeamId = number` and treat existing `PlayerId` (number) as globally unique. The in-game positional `TeamId = 'A' | 'B'` stays — `GameConfig` now records which `GlobalTeamId` is `A` and which is `B`:

```ts
GameConfig {
  id: GameId
  name: string
  scheduledTime: string
  teamAGlobalId: GlobalTeamId      // ← new
  teamBGlobalId: GlobalTeamId      // ← new
  halfTimeAt: number
  scoreCapAt: number
  // teams: Record<TeamId, Team>   ← removed; resolved from teamsLog
  // rosters: Record<TeamId, Player[]> ← removed; resolved from teamsLog
}
```

A new selector resolves `{ teams, rosters }` for a given `GameConfig` from the live `teamsLog` state — call this at the boundary where `useSession()` is consumed.

### Files to add / modify

- **Add** `client/src/core/teams/types.ts`, `engine.ts`, `actions.ts`. Mirrors the shape of `core/engine.ts` minimally:
  - `deriveTeamsState(teamsLog) → { teams: Map<GlobalTeamId, Team>, players: Map<PlayerId, Player>, rosterByTeam: Map<GlobalTeamId, Player[]> }`
  - Action builders (`addTeam`, `addPlayer`, etc.) that emit the right event and append via a thin `appendTeamEvents` wrapper.
- **Add** `client/src/core/games/types.ts`, `engine.ts`, `actions.ts` likewise:
  - `deriveScheduledGames(scheduledGamesLog) → GameConfig[]` (active, in scheduled order, plus a `cancelled` flag if needed).
- **Modify** `client/src/core/store.ts` —
  - Add top-level keys `teamsLog: TeamEvent[]`, `scheduledGamesLog: ScheduledGameEvent[]`.
  - Add actions: `addTeam`, `editTeam`, `addPlayer`, `editPlayer`, `removePlayer`, `addScheduledGame`, `editScheduledGame`, `cancelScheduledGame`. All go through `appendTeamEvents` / `appendScheduledGameEvents` (new helpers, same monotonic-id pattern as `appendEvents`).
  - Add `selectGameByGameId` etc. that build a `GameSession` from a `GameConfig` resolved against the current teamsLog (replaces `MOCK_GAMES.find(...)`).
  - **Persist version bump** from 5 → 6, with a migration that seeds the two new logs from the existing mock rosters/games (see below).
- **Modify** `client/src/core/types.ts` —
  - Add `GlobalTeamId`, `TeamEvent`, `ScheduledGameEvent` unions and their interfaces.
  - Update `GameConfig` to drop inline `teams` / `rosters` and add `teamAGlobalId` / `teamBGlobalId`.
  - Extend `AppScreen` to include `'teams-manager' | 'new-game'` (or keep new-game as a sub-state of `'game-setup'` — see screens below).
- **Modify** `client/src/core/data.ts` — turn `MOCK_GAMES` / rosters into a one-time seed function (`seedTeamsAndGames(): { teamEvents, gameEvents }`) called by the persist migration when no logs exist. Keep the same player names + colours so existing manual testing data is preserved.
- **Modify** `client/src/screens/GameSetup/index.tsx` —
  - Source the game list from `deriveScheduledGames(scheduledGamesLog)`.
  - Add a `+ New Game` row at the top of the list (selecting it shows the new-game form in the right pane).
  - Add a "Manage teams" link in the header (opens `teams-manager` screen).
- **Add** `client/src/screens/NewGame/index.tsx` — fields: name, scheduled time, Team A picker, Team B picker, halfTimeAt, scoreCapAt. Pickers are dropdowns of teams from `deriveTeamsState`, each with an `+ Add new team` option that opens a small inline create form. Save → `addScheduledGame` → store action also flips `screen` to `game-setup` with the new game selected. (Render this inside `GameSetup`'s right pane when the `+ New Game` list row is selected — same component, no new screen route.)
- **Add** `client/src/screens/TeamsManager/index.tsx` — list pane on left (teams, with `+ New team`), detail pane on right (team header with rename/colour edit + roster table with inline add/edit/remove). Wire to the same `Btn`/`Chip`/`Label` primitives and identical layout structure as `GameSetup`.
- **Modify** `client/src/screens/LineSelection/index.tsx` —
  - Source `rosters` and `teams` from the resolved teamsLog instead of `session.gameConfig.rosters`.
  - Append a sticky `+ Add player` row at the bottom of each `TeamColumn` players list. Tap → small inline form (name, gender, optional number) → `addPlayer` action → list refreshes via the selector.
  - Add a small "Manage teams" link in the screen header that routes to `teams-manager` (preserves the in-progress line selection — selection is local state but the route push is fine since the user can come back; document this clearly so we don't lose work).
- **Modify** `client/src/App.tsx` — add `'teams-manager'` case to the screen-switch render.

### Critical files

```
client/src/core/types.ts                     (extend unions, change GameConfig)
client/src/core/store.ts                     (new logs, new actions, persist v6 + migration)
client/src/core/data.ts                      (seed function from existing mocks)
client/src/core/teams/{types,engine,actions}.ts        NEW
client/src/core/games/{types,engine,actions}.ts        NEW
client/src/screens/GameSetup/index.tsx       (read from log, "+ New Game", "Manage teams")
client/src/screens/NewGame/index.tsx                   NEW (render inside GameSetup right pane)
client/src/screens/TeamsManager/index.tsx              NEW
client/src/screens/LineSelection/index.tsx   (read from teamsLog; inline + Add player)
client/src/App.tsx                           (route 'teams-manager')
client/src/screens/LiveEntry/Canvas/constants.ts       (SLOT_POSITIONS)
client/src/screens/LiveEntry/Canvas/physics.ts         (slotPositions; drop stepPhysics)
client/src/screens/LiveEntry/Canvas/Stage.tsx          (slot-based rAF; drag-to-swap)
```

### Out of scope (note for follow-up)

- Remote sync of either log. The shape is sync-ready (append-only with monotonic ids + timestamps) but no networking now.
- Bench/sideline rendering on the canvas.
- Multiple slot-shape presets / formation-aware homes.
- Drag-from-canvas-to-bench substitutions.

---

## Verification

1. **Type check + tests** — from `client/`: `npx tsc --noEmit`, then `npx vitest run`. Existing engine tests should still pass; add a slim test for `swapLineSlots` emitting the right `reorder-line` event, and one for `deriveTeamsState` covering add → edit → remove.
2. **Slot canvas (manual)** — start dev (`npm run dev` in `client/`), open a game, confirm pills appear at the 7 expected positions (4 corners + centre + two lower). Drag pill A to empty space → snaps back. Drag pill A onto pill B → A and B swap; arrows from a recent pass still terminate on the right pills. Open a corner pill's chips → no other pill moves; chips stay on-canvas.
3. **Game/team management (manual)** —
   - Fresh load (clear localStorage): app boots with the mock teams + games already present (seeded by the migration).
   - GameSetup → `+ New Game` → fill form (including `+ Add team` from inside the picker) → save → new row appears in the list and is selected; `Start Recording` works against an empty roster as long as `+ Add player` is reachable in LineSelection.
   - LineSelection → `+ Add player` inline → player appears immediately in the column and is selectable for the line.
   - TeamsManager → rename a team, edit a player's number, remove a player → changes reflected in GameSetup / LineSelection without a reload.
4. **Persistence** — refresh the page; the new game, the new team, and the new player all survive. `localStorage` key is `ust-game`, version 6.
