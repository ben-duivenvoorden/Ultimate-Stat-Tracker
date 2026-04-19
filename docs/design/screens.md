# Screens & Field Orientation
## Ultimate Stat Tracker

**Version:** 0.3
**Last Updated:** 2026-04-19
**Status:** 🟡 In Progress

---

## Device & Orientation

- **Platform:** Web app, native app, or both — TBD
- **Orientation:** Landscape preferred — maps naturally to the left/right field orientation; not locked
- Designed for a phone held on the sideline; tablet use also viable

---

## Screen List

| # | Screen | Purpose |
|---|---|---|
| 1 | Game Setup | Select a pre-configured game; shows game summary (score, start time) once in progress |
| 2 | Line Selection | Pick active players per team (up to 7 per side); manage substitutions between points |
| 3 | Live Event Entry | Core screen — player zone + persistent event buttons + live event log |

> Export can be triggered in-app. The server always holds the authoritative copy — the app requests it, like a client in a chat architecture.

---

## Screen 3 — Live Event Entry Detail

The screen has two zones (exact layout TBD in Stitch):

### Player Zone
- Displays only the team currently **in possession**
- Each player shown as a tappable name button (baseline); jersey number and photo are future enhancements
- Up to 7 names — always a short list

### Player Explosion (Contextual Interaction)

Tapping a player name **explodes** a contextual menu from that player rather than recording a pass immediately. The explosion offers actions that are valid given the current game state:

**During pass chain:**
- **Centre / dismiss** — records a simple pass; this player now has possession
- **Left** — Receiver Error (this player was the intended receiver but did not gain possession)
- **Right** — Throw Away (attributed to the previous disc holder), Defensive Block (opens defender pick from opposing team), Goal (closes the point; attributed to this player)

**At point start (after puller is tapped):**
- **Right only** — Pull, Pull Bonus (the only valid actions; no pass option)

The explosion makes invalid actions structurally absent — only valid options appear.

### Event Button (Special Events)
A persistent **Event** button is always visible on screen. It opens a submenu for rare or game-level events that are not part of the normal pass chain:

| Submenu Item | When suggested | Behaviour |
|---|---|---|
| Injury Sub | Any time during a point | Opens Line Selection (2b) for the affected team mid-point |
| Half Time | Suggested at half time score threshold | Switches ends; possession goes to team that did not start; same as automatic Half Time. Not enforced — recorder confirms. |
| End Game | Suggested at full time score threshold | Ends the game session; export becomes available. Not enforced — recorder confirms. |

The app surfaces a suggestion prompt when the score reaches a configured threshold for Half Time or End Game — the recorder chooses to confirm or dismiss. Threshold method is TBD.

### Screen State Changes
When **Defensive Block** is selected from the explosion, the screen shifts to a distinct visual state (e.g. colour change) to signal the recorder is picking the blocker from the defending team — not continuing the pass chain. Returns to normal pass mode after the blocker is picked. **Receiver Error** is resolved within the explosion itself (the tapped player is the one who had the error).

### Live Event Log
- Always visible on this screen — shows the **visual log** (derived from the raw log after all amendments)
- Recorder can glance to verify last entry

**Undo button:** Permanently visible on screen. Appends a reversal of the last visual log entry to the raw log. The visual log updates immediately.

**Edit mode:** Recorder enters edit mode from the log. They can select visual log entries to remove or reorder — corrections are appended to the raw log as amendment entries. The recorder must exit edit mode with a valid visual sequence or all changes are rejected.

---

## Field Orientation Logic

The screen represents the field left-to-right at all times.

```
[ Left End Zone ]  ←————— field —————→  [ Right End Zone ]
  Team A attacking                         Team B defending
```

- The team **currently attacking left → right** is always shown on the left
- After each point: attacking direction flips — teams swap sides on screen
- At half time: direction flips once more
- The app derives attacking direction automatically from the event log — the recorder never sets it manually
- This drives: which team's names appear in the player zone, which end zone is "scoring", and the visual layout

---

## Open Questions

- [ ] Screen designs / wireframes (Phase 3 — Stitch prompts)
- See [screen-states.md](screen-states.md) for full state breakdown
- [ ] Does Line Selection happen on a dedicated screen or inline within Event Entry?
- [ ] Exact layout of the two zones (player zone top vs bottom, log placement)
- [ ] Visual design of screen state changes (colour shift, overlay, or other)
- [ ] How is the live event log displayed — full scroll, last N entries, collapsible?
- [ ] How is the editing/amend experience surfaced from the log?
