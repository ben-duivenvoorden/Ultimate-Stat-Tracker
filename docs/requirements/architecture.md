# Architecture
## Ultimate Stat Tracker

**Version:** 0.3
**Last Updated:** 2026-04-17
**Status:** 🟡 In Progress

---

## Protocol Decision

**WebSockets only. All communication is uniform.**

Every interaction — setup, roster loading, live events, amendments, export — is a WebSocket message. One protocol, one connection, consistent pattern throughout.

```
┌─────────────────────┐                       ┌──────────────────────┐
│  Stitch App (UI)    │  WebSocket (all comms) │  Server              │
│                     │ ←───────────────────→  │  - Roster store      │
│  UI only            │                        │  - Event log         │
│                     │                        │  - Game state        │
└─────────────────────┘                        │  - Export            │
                                               └──────────────────────┘
```

---

## WebSocket Message Types

| Direction | Message | Description |
|---|---|---|
| Client → Server | `JOIN_GAME` | Connect to a game session by game ID |
| Client → Server | `REQUEST_ROSTERS` | Fetch both team rosters |
| Client → Server | `GAME_EVENT` | Record a stat event |
| Client → Server | `AMEND_EVENT` | Correct a prior event |
| Client → Server | `REQUEST_EXPORT` | Request final stats export |
| Server → Client | `GAME_STATE` | Full current state (sent on join/rejoin) |
| Server → Client | `ROSTERS` | Both team rosters |
| Server → Client | `EVENT_ACCEPTED` | Event appended to log, new state broadcast |
| Server → Client | `EVENT_REJECTED` | Event invalid, reason included |
| Server → Client | `EXPORT_DATA` | Final per-player stats payload |

---

## Event Log Design

- Every action is an **append-only entry** in the event log
- Amendments are **new entries** that reference and supersede a prior entry — nothing is deleted or mutated
- An amendment is only valid if the corrected sequence remains logically valid
- The event log is the single source of truth — all game state is derived from it
- Full audit history is preserved by design

---

## Session Model

- One persistent game session per game, identified by a game ID
- Any recorder can connect or reconnect at any time using the game ID
- On `JOIN_GAME`, the server sends full current `GAME_STATE` to the new client
- All clients receive all subsequent events in real time

---

## Open Questions

- [ ] How is multi-user write conflict handled? (two recorders submit simultaneously)
- [ ] What is the authentication/access model for joining a game session?
- [ ] What server technology? (Node, Python, Go — TBD)
