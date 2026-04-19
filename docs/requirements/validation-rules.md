# Validation Rules
## Ultimate Stat Tracker

**Version:** 0.3 (Phase 0 — Requirements Gathering)
**Last Updated:** 2026-04-19
**Status:** 🟡 In Progress

---

## Purpose

This document defines the sequence validation rules — what actions are valid after each game event. The UI only ever presents valid next actions based on current state, making invalid sequences structurally impossible.

---

## Core Principle

> **Tapping a player name opens a contextual explosion.**
> Centre/dismiss = that player has possession. Left = Receiver Error. Right = Throw Away / Defensive Block / Goal / Pull / Pull Bonus (state-dependent).

---

## Event Types

| Event | Attribution | Notes |
|---|---|---|
| **Pull** | Puller (pulling team) | Only available event at point start for pulling team |
| **Pull Bonus** | Puller (pulling team) | Alternative to Pull — records a long/bonus pull |
| **Pass** | Receiver (tapped) | Explosion centre/dismiss — they now have the disc |
| **Throw Away** | Previous disc holder (auto) | Explosion right — no extra pick; attributed to prior player |
| **Receiver Error** | Tapped player (intended receiver) | Explosion left — no separate pick screen; the tapped player had the error |
| **Defensive Block** | Recorder picks the defender | Explosion right → screen state change — defending team shown for blocker pick |
| **Goal** | Tapped player (auto) | Explosion right — no extra pick; assist chain derived from log |
| **Half Time** | Automatic (system) or manual (Event submenu) | Auto-inserted when score threshold is reached; can also be triggered manually via the Event button |
| **End Game** | Manual (Event submenu) | Recorder-triggered — ends the game session; no score cap enforced by the app |

---

## Game State Machine

```
LINE_SELECTION → PULLING → PULL_RECORDED → PASS_CHAIN → POINT_OVER → LINE_SELECTION
                                                ↓                           ↓
                                    TURNOVER (possession flips)     [if half time score]
                                                ↓                    HALF_TIME (auto or manual)
                                           PASS_CHAIN                       ↓
                                                                     LINE_SELECTION
                                                                           [at any point]
                                                                      FULL_TIME (manual)
                                                                           ↓
                                                                        END_GAME
```

---

## State Transitions

| Current State | Event | Next State | Notes |
|---|---|---|---|
| LINE_SELECTION | Line confirmed | PULLING | App auto-determines pulling team |
| PULLING | Tap puller name | PULL_READY | Puller has possession |
| PULL_READY | Pull / Pull Bonus | PASS_CHAIN | Possession flips to receiving team |
| PASS_CHAIN | Tap player → Pass (explosion centre) | PASS_CHAIN | Receiver now has possession |
| PASS_CHAIN | Tap player → Receiver Error (explosion left) | TURNOVER | Attributed to the tapped player; resolved within explosion — no separate pick screen |
| PASS_CHAIN | Tap player → Throw Away (explosion right) | TURNOVER | Attributed to the previous disc holder |
| PASS_CHAIN | Tap player → Defensive Block (explosion right) | BLOCK_PICK | Screen state change — defending team shown |
| PASS_CHAIN | Tap player → Goal (explosion right) | POINT_OVER | Scorer = tapped player; assist chain derived from log |
| BLOCK_PICK | Tap defender name | PASS_CHAIN | Blocker's team now in possession — blocker may be tapped again as first receiver |
| TURNOVER | — | PASS_CHAIN | Possession flips to other team |
| POINT_OVER | — | LINE_SELECTION | Normal point transition |
| LINE_SELECTION or POINT_OVER | Half Time (Event submenu — suggested at threshold, recorder confirms) | HALF_TIME | Switches ends; possession flips to team that did not start |
| HALF_TIME | — | LINE_SELECTION | Possession flips to team that did not start the game; ends switch |
| LINE_SELECTION or POINT_OVER | End Game (Event submenu) | END_GAME | Ends the game session; export becomes available |
| END_GAME | — | — | Terminal state — session closed |

---

## Key Integrity Rules

1. Only the team in possession is shown in the player zone during PASS_CHAIN
2. Throw Away and Goal are attributed within the player explosion — no separate pick screen
3. Receiver Error is attributed to the player tapped in the explosion — no separate pick screen; Defensive Block triggers a screen state change to pick the blocker from the defending team
4. Pull and Pull Bonus are the only valid events at point start — no other options are shown in the explosion
5. The same player cannot have two consecutive pass entries — a self-catch is not a valid sequence
6. After a Throw Away or Receiver Error, the player zone switches to the opposing team (now in possession) — the other team is hidden during active possession
7. Attacking direction is derived automatically from the event log — never set manually
8. The raw log is append-only and never mutated — amendments and reversals are new entries appended in insertion order. Each amendment entry carries a target position specifying where it sits in the visual log. The visual log is compiled by ordering entries by target position, not insertion order. Sequence validation is applied to the compiled visual log.
9. A Defensive Block records the blocker; that same player may immediately be tapped as first receiver (two sequential log entries — valid)
10. Scorer (Goal), assist, and second assist are all derivable from the pass chain — no explicit entry needed
11. Half Time and End Game are recorder-confirmed via the Event button — the app surfaces a suggestion when the score reaches the configured threshold; the recorder dismisses or confirms. Neither is enforced.
12. At Half Time, possession goes to the team that did NOT start the game (opposite of the first pull)
13. Half time score threshold and score cap are league/tournament-level settings on the server — not set in-app
14. At game start, the recorder specifies which team pulls first — thereafter the pulling team is derived automatically from the event log
15. End Game marks the log as closed — no further entries are permitted after it is confirmed

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
