# Validation Rules
## Ultimate Stat Tracker

**Version:** 0.2 (Phase 0 — Requirements Gathering)
**Last Updated:** 2026-04-18
**Status:** 🟡 In Progress

---

## Purpose

This document defines the sequence validation rules — what actions are valid after each game event. The UI only ever presents valid next actions based on current state, making invalid sequences structurally impossible.

---

## Core Principle

> **Tapping a player name = that player has possession of the disc.**
> Persistent event buttons interrupt and contextualise the pass chain.

---

## Event Types

| Event | Attribution | Notes |
|---|---|---|
| **Pull** | Puller (pulling team) | Only available event at point start for pulling team |
| **Pull Bonus** | Puller (pulling team) | Alternative to Pull — records a long/bonus pull |
| **Pass** | Receiver | Tap a player name — they now have the disc |
| **Throw Away** | Last player with disc (auto) | No extra pick required |
| **Receiver Error** | Recorder picks the intended receiver | Screen state change — possession team shown |
| **Defensive Block** | Recorder picks the defender | Screen state change — defending team shown |
| **Goal** | Last player with disc (auto) | No extra pick required |
| **Half Time** | Automatic (system) | Inserted into log when score threshold is reached; not recorder-triggered |

---

## Game State Machine

```
LINE_SELECTION → PULLING → PULL_RECORDED → PASS_CHAIN → POINT_OVER → LINE_SELECTION
                                                ↓                           ↓
                                    TURNOVER (possession flips)     [if half time score]
                                                ↓                    HALF_TIME (auto event)
                                           PASS_CHAIN                       ↓
                                                                     LINE_SELECTION
```

---

## State Transitions

| Current State | Event | Next State | Notes |
|---|---|---|---|
| LINE_SELECTION | Line confirmed | PULLING | App auto-determines pulling team |
| PULLING | Tap puller name | PULL_READY | Puller has possession |
| PULL_READY | Pull / Pull Bonus | PASS_CHAIN | Possession flips to receiving team |
| PASS_CHAIN | Tap receiver name | PASS_CHAIN | Receiver now has possession |
| PASS_CHAIN | Throw Away | TURNOVER | Attributed to last receiver |
| PASS_CHAIN | Receiver Error | RECEIVER_ERROR_PICK | Screen state change — pick the intended receiver |
| RECEIVER_ERROR_PICK | Tap player name | TURNOVER | Attributed to picked player |
| PASS_CHAIN | Defensive Block | BLOCK_PICK | Screen state change — defending team shown |
| BLOCK_PICK | Tap defender name | PASS_CHAIN | Blocker's team now in possession — blocker may be tapped again as first receiver |
| PASS_CHAIN | Goal | POINT_OVER | Scorer = last receiver; assist/second assist derived from chain |
| TURNOVER | — | PASS_CHAIN | Possession flips to other team |
| POINT_OVER | Score < half time threshold | LINE_SELECTION | Normal point transition |
| POINT_OVER | Score = half time threshold | HALF_TIME (auto) | System inserts Half Time event into log |
| HALF_TIME | — | LINE_SELECTION | Possession flips to team that did not start the game; ends switch |

---

## Key Integrity Rules

1. Only the team in possession is shown in the player zone during PASS_CHAIN
2. Throw Away and Goal are attributed automatically — no extra player pick
3. Receiver Error and Defensive Block trigger a screen state change before player pick
4. Pull and Pull Bonus are the only available events at point start
5. The pulling team is derived automatically from the previous point result
6. Attacking direction is derived automatically from the event log — never set manually
7. All events are append-only to the log — amendments are new entries referencing prior ones
8. A Defensive Block records the blocker; that same player may immediately be tapped as first receiver (two sequential log entries — valid)
9. Scorer (Goal), assist, and second assist are all derivable from the pass chain — no explicit entry needed
10. Half Time is triggered automatically when the score reaches the configured threshold — it is never manually entered
11. At Half Time, possession goes to the team that did NOT start the game (opposite of the first pull)
12. The half time score threshold is a league/tournament-level setting configured on the server — not set in-app

---

## Substitutions

- **Between points:** Recorder updates the active line during LINE_SELECTION
- **Mid-point (injury only):** Recorder records a substitution event — replaces one player with another in the active line; the new player is eligible from that point forward

---

## Open Questions

- [ ] What is the exact bonus distance threshold for Pull Bonus?
- [ ] What is the name for Pull Bonus in league context?
- [ ] How granular is the Receiver Error pick — does the recorder confirm possession flip explicitly?
- [ ] Do we track stall as a Throw Away subtype (description field) or silently?
- [ ] Mixed division gender ratio — does the app enforce legal ratio on line selection?
- [ ] Is the half time score threshold always the same for all games in a league, or can it vary per game?
- [ ] How are mid-point injury substitutions recorded in the log format?
