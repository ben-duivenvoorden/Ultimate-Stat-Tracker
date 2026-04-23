# Core Features
## Ultimate Stat Tracker

**Version:** 0.4
**Last Updated:** 2026-04-23
**Status:** 🟡 In Progress

---

## F1 — Roster & Line Selection

- Games are pre-configured on the server — rosters are preset before the app is opened
- Before each point, the recorder selects which players (up to 7) are on the field for each team
- Typically 4 men and 3 women per side (Parity League format)
- Both teams always have equal player counts
- Player names are **colour-coded by gender** as a visual indicator only — never enforced or blocked
- At game start, the recorder specifies which team pulls first — the only manual pulling team input
- After the first point, the pulling team is derived automatically from the event log
- If fewer than 7 players are selected for a side, a warning is shown — the recorder can still confirm

---

## F2 — Event Entry

The recorder taps player names to build an ordered event log. Each tap triggers a **player explosion** — a contextual menu that appears from the player, showing only the actions valid in the current game state.

**Core principle:** tapping a player opens an explosion; centre/dismiss records a pass (that player now has possession).

### Player Zone
- Shows only the team currently in possession
- Maximum 7 names — always a short, tappable list
- Player identity is displayed as a profile photo in a circle (see F10)

### Player Explosion
The explosion appears on player tap and offers state-dependent options:

**During pass chain:**

| Position | Action | Behaviour |
|---|---|---|
| Centre / dismiss | Pass | This player now has possession |
| Left | Receiver Error | This player was the intended receiver but did not gain possession — turnover attributed to them, possession flips |
| Right | Throw Away | Attributed to the previous disc holder — possession flips |
| Right | Defensive Block | Screen state change — recorder picks blocker from defending team; possession flips |
| Right | Goal | Closes the point — attributed to this player; assist chain derived from log |

**At point start (after puller is tapped):**

| Position | Action | Behaviour |
|---|---|---|
| Right | Pull | Records the pull — possession flips to receiving team |
| Right | Pull Bonus | Records a bonus-distance pull — possession flips |

Pull and Pull Bonus are the only valid options at point start — no pass option is shown.

### Event Button (Special Events)
A persistent **Event** button on screen opens a submenu for rare or game-level events outside the normal pass chain:

| Submenu Item | Behaviour |
|---|---|
| Injury Sub | Opens Line Selection (mid-point) for the affected team |
| Half Time | Manual trigger — switches ends and possession; same behaviour as the automatic half time event. Available as an override for time-based formats or when auto-trigger is not configured. |
| End Game | Marks the end of the game — no further log entries are permitted. Export becomes available. Suggested by the app when the score cap is reached (league/tournament config); recorder confirms. The app does not enforce the score cap — the recorder decides when the game is over. |

### Screen State Changes
**Defensive Block** is the only event that shifts the screen to a distinct visual state — the recorder picks the blocker from the defending team before returning to the pass chain. **Receiver Error** is resolved within the explosion itself (no separate pick screen required).

---

## F3 — Live Event Log

There are two representations of the event log:

- **Raw log:** append-only, never mutated. Every event — including amendments and reversals — is stored in insertion order. This is the authoritative record.
- **Visual log:** derived from the raw log. Reflects the current "truth" after all amendments are applied. This is what the recorder sees on screen.

The visual log is always visible on the Live Event Entry screen. All stats are derived from the visual log.

---

## F4 — Amend / Undo

- The raw log is **never edited** — all corrections are new entries appended to it in insertion order
- Amendment entries carry a **target position** — specifying where in the visual log they should appear. The visual log is compiled by ordering entries according to their target positions, not raw insertion order.
- An **undo** appends a reversal of the last visual log entry; the visual log updates immediately
- An **edit** lets the recorder select one or more visual log entries to remove or reorder; each correction is appended to the raw log with a target position
- A correction is accepted only if the resulting visual sequence is valid — otherwise the entire change is rejected; the recorder must resolve it before exiting edit mode
- The server validates all corrections; invalid sequences are rejected

---

## F5 — Substitutions

- **Between points:** Recorder updates the active line during Line Selection
- **Mid-point (injury only):** Recorder records a substitution event replacing one player in the active line

---

## F6 — Live Session Sharing

- One recorder acts as the active editor at any time — only they can submit events
- Others can join the same session as live viewers — they see the event log update in real time
- The editor role can be handed off to another participant mid-session (switch scorer)
- The editor can leave and rejoin at any time — full state is restored on reconnect
- If the editor disconnects, live viewer screens remain visible but stagnant — no new events appear until the editor reconnects or the role is handed off
- Exact viewer permissions and switch scorer handoff model are TBD
- See [architecture.md](architecture.md) for session model detail

---

## F7 — Half Time

- Half time is triggered automatically when the score reaches the configured threshold
- The app appends a **Half Time** event to the log — not recorder-triggered
- At half time: ends switch and possession goes to the team that did not start the game
- The half time score threshold is a league/tournament-level setting on the server — not set in-app
- The recorder does not need to do anything — the app handles the transition

---

## F8 — Game Time

- The app records the actual wall-clock start time of the game
- No countdown timer, no enforced duration

---

## F9 — Export

- Per-player stats are exportable in-app
- The server always holds the authoritative copy — the app requests it
- Export format: TBD
- Stats are clean and analysis-ready by design — invalid sequences are structurally impossible

---

---

## F10 — Player Profile Photos

Profile photos are critical for usability when the recorder does not know the players — particularly when scoring for both teams (Phase 1 default; see below).

### Display
- Each player is shown as a **circular profile photo** (similar to Microsoft Teams avatars)
- Photos are displayed wherever players are listed: Line Selection, Player Zone, and the player explosion

### Fallback hierarchy
If a photo is unavailable or fails to load, the display degrades gracefully in order:

1. **Jersey number** — displayed inside the circle in place of the photo
2. **Short name** — circle removed; displays the player's configured unique short name. Short name preference order: nickname → first name + surname initial (e.g. "Ben D")

### Pre-game photo capture
- The recorder can take photos of players before the game starts
- This is especially important when scoring both teams (see below), where the recorder may not know either roster

### Scoring both teams
- Phase 1 records stats for **both teams** — this is a confirmed decision, not configurable
- The profile photo system is designed to support this: the recorder must be able to identify all players from both rosters at a glance

### Photo management
- Photos are associated with player records on the server
- Pre-game capture uploads to the server and is immediately available to all session participants
- Photo association (which player a captured photo belongs to) is confirmed by the recorder at capture time

---

## Deferred Features

| Feature | Notes |
|---|---|
| Player stats view | Player filters their own stats from the log — Phase 2+ |
| Jersey numbers | Optional display enhancement — Phase 1 fallback within photo circle (see F10) |
| ABBA gender point tracking | If enabled in settings, the app advises on whether the current point should be a men's or women's ratio point (e.g. 4M/3W vs 3M/4W), following the ABBA alternating pattern. Requires the recorder to confirm the starting gender point at game start. Only applicable when the team has enough players of both genders — advisory only, never enforced. Phase 2+. |
