# Core Features
## Ultimate Stat Tracker

**Version:** 0.2
**Last Updated:** 2026-04-18
**Status:** 🟡 In Progress

---

## F1 — Roster & Line Selection

- Games are pre-configured on the server — rosters are preset before the app is opened
- Before each point, the recorder selects which players (up to 7) are on the field for each team
- Typically 4 men and 3 women per side (Parity League format)
- Both teams always have equal player counts
- Player names are **colour-coded by gender** as a visual indicator only — never enforced or blocked
- The pulling team is derived automatically — the recorder does not select it

---

## F2 — Event Entry

The recorder taps player names and persistent event buttons to build an ordered event log.

**Core principle:** tapping a player name = that player has possession.

### Player Zone
- Shows only the team currently in possession
- Each tap records a pass to that receiver
- Maximum 7 names — always a short, tappable list
- Names are the baseline; jersey numbers and profile pictures are future enhancements

### Event Buttons
Visible only when valid for the current game state. Interrupt the pass chain when tapped.

| Button | Behaviour |
|---|---|
| **Pull / Pull Bonus** | Only available at point start — recorder taps puller name first, then this button |
| **Throw Away** | Attributed automatically to last player with disc — no extra pick |
| **Receiver Error** | Screen state change — recorder picks the intended receiver from possession team |
| **Defensive Block** | Screen state change — recorder picks the blocker from defending team; possession flips |
| **Goal** | Closes the point — attributed automatically to last player with disc; assist chain derived from log |

### Screen State Changes
Receiver Error and Defensive Block shift the screen to a distinct visual state (colour change or overlay) so the recorder knows they are picking a turnover player, not continuing the pass chain.

---

## F3 — Live Event Log

- The full event log is always visible on the Live Event Entry screen
- The recorder can verify the last few entries at a glance
- The log is the single source of truth — all stats are derived from it
- Editing experience is a known unknown — deferred to UX design phase

---

## F4 — Amend / Undo

- A recorder can correct a prior entry at any time during the game
- An amendment is **appended** to the event log — it does not mutate or delete history
- An amendment is only accepted if the resulting event sequence remains valid
- Invalid amendments are rejected by the server

---

## F5 — Substitutions

- **Between points:** Recorder updates the active line during Line Selection
- **Mid-point (injury only):** Recorder records a substitution event replacing one player in the active line

---

## F6 — Multi-User Real-Time Recording

- Multiple recorders can connect to the same game session simultaneously
- All connected clients receive state updates via WebSocket in real time
- A recorder can leave and rejoin at any time — full state is restored on reconnect
- See [architecture.md](architecture.md) for session model detail

---

## F7 — Game Time

- The app records the actual wall-clock start time of the game
- No countdown timer, no enforced duration

---

## F8 — Export

- Per-player stats are exportable in-app
- The server always holds the authoritative copy — the app requests it
- Export format: TBD
- Stats are clean and analysis-ready by design — invalid sequences are structurally impossible

---

## Deferred Features

| Feature | Notes |
|---|---|
| Player stats view | Player filters their own stats from the log — Phase 2+ |
| Jersey numbers | Optional display enhancement on player name buttons |
| Profile pictures | Optional display enhancement on player name buttons |
