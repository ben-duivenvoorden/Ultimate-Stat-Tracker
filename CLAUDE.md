# Ultimate Stat Tracker — Project Instructions

## Stack

- **Frontend**: React 18 + TypeScript (strict) + Vite + Tailwind v4 (`@theme` CSS custom properties)
- **State**: Zustand v5 with `persist` middleware; append-only `rawLog` is the single source of truth
- **Engine**: `deriveGameState(session)` is a pure function — the store holds only `rawLog` + transient UI state
- **Tests**: Vitest

## Source layout

```
client/src/
  core/          types.ts · engine.ts · store.ts · selectors.ts · format.ts · data.ts
  screens/       GameSetup · GameSettings · LineSelection · LiveEntry
  components/ui/ Btn · Chip · Label
```

## Key conventions

- `GamePhase` is derived from the log; `UiMode` is transient store state — never conflate them
- `canRecord(state, eventType)` is the single guard for all recording actions
- New event types need handling in: `types.ts` (union + interface), `engine.ts` (derive + canRecord), `format.ts` (label + color)
- CSS design tokens live in `client/src/index.css` under `@theme`
- After any change: `npx tsc --noEmit` from `client/`, then `npx vitest run`

## Pending changes workflow

Queue feature requests in `docs/_New Changes/New Changes.md`.
Run `/new-changes` to implement them.
