# Screen States
## Ultimate Stat Tracker

**Version:** 0.1
**Last Updated:** 2026-04-18
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
| 3d | Live Entry — Receiver Error Pick | Receiver Error tapped |
| 3e | Live Entry — Defensive Block Pick | Defensive Block tapped |
| 3f | Live Entry — Point Over | Goal tapped |

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
- **Transition:** Recorder taps "Record" / enters game → **2a**

---

## Screen 2 — Line Selection

### 2a — Between Points
- **Player zone:** Full roster for each team — recorder selects up to 7 active players per side
- **Event buttons:** Confirm Line (once both sides selected)
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
- **Event buttons:** Pull, Pull Bonus
- **Log:** Visible
- **Transition:**
  - Pull or Pull Bonus tapped → possession flips to receiving team → **3c**

### 3c — Pass Chain
- **Player zone:** Team in possession only
- **Event buttons:** Throw Away, Receiver Error, Defensive Block, Goal
- **Log:** Visible
- **Transitions:**
  - Tap a player name → pass recorded, same player zone refreshed → **3c**
  - Throw Away → turnover attributed to last player with disc, possession flips → **3c**
  - Receiver Error → **3d**
  - Defensive Block → **3e**
  - Goal → **3f**

### 3d — Receiver Error Pick
- **Player zone:** Team in possession (distinct visual state — colour shift or overlay)
- **Event buttons:** None (waiting for player pick)
- **Log:** Visible
- **Prompt:** Recorder taps the player who dropped it → turnover recorded, possession flips → **3c**

### 3e — Defensive Block Pick
- **Player zone:** Defending team (distinct visual state — colour shift or overlay)
- **Event buttons:** None (waiting for player pick)
- **Log:** Visible
- **Prompt:** Recorder taps the blocker → block recorded, possession flips to blocking team → **3c**
- **Note:** Blocker may immediately be tapped again as first receiver — two sequential log entries, both valid

### 3f — Point Over
- **Player zone:** None (or dimmed)
- **Event buttons:** None
- **Log:** Visible — final state of completed point
- **Display:** Score updated, brief confirmation of goal scorer
- **Transition:** Auto or tap → **2a** (Line Selection for next point)

---

## Open Questions

- [ ] Does 3f (Point Over) require a deliberate tap to proceed, or does it auto-advance to Line Selection?
- [ ] Is Line Selection (Screen 2) a separate screen or an overlay on Screen 3?
- [ ] Can the recorder access the amend/edit flow from the log in any state, or only in specific states?
- [ ] What does the visual state change look like for 3d and 3e — colour, overlay, label change?
