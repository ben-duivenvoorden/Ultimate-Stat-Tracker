# Plan: distribute exploding chips into available space + shorten defence labels

## Context

When a holder/puller pill is opened, action chips "explode" out of the pill at fixed offsets relative to the pill centre — `Rec` to the left, `Goal` below, the `TW → [St] → Blk → Int` arc fanning top → right. The same offsets are used regardless of where the pill sits on the canvas (`client/src/screens/LiveEntry/Canvas/layout.ts:81-109`, `physics.ts:155-157` for slot positions).

Result: for the four corner slots (`SLOT_POSITIONS[0,1,5,6]` in `Canvas/constants.ts:46-53`) the rosette pushes chips off the canvas — `Receiver Error` clips the left edge for left-side slots, `Intercepted by Defence` clips the right edge for right-side slots, `Throwaway` clips the top for top-row slots, `Goal` is borderline at the bottom.

The user wants chips distributed adaptively into each pill's *available* space rather than at its hard-coded angles, with no chip rect overlapping any pill rect (own pill or teammates'). Two long labels ("Blocked by Defence", "Intercepted by Defence") also waste horizontal room — replacing the word "Defence" with "…" recovers ~5 characters per chip.

## Approach

### 1. Adaptive chip placement (`Canvas/layout.ts` + `Canvas/Stage.tsx` + `Canvas/physics.ts`)

Switch from a fixed-angle rosette to a per-pill placement that orients into the canvas interior, then validates against canvas bounds and other pills.

**a. Pass placement context into `buildActions`.**
Currently `buildActions(HW, opts)` is angle-only. Extend to:
```ts
buildActions(HW, opts, placement)
// placement: {
//   pill:     { x, y },         // canvas px
//   bounds:   { w, h },         // canvas px (soft inset by BOUNDS_MARGIN_X/Y)
//   others:   Rect[]            // other pills' slot rects
// }
```
`Stage.tsx` (in `chipsForPlayer`) already knows pill index, halfWidth, bounds, and can derive the others' rects from `slotPositions(bounds)` + `halfWidthsRef`.

**b. Per-pill orientation = "open hemisphere".**
Compute an *open direction* `θ₀` for the pill that points into the canvas:

```
dx = clamp(W/2 - pill.x, -1, 1)  // sign only
dy = clamp(H/2 - pill.y, -1, 1)
θ₀ = atan2(dy, dx)
```

For corner slots `θ₀` lands on a diagonal (e.g. slot 0 → +π/4, slot 1 → +3π/4). For the centre slot the components are ~0 and we keep the legacy rosette.

Distribute the chip set across a **180° arc centred on θ₀** for corner/edge slots, and the legacy 360° layout for the centre slot. Chip ordering preserves muscle memory:

```
in-play (5 chips, no stall)         along arc, evenly spaced over 180°:
  rec  ─  tw  ─  goal/centre  ─  blk  ─  int           (CCW from θ₀-90°)
in-play (6 chips, stall on)
  rec  ─  tw  ─  st  ─  goal  ─  blk  ─  int
awaiting-pull
  brick ─ pull ─ pull-bonus      (over 180°; or legacy 3-axis when only 2 chips)
```

The semantic meaning of each chip is preserved (Rec is still the "first turnover", Goal still the "score") — only the positions adapt. Connector lines and `align` are already derived from each chip's anchor angle in `rayAnchor()` (`layout.ts:45-65`), so they pick up the new positions automatically.

**c. Validate + repair pass.**
After computing the rosette, run a single repair pass on each chip rect (using the existing `openZoneRects` builder in `physics.ts:115-150`, currently dead-code-but-tested):

For each chip, compute its rect at the proposed anchor and check:
- inside `[BOUNDS_MARGIN_X, w-BOUNDS_MARGIN_X] × [BOUNDS_MARGIN_Y, h-BOUNDS_MARGIN_Y]`
- no intersection with any *other* pill's slot rect (using `halfWidthsRef[i]` × `scaledHalfHeight`)
- no intersection with previously-accepted chips of this rosette

If a chip fails, walk a small angular sweep (`±10°` steps up to `±60°`) around its preferred angle and accept the first fit. Falling all the way through means we keep the preferred angle (no clean fit possible at this canvas size — extremely unlikely with the 180° base layout but documented as the failure mode).

**d. Recompute on bounds change.**
The chip set is currently rebuilt every render via `chipsForPlayer`; no rAF state is needed. The repair pass runs in the same call so resize re-runs it for free.

### 2. Shorten defence labels (`Canvas/layout.ts`)

Update `CHIP_LABELS` only — the on-canvas chip text:
```diff
- blk:  'Blocked by Defence',
- int:  'Intercepted by Defence',
+ blk:  'Blocked by …',
+ int:  'Intercepted by …',
```

(Use the single ellipsis character `…` so visual width stays predictable.) Other "Defence" strings — the event-log copy in `core/format.ts`, the pick-mode display names in `core/pickModes.ts:32,40`, the type comments in `core/types.ts:166-167`, and the "Who is on Defence?" subtitle in `screens/GameSetup/index.tsx:119` — stay as-is unless the user opts in to broader replacement (asked separately).

## Files to change

- `client/src/screens/LiveEntry/Canvas/layout.ts` — new placement signature, 180°-arc layout, ellipsis labels.
- `client/src/screens/LiveEntry/Canvas/Stage.tsx` — pass `pill`, `bounds`, and others' rects into `buildActions` from `chipsForPlayer`.
- `client/src/screens/LiveEntry/Canvas/physics.ts` — small helper to test rect-vs-rect overlap; existing `openZoneRects` reused.
- `client/src/screens/LiveEntry/__tests__/layout.test.ts` — replace the fixed-angle assertions with the new invariants (chips inside bounds, no overlap with other pills, rosette spans ≤180° for corner slots, ≤360° for centre).
- `docs/plans/<slug>.md` — copy this plan as step 0 of implementation per `feedback_plan_archival.md`.

## Verification

1. `cd client && npx tsc --noEmit` — types still clean after the new placement signature.
2. `cd client && npx vitest run` — updated `layout.test.ts` and untouched `physics.test.ts` pass.
3. Manual smoke test: open the dev server, set the line to 7 players, open each slot in turn (in-play and awaiting-pull), confirm:
   - no chip clips the canvas edge at the smallest mobile-portrait viewport (e.g. 360 × 640 inside `useStageSize`),
   - no chip rect overlaps another pill's slot rect,
   - chip muscle memory still feels coherent (Rec near "first turnover" position relative to TW).
