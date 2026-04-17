# Screens & Field Orientation
## Ultimate Stat Tracker

**Version:** 0.2
**Last Updated:** 2026-04-18
**Status:** 🟡 In Progress

---

## Device & Orientation

- **Primary:** Android phone, landscape
- **Secondary:** iPhone, landscape
- Landscape is preferred — maps naturally to the left/right field orientation
- Orientation is a design flexibility — not locked

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
- Tapping a name = that player has possession (records a pass receiver)
- Up to 7 names — always a short list

### Event Buttons
Visible only when valid for the current game state.

| Button | When visible | Behaviour |
|---|---|---|
| Pull | Point start (puller tapped, awaiting event) | Records the pull — possession flips to receiving team |
| Pull Bonus | Point start (puller tapped, awaiting event) | Records a bonus-distance pull — possession flips |
| Throw Away | During pass chain | Auto-attributes to last player with disc; possession flips |
| Receiver Error | During pass chain | Screen state change — pick intended receiver; possession flips |
| Defensive Block | During pass chain | Screen state change — pick blocker from defending team; possession flips |
| Goal | During pass chain | Closes point — auto-attributes to last player with disc; assist chain derived from log |

### Screen State Changes
When **Receiver Error** or **Defensive Block** is tapped, the screen shifts to a distinct visual state (e.g. colour change) to signal the recorder is attributing a turnover — not continuing the pass chain. Returns to normal pass mode after the player is picked.

### Live Event Log
- Always visible on this screen
- Shows the ordered sequence of events for the current point / recent history
- Recorder can glance to verify last entry
- Editing experience: TBD

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
