# Product Requirements Document
## Ultimate Stat Tracker

**Version:** 0.3 (Phase 0 — Requirements Gathering)
**Last Updated:** 2026-04-17
**Status:** 🟡 In Progress

---

## 1. Product Overview

Ultimate Stat Tracker is a sideline stat recording app for Ultimate Frisbee games. It is designed to be fast, simple, and usable by anyone — regardless of age or technical ability. The app enforces validated, sequential stat entry to guarantee data integrity for downstream analysis.

The primary use case is **Parity League** — a format where per-player stats are recorded each game so that General Managers (team captains) can trade players between teams under a salary cap, fantasy-league style. Stat integrity is therefore critical: clean per-player data directly drives league decisions.

---

## 2. Problem Statement

Existing Ultimate Frisbee stat apps are either too complex for casual sideline use, require too much manual input, or do not enforce valid event sequences — leading to dirty data. There is no app that combines simplicity, roster integration, and validated input in a single product built for a league management context.

---

## 3. Goals

- Enable anyone on the sideline to record stats quickly and accurately
- Enforce sequential validation — only offer the user actions that are legal given the current game state
- Support roster management via a backend server
- Export clean, analysis-ready per-player data
- Built using Google Stitch for UI rendering
- Real-time multi-user stat recording via WebSockets

---

## 4. Non-Goals

- Enforcing score caps (the app records score, it does not stop the game)
- In-app analytics or visualisation (export only)
- Native mobile app (Stitch web-first)
- Tournament / season context
- Spirit score *(noted for future consideration — deferred)*
- Social sharing

---

## 5. Users

| User | Description |
|---|---|
| **Sideline Recorder** | Records stats live during a game. Any age or skill level. Must not be a player currently on the field. Needs a fast, guided, low-error interface. |
| **Team Admin** | Manages rosters and team setup via the backend. Not a primary app user. |

---

## 6. Confirmed Decisions

- **Game time:** Record actual game start time (wall clock) — not a countdown or enforced timer
- **Session persistence:** A game has one persistent WebSocket session. Any recorder can leave and rejoin at any time, reconnecting to the same live session with full current state and event log intact
- **Live session sharing:** One active editor per session; others can join as live viewers; editor role can be handed off mid-session (switch scorer) — exact model TBD
- **Score cap / half time threshold:** Not enforced by the app — both are league/tournament-level settings configured on the server. The app suggests Half Time and End Game to the recorder when the score is reached; the recorder confirms.
- **End Game:** Recorder-triggered via the Event button — marks the point at which no more log entries should be made. The log represents what actually happened; End Game does not alter it.
- **Gender indicator:** Player names are colour-coded by gender as a visual indicator only — never enforced or blocked
- **Platform:** Web app, native app, or both — TBD. Landscape orientation preferred for sideline use.
- **Event model:** Tapping a player opens a contextual explosion — centre/dismiss records a pass; left = Receiver Error; right = Throw Away / Defensive Block / Goal / Pull / Pull Bonus (state-dependent)
- **Stats tracked:** Pass chain (receivers), Pull / Pull Bonus, Throw Away, Receiver Error, Defensive Block, Goal — fouls and timeouts not recorded
- **Rosters:** Pre-configured on the server — not entered in-app
- **Pulling team:** Derived from the event log after the first point. At game start, the recorder specifies which team pulls first — this is the only manual input for pulling team.
- **Player stats view:** Deferred to Phase 2+

---

## 7. Open Questions

- [ ] What specific per-player stats are needed for Parity League GM decisions?
- [ ] Do we track both teams' stats or just one?
- [ ] What is the exact export format required?
- [ ] What is the roster size range (min/max players per team)?
- [ ] How is multi-user conflict handled if two recorders submit simultaneously?
- [ ] Is there a league admin role above team admins for seeding rosters/teams?

---

## 8. Related Documents

| Document | Description |
|---|---|
| [architecture.md](architecture.md) | Server design, WebSocket protocol, event log model |
| [sport-context.md](sport-context.md) | Ultimate Frisbee rules relevant to stat keeping |
| [features.md](features.md) | Core feature definitions |
| [screens.md](../design/screens.md) | Screen list and field orientation logic |
| [validation-rules.md](validation-rules.md) | Sequence validation rules and integrity constraints |
| [user-stories.md](user-stories.md) | User stories by role |

