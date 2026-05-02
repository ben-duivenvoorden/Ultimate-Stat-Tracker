# Tap-to-Truncate Event Log + Hoisted Undo + Canvas Tidy-Up

> **Handoff note**: This plan is intended to be executed in a *new* session. The branch `feature/canvas` already contains the canvas migration and a long string of recent UX iterations. The original migration plan that lived in this file has shipped — this document supersedes it.

## Context

Two new features and a focused tidy pass on the LiveEntry / canvas code, all on the existing `feature/canvas` branch.

**Feature 1 — Hoisted Undo button.** Today the Undo button lives inside the LogDrawer's expanded panel, so it's invisible while the drawer is collapsed. Move it to a footer slot beneath the drawer, mirroring the pill-size button beneath AdminDrawer, so it's always one tap away.

**Feature 2 — Tap-to-truncate event log + historical canvas preview.** Tapping an entry in the event log:

- Sets a *truncation cursor* on that entry's id.
- Greys out every entry after the cursor in the log.
- Rewinds the canvas to reflect the game state at that moment (active team, holder, score, line, pass arrows). Pill positions can default — they don't need to be preserved.
- Shows a thin amber strip beneath the header reading `VIEWING HISTORY — record to truncate forward` (matches the pick-mode strip's vocabulary).
- Tap the cursor entry again → cancel preview, return to live.
- Recording any new activity → store appends a new `truncate` raw event (`truncateAfterId: cursor`), then the new event(s); cursor clears; the engine drops the now-truncated entries from both the visible log and state derivation.

**Tidy pass.** Recent additions (canvas migration, brick, distinct colours, pill size, edge bounds, chip connectors, first-possession disable, full team names, glow border, etc.) have left a few seams worth ironing out before adding the truncate feature on top:

- The "footer beneath the panel" pattern is already hand-rolled in `AdminDrawer`. `LogDrawer` is about to need it too. Bake the slot into `Drawer.tsx`.
- `engine.ts`'s `computeVisLog` and `resolveLogForDerivation` duplicate the undo/amend resolution loop. Extract one shared resolver so the new `truncate` case lives in exactly one place.
- Every store recording action follows the same shape (`get → canRecord → build event → appendEvents`). The "flush pending truncate" hook would multiply that boilerplate. Fold it into a single helper.
- `PlayerNode.tsx`'s inline ternary chains for border / background / shadow have piled up across iterations. Pull them into a small `pillVisuals(state)` helper.

Resist scope creep beyond those four cleanups — they all directly support the new feature. Bigger architectural moves (extracting `useStagePhysics`/`useStageDrag` hooks, a `useLiveEntryViewModel`, etc.) are plausible but should defer to a separate PR.

## Decisions (already settled — Q&A)

| # | Decision |
|---|---|
| 1 | Cancel preview = tap the cursor entry again. Tapping any other entry just moves the cursor. |
| 2 | Preview indicator = thin amber strip beneath the header (mirrors pick-mode strip). Disappears on cancel or after recording. |
| 3 | Pill positions during preview default — Stage remounts on team change with fresh `initialPositions`. |
| 4 | Truncate events are structural — they never appear in the visible log. |
| 5 | Tap-to-truncate works across point boundaries (user can rewind across point-start, half-time, etc.). |
| 6 | Undo button retains existing styling (`<Btn variant="ghost" size="sm" full>↩ Undo</Btn>`). |

## Plan

### Step 1 — Engine: shared resolver + `truncate` event

Files:
- `client/src/core/types.ts`
- `client/src/core/engine.ts`
- `client/src/core/__tests__/engine.test.ts`

1. **`types.ts`**: add `'truncate'` to `RawEventType`. Define:
   ```ts
   export interface TruncateRawEvent extends BaseRawEvent {
     type: 'truncate'
     truncateAfterId: EventId
   }
   ```
   Add to the `RawEvent` union. Update `VisLogEntry`'s `Exclude<...>` to also exclude `TruncateRawEvent` (alongside `UndoRawEvent`, `AmendRawEvent`, `LineReorderRawEvent`).

2. **`engine.ts`**: introduce one resolver used by both `computeVisLog` and `resolveLogForDerivation`:
   ```ts
   interface ResolveOpts { keepReorderLine: boolean }
   function resolveRawLog(rawLog: RawEvent[], opts: ResolveOpts): Resolved[] {
     const out: Resolved[] = []
     for (const e of rawLog) {
       if (e.type === 'undo')     { popLastVisible(out); continue }
       if (e.type === 'amend')    { applyAmend(out, e); continue }
       if (e.type === 'truncate') { dropAfter(out, e.truncateAfterId); continue }
       if (e.type === 'reorder-line' && !opts.keepReorderLine) continue
       out.push(e)
     }
     return out
   }
   ```
   Local helpers carry the existing edge cases — `popLastVisible` skips `system` / `point-start` / `half-time` / `end-game` / `reorder-line`; `applyAmend` rejects replacements of type `undo` / `amend` / `reorder-line`. `dropAfter(out, id)` removes every entry from `out` whose `id > truncateAfterId`.

   Then:
   ```ts
   export function computeVisLog(rawLog: RawEvent[]): VisLogEntry[] {
     return resolveRawLog(rawLog, { keepReorderLine: false }) as VisLogEntry[]
   }
   // resolveLogForDerivation is now a one-liner using { keepReorderLine: true }.
   ```

3. **`canRecord`**: add `case 'truncate': return true` (always allowed, like `undo` / `amend` / `system`).

4. **`engine.test.ts`** — new `describe('truncate', ...)`:
   - `computeVisLog` drops entries with `id > truncateAfterId` from a sample log.
   - Events appended *after* the truncate event remain visible.
   - `deriveGameState` over `[E1, E2, E3, truncate(2), E5]` equals direct derivation of `[E1, E2, E5]`.
   - Truncate is itself never present in `computeVisLog` output.
   - Existing undo / amend tests still pass after the resolver refactor (sanity).

### Step 2 — Store: cursor + `recordVia` helper

Files:
- `client/src/core/store.ts`
- `client/src/core/selectors.ts`

1. **`store.ts`** — add to `GameStore`:
   ```ts
   /** Cursor for the tap-to-truncate preview. Transient — never persisted.
    *  null = live mode; otherwise the eventId after which entries are
    *  greyed in the log and the canvas reflects the state at that point. */
   truncateCursor: EventId | null
   setTruncateCursor: (cursor: EventId | null) => void
   ```
   - Initial state: `truncateCursor: null`.
   - Exclude from `partialize` (transient).
   - Clear on `selectGame`, `nextPoint`, `backToGameList` to be safe.

2. Add a single recording helper used by every action that appends events:
   ```ts
   function effectiveSession(session: GameSession, cursor: EventId | null): GameSession {
     return cursor === null
       ? session
       : { ...session, rawLog: session.rawLog.filter(e => e.id <= cursor) }
   }

   /** Common funnel for actions that record events. Reads state at the
    *  truncate cursor (or live), runs the canRecord guard via the builder,
    *  prepends a truncate event when the cursor is set, then appends and
    *  clears the cursor in one set(). */
   function recordVia(
     get: () => GameStore,
     set: (partial: Partial<GameStore>) => void,
     build: (state: DerivedGameState) => RawEventInput[] | null,
   ) {
     const { session, truncateCursor } = get()
     if (!session) return
     const state = deriveGameState(effectiveSession(session, truncateCursor))
     const events = build(state)
     if (!events || events.length === 0) return
     const head: RawEventInput[] = truncateCursor !== null
       ? [{ pointIndex: state.pointIndex, type: 'truncate', truncateAfterId: truncateCursor }]
       : []
     set({
       session: appendEvents(session, [...head, ...events]),
       truncateCursor: null,
     })
   }
   ```
   Each existing recording action becomes a thin wrapper:
   ```ts
   recordPull(bonus = false) {
     const { selPuller } = get()
     if (!selPuller) return
     recordVia(get, set, state => {
       if (!canRecord(state, 'pull')) return null
       const pullingTeam = otherTeam(state.possession)
       return [{ pointIndex: state.pointIndex, type: bonus ? 'pull-bonus' : 'pull', playerId: selPuller, teamId: pullingTeam }]
     })
     // selPuller is cleared here too (preserve existing behaviour).
     set({ selPuller: null })
   },
   ```
   Apply to: `recordPull`, `recordBrick`, the auto-possession branch of `tapPlayer`, `recordThrowAway`, `recordGoal`, `recordStall`, `recordTimeout`, `recordFoul`, `recordPick`, `triggerHalfTime`, `triggerEndGame`, `undo`, `reorderActiveLine`. (Yes — `undo` itself goes through the funnel so an undo while cursor-set produces `[truncate, undo]`. That has a coherent meaning: drop forward, then nudge one more back.)

3. **Pick-mode triggers** (`triggerDefBlock`, `triggerReceiverError`, `triggerInjurySub`) only set `uiMode` — they don't append events. They should also clear `truncateCursor` so entering a pick mode while previewing snaps back to live before the next tap is recorded.

4. **`selectors.ts`** — make `useDerivedState` cursor-aware:
   ```ts
   export function useDerivedState(): DerivedGameState | null {
     const session = useSession()
     const cursor  = useGameStore(s => s.truncateCursor)
     return useMemo(() => {
       if (!session) return null
       return deriveGameState(effectiveSession(session, cursor))
     }, [session, cursor])
   }
   ```
   `useVisLog` stays returning the full log — LogDrawer needs the full log to render greyed entries past the cursor. Add a thin selector `useTruncateCursor()` for the LogDrawer / strip / index.

### Step 3 — `Drawer.tsx`: bake the footer slot in

File: `client/src/screens/LiveEntry/Drawers/Drawer.tsx`.

Add `footer?: ReactNode` to `DrawerProps`. Render it always (visible whether collapsed or expanded), in a flex-column outer wrapper that owns the `width: drawerW` transition AdminDrawer currently hand-rolls:

```tsx
<div className="flex-shrink-0 flex flex-col" style={{ width: drawerW, transition: 'width 220ms ease-in-out' }}>
  <div className="flex-1 flex" style={{ minHeight: 0 }}>
    {/* existing rail + conditional panel */}
  </div>
  {footer}
</div>
```

This consolidates the wrapper.

### Step 4 — Refactor LogDrawer + AdminDrawer onto the footer slot

Files: `client/src/screens/LiveEntry/Drawers/LogDrawer.tsx`, `client/src/screens/LiveEntry/Drawers/AdminDrawer.tsx`.

- **`LogDrawer`**: hoist the existing `<Btn variant="ghost" size="sm" full>↩ Undo</Btn>` out of the children, pass it as the new `footer` prop. Drop the inner `flex-shrink-0 p-1.5 border-top` div that wrapped it. The same `<Btn>` styling is fine; the footer wrapper Drawer now owns provides the border-top + width.
- **`AdminDrawer`**: drop the hand-rolled `<div className="flex-shrink-0 flex flex-col" style={{ width: drawerW, ... }}>` wrapper. Pass `<PillSizeButton size={pillSize} expanded={expanded} onClick={onCyclePillSize} />` as `footer`. The component becomes shorter and the pattern is now uniform.

### Step 5 — LogDrawer: tap-to-truncate interaction

File: `client/src/screens/LiveEntry/Drawers/LogDrawer.tsx`.

- New props: `truncateCursor: EventId | null`, `onSetCursor: (id: EventId | null) => void`.
- Each entry div: `onClick={() => onSetCursor(e.id === truncateCursor ? null : e.id)}` (toggle when tapping the cursor entry; otherwise move the cursor to the tapped entry).
- Style:
  - `e.id > truncateCursor` (cursor set, entry past it): `opacity: 0.4`, `text-decoration: line-through`. Keep border-left + bg so the entry is still recognisable.
  - `e.id === truncateCursor`: thicker (3 px) left border in the entry's existing colour, plus a small `▶` glyph before the formatted text.
  - Add `cursor: pointer` so the tap target is discoverable.
- Auto-scroll behaviour stays as today (`useLayoutEffect` on `[visLog.length, expanded]`). When the user taps an entry, *don't* fight them with scroll-to-bottom — the existing effect only fires on length / expansion changes, which is fine.

### Step 6 — Preview strip + index.tsx wiring

Files: `client/src/screens/LiveEntry/index.tsx`, `client/src/screens/LiveEntry/Header.tsx`.

- Wire `useTruncateCursor()` and the matching setter from `useGameActions()` into `index.tsx`.
- When `truncateCursor !== null`: render a 32 px amber strip beneath `<Header>` with text `VIEWING HISTORY — record to truncate forward`, tap to cancel (calls `setTruncateCursor(null)`). Reuse the styling from `Header.tsx`'s pick-mode strip — extract a tiny shared `<ContextStrip color="warn" onTap={...}>...</ContextStrip>` if it tightens the code, otherwise inline.
- Pass `truncateCursor` + `setTruncateCursor` into `<LogDrawer>`.
- Pre-filter the visLog when deriving anything that should reflect the historical view:
  ```ts
  const effectiveVisLog = useMemo(
    () => (truncateCursor === null ? visLog : visLog.filter(e => e.id <= truncateCursor)),
    [visLog, truncateCursor],
  )
  ```
  Use `effectiveVisLog` for `derivePassArrows` and the first-possession check that builds `disabledChipIds`. The full `visLog` is still what `LogDrawer` receives.
- **Goal-nav guard**: the existing `useEffect` that calls `actions.nextPoint()` on `phase === 'point-over' || phase === 'half-time'` must skip when `truncateCursor !== null` — otherwise previewing the moment of a goal would silently navigate the user out of LiveEntry. Add `&& truncateCursor === null` to the condition.

### Step 7 — Stage: nothing required (verify only)

File: `client/src/screens/LiveEntry/Canvas/Stage.tsx`.

Stage already remounts on `key={activeTeam}`. When the cursor changes activeTeam (cursor lands on a moment when the other team had possession), Stage remounts, `initialPositions` runs, pills land at default positions. That matches the user's intent — pill positions can default during preview.

Cursor changes that don't change activeTeam leave Stage mounted; props update naturally and holder/puller/arrows re-render. Nothing to wire.

### Step 8 — `PlayerNode.tsx` visuals helper (tidy)

File: `client/src/screens/LiveEntry/Canvas/PlayerNode.tsx`.

Extract the pill-state visual mapping into a pure helper at the top of the file:

```ts
interface PillVisuals { bg: string; borderColor: string; borderWidth: number; boxShadow: string }
function pillVisuals(opts: {
  teamColor: string
  isHolder: boolean; isPuller: boolean; isOpen: boolean; dragging: boolean; ineligible: boolean
}): PillVisuals { /* single switch-style block returning the four values */ }
```

The render becomes `const { bg, borderColor, borderWidth, boxShadow } = pillVisuals({ ... })`. Easier to read, easier to test if we ever want to, and removes the risk of one inline ternary chain drifting out of sync with another.

### Step 9 — Tests

Files: `client/src/core/__tests__/engine.test.ts`, optionally a new `client/src/core/__tests__/store.test.ts`.

- **engine.test.ts** — new `describe('truncate', ...)` per Step 1.4.
- **store.test.ts** *(light, optional)*: with cursor set, calling the auto-possession branch of `tapPlayer` results in a session whose tail is `[..., truncate(cursor), possession]` and the cursor is cleared. With cursor null, only `[..., possession]` is appended.

### Step 10 — Verification

From `client/`:
```bash
npx tsc --noEmit
npx vitest run
npx eslint src/screens/LiveEntry/ src/core/
```

Manual walkthrough in the dev server:
1. Record several events. Collapse the right log drawer. Confirm the Undo button is visible beneath the rail. Tap → undoes.
2. Expand the drawer. Undo button is in the same visual place (now beneath the panel). Tap → undoes.
3. Tap a mid-log entry. Canvas state rewinds: header score adjusts, active team / holder / arrows reflect that moment. Entries past the cursor are greyed + struck-through. Amber strip appears beneath the header.
4. Tap the cursor entry again. Strip disappears, canvas snaps back to live. Greyed entries return to normal.
5. With cursor set, tap a teammate on the canvas. New possession recorded; greyed entries vanish from the log; the new event appears as the latest. Cursor clears, strip disappears.
6. Rewind across a point boundary (cursor lands on a `point-start` or pre-pull). Canvas shows the pulling team / no holder. Recording activity from there should commit truncate + new events as expected.
7. Rewind to a goal event. Confirm the goal-nav guard does *not* fire (we should still be on LiveEntry, not LineSelection). Then tap the cursor entry to cancel — only now does the guard reconsider live state, and since the most-recent event is past `point-over`, no nav is triggered.
8. Refresh the browser mid-preview. `truncateCursor` is transient; the page returns to live. Log + canvas reflect the persisted session as before.
9. Trigger a pick mode (tap holder → Block) while a cursor is set. Confirm the cursor clears and the canvas returns to live before the defending team is offered. The pick proceeds normally.
10. Run `npx vitest run` — all tests green, including the new truncate cases.

## Files modified

**Engine + types**
- `client/src/core/types.ts`
- `client/src/core/engine.ts`
- `client/src/core/__tests__/engine.test.ts`
- *(optional new)* `client/src/core/__tests__/store.test.ts`

**Store + selectors**
- `client/src/core/store.ts`
- `client/src/core/selectors.ts`

**Drawer + log**
- `client/src/screens/LiveEntry/Drawers/Drawer.tsx`
- `client/src/screens/LiveEntry/Drawers/LogDrawer.tsx`
- `client/src/screens/LiveEntry/Drawers/AdminDrawer.tsx`

**Live entry + canvas**
- `client/src/screens/LiveEntry/index.tsx`
- `client/src/screens/LiveEntry/Header.tsx` *(if extracting `<ContextStrip>`)*
- `client/src/screens/LiveEntry/Canvas/PlayerNode.tsx`

## Risks / TODOs

1. **Goal-preview navigation lock** — the goal-nav effect must guard on `truncateCursor === null`. Add to the manual checklist; consider a comment in code.
2. **Pick-mode interaction** — `triggerDefBlock` / `triggerReceiverError` / `triggerInjurySub` clear the cursor. Make sure that's wired or the next tap records against stale state.
3. **`canRecord` during preview** — the `recordVia` helper uses *effective* (cursor-filtered) state for `canRecord`, which is what we want. E.g., previewing a moment with no holder, Goal/RE chips are correctly disabled.
4. **Pass-arrow flicker on cursor change** — arrows derive from `effectiveVisLog`; expect a one-frame discrepancy before Stage's rAF reads positions. Sub-frame; revisit only if visible.
5. **Undo while previewing** — produces `[truncate, undo]`. Coherent meaning ("drop forward, then nudge one more"). Add a one-line comment in the store.
6. **Tidy-pass scope discipline** — limit cleanup to the four items listed (Drawer footer slot, engine resolver merge, store `recordVia`, PlayerNode visuals helper). Don't extract `useStagePhysics` / `useLiveEntryViewModel` here; defer to a follow-up if they prove valuable.
7. **Dev server hot-reload** — old persisted sessions in localStorage don't have a `truncateCursor` field; make sure the `migrate` function in `store.ts` doesn't trip when the field is absent (it's transient and not in `partialize`, so this should be a non-issue, but verify).

## Suggested commit shape

Three commits, in this order, each green on `tsc + vitest + eslint`:

1. `refactor(canvas): extract Drawer footer slot, shared resolveRawLog, recordVia helper, pillVisuals` — pure tidy. No behaviour change. Safe to revert independently.
2. `feat(engine): add truncate raw event` — types + engine + tests. No UI yet.
3. `feat(canvas): tap-to-truncate event log + hoisted Undo + history-preview strip` — wires the cursor state, LogDrawer interaction, the amber strip, and the goal-nav guard.
