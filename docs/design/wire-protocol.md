# Wire protocol — sync between scorers / server

**Status:** Designed (types & helpers exist in `client/src/core/wire.ts`).
Network transport (websockets) is not yet wired up.

This document is the contract that the websocket phase will implement.

---

## Two layers

| Layer       | Lives in                       | Sent over the wire? |
|-------------|--------------------------------|---------------------|
| **Raw log** | `session.rawLog`               | Yes — verbatim.     |
| **Display** | `format.ts`, `computeVisLog`   | No — derived.       |

The raw log is **the** source of truth. Names, photo URLs, team colours, and the
visible event log are all derived locally by each peer from
`(manifest, rawLog)`.

## Identifiers

- `PlayerId = number`. **Per-game** surrogate, assigned once when a session is
  created and stable for its lifetime. See `MOCK_GAMES` for the current id
  ranges (Empire 1–13, Breeze 14–26).
- `EventId = number`. Monotonic, **per-game**, assigned by `appendEvents` in
  `engine.ts`. Starts at 1 and never reused.
- `GameId = number`. Stable across sessions of the same game.

## Append-only invariant

The raw log is **only ever appended to**. There are no in-place edits, no
splicing, no re-ordering. Mutations that look destructive (undo, amend) are
themselves *events* in the log:

- `undo` — display-time pop of the most recent visible non-structural entry.
  Engine state is recomputed from the resulting visible log.
- `amend` — references a target event id and supplies a replacement (or `null`
  to delete from the visible log). Original target stays in the raw log.
- `reorder-line` — replaces a team's display order. Surfaces in derivation but
  not in the visible event log.

This is the property that makes sync trivial: a peer with cursor `N` asks the
server for everything after `N` and concatenates.

## Manifest stability

The roster manifest (`SessionManifest`: `gameConfig`, `gameStartPullingTeam`,
`rosters`) is fixed for the session. v1 deliberately does **not** support
mid-game manifest mutations — if a roster needs to grow (rare in ultimate),
end the session and start a new one. (A future `roster-add` event is feasible
but out of scope.)

## Messages

```ts
type WireMessage = RosterManifestMessage | EventStreamMessage

interface RosterManifestMessage {
  kind: 'roster-manifest'
  gameId: GameId
  manifest: SessionManifest
}

interface EventStreamMessage {
  kind: 'events'
  gameId: GameId
  fromEventId: EventId   // exclusive cursor; 0 means "from the start"
  events: RawEvent[]     // ordered ascending by id, contiguous
}
```

## Sync flow

```
Client ──▶ Server : "I want game N"
Server ──▶ Client : RosterManifestMessage { gameId: N, manifest }
Server ──▶ Client : EventStreamMessage   { gameId: N, fromEventId: 0, events: [...] }
…
( client records a new event locally )
Client ──▶ Server : EventStreamMessage   { gameId: N, fromEventId: <head>, events: [<new>] }
Server ──▶ all    : EventStreamMessage   { gameId: N, fromEventId: <head>, events: [<new>] }
```

On reconnect after a drop, the client sends its current `logCursor(rawLog)` as
`fromEventId` and the server replies with everything past that.

## Conflict resolution

v1 is **server-authoritative**. The server assigns the canonical event id
ordering. If two clients submit events nominally tagged with the same source
id, the server reassigns ids in the order it receives them and broadcasts
the rewritten stream. Clients reconcile by replacing any tentative local
events with the server-confirmed sequence.

(Without a server, last-writer-wins by event id is also valid — it just means
the slower client's events get re-stamped onto the end of the log, which is
fine because the engine derives state purely from the resulting sequence.)

## Idempotency

`applyEventStream` in `wire.ts` drops any event whose id ≤ the recipient's
current head. Peers can therefore replay overlapping windows safely (e.g. on
flaky reconnect).

## What stays local

- `screen`, `uiMode`, `selPuller`, `showEventMenu` — transient UI state.
- `recordingOptions` — per-user preferences (toggles, line ratio).
- `isInjurySub` — transient flag during line-selection.

These never go on the wire.

## Open questions (deferred)

- **Roster mutations mid-session** — when do we need them, and what's the
  event shape (`roster-add` / `roster-deactivate`)?
- **Per-event scorer attribution** — covered separately in
  `future-changes.md` ("Incorporate scorer (+validation)").
- **Compression** — JSON is fine for tens-of-events-per-game scale; revisit
  if we ever need binary framing.
- **Auth / session ownership** — the protocol is transport-agnostic; the
  websocket layer will own authn/authz.
