# Screen States
## Ultimate Stat Tracker

**Version:** 0.2
**Last Updated:** 2026-04-19
**Status:** 🟡 In Progress

---

## Overview

| State | Name | Trigger |
|---|---|---|
| 1a | Game Setup — No Game Selected | App opened |
| 1b | Game Setup — Game In Progress | Game selected |
| 2a | Line Selection — Between Points | Point scored / game start |
| 2b | Line Selection — Injury Sub | Mid-point injury |
| 3a | Live Entry — Awaiting Puller | Line confirmed |
| 3b | Live Entry — Puller Selected | Puller name tapped |
| 3c | Live Entry — Pass Chain | Pull / Pull Bonus recorded |
| 3e | Live Entry — Defensive Block Pick | Defensive Block selected from explosion |
| 3f | Live Entry — Point Over | Goal tapped |
| 3g | Live Entry — Half Time | Score threshold reached (auto) or manual via Event button |
| 3h | Live Entry — End Game | End Game confirmed via Event button |

---

## Screen 1 — Game Setup

### 1a — No Game Selected
- **Player zone:** List of pre-configured games available on the server
- **Event buttons:** None
- **Log:** Not visible
- **Transition:** Recorder selects a game → **1b**

### 1b — Game In Progress
- **Player zone:** Game summary — teams, current score, start time
- **Event buttons:** None (or Export if game is over)
- **Log:** Not visible
- **First game start only:** Recorder selects which team pulls first before entering Line Selection
- **Transition:** Recorder taps "Record" / enters game → **2a**

---

## Screen 2 — Line Selection

### 2a — Between Points
- **Player zone:** Full roster for each team — recorder selects up to 7 active players per side
- **Event buttons:** Confirm Line (available once at least one player is selected per side)
- **Warning:** If fewer than 7 players are selected for either side, a warning is shown before confirmation — recorder can still proceed
- **Log:** Not visible
- **Transition:** Line confirmed → **3a**

### 2b — Injury Sub (Mid-Point)
- **Player zone:** Active line for affected team — recorder swaps one player out, one in from bench
- **Event buttons:** Confirm Sub
- **Log:** Not visible
- **Transition:** Sub confirmed → **3c** (returns to pass chain, new player eligible)

---

## Screen 3 — Live Event Entry

### 3a — Awaiting Puller
- **Player zone:** Pulling team's active line
- **Event buttons:** None (recorder must tap a player first)
- **Log:** Visible
- **Prompt:** Recorder taps the puller's name → **3b**

### 3b — Puller Selected
- **Player zone:** Pulling team's active line (puller highlighted)
- **Explosion (puller):** Pull, Pull Bonus — the only valid options; no pass option
- **Event button:** Visible (injury sub submenu)
- **Log:** Visible
- **Transition:**
  - Pull or Pull Bonus selected from explosion → possession flips to receiving team → **3c**

### 3c — Pass Chain
- **Player zone:** Team in possession only
- **Explosion (per player):** Centre=pass, Left=Receiver Error, Right=Throw Away / Defensive Block / Goal
- **Event button:** Visible (injury sub submenu)
- **Log:** Visible
- **Transitions:**
  - Centre / dismiss → pass recorded, player has possession → **3c**
  - Receiver Error → turnover attributed to tapped player (intended receiver who dropped it), possession flips → **3c**
  - Throw Away → turnover attributed to previous disc holder, possession flips → **3c**
  - Defensive Block → **3e**
  - Goal → **3f**

### 3d — ~~Receiver Error Pick~~ *(removed)*
Receiver Error is now resolved within the player explosion. The tapped player is the intended receiver — no separate pick screen required.

### 3e — Defensive Block Pick
- **Player zone:** Defending team (distinct visual state — colour shift or overlay)
- **Explosion:** Disabled — recorder taps a name directly
- **Event button:** Hidden (not valid during pick)
- **Log:** Visible
- **Prompt:** Recorder taps the blocker → block recorded, possession flips to blocking team → **3c**
- **Note:** Blocker may immediately be tapped again as first receiver — two sequential log entries, both valid

### 3f — Point Over
- **Player zone:** None (or dimmed)
- **Event buttons:** None
- **Log:** Visible — final state of completed point
- **Display:** Score updated, brief confirmation of goal scorer
- **Transition:**
  - Score < half time threshold → auto or tap → **2a**
  - Score = half time threshold → system auto-inserts Half Time event → **3g**

### 3g — Half Time
- **Player zone:** None (or dimmed)
- **Event button:** Hidden
- **Log:** Visible — Half Time entry appended (automatically or via Event submenu)
- **Display:** Half time indicator, current score, ends switched notice
- **Note:** Possession for second half goes to the team that did not start the game — derived automatically. If score threshold is reached, the app suggests Half Time via the Event button — recorder confirms; not enforced.
- **Transition:** Auto or tap → **2a** (Line Selection for second half)

### 3h — End Game
- **Player zone:** None
- **Event button:** Hidden
- **Log:** Visible — End Game entry appended; log is now closed (no further entries permitted)
- **Display:** Final score, game closed notice, export prompt
- **Note:** Triggered by recorder confirming End Game from the Event submenu. The app suggests this when the score cap is reached (league/tournament config) — not enforced. The recorder decides when the game is over; the log reflects what actually happened.
- **Transition:** Terminal — session closed; export available

---

## Open Questions

- [ ] Does 3f (Point Over) require a deliberate tap to proceed, or does it auto-advance to Line Selection?
- [ ] Is Line Selection (Screen 2) a separate screen or an overlay on Screen 3?
- [ ] Can the recorder access the amend/edit flow from the log in any state, or only in specific states?
- [ ] What does the visual state change look like for 3d and 3e — colour, overlay, label change?
