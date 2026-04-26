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

## Wireframe Prompts (Phase 3 — AI Input)

> Paste any sub-section below directly into Google Stitch or Claude Design.
> Each sub-section is self-contained — prepend the **App Context** block each time.
> Start with Screen 3; it is the core interaction surface.

---

### App Context (prepend to every prompt)

This is a real-time Ultimate Frisbee stat-tracking app called Ultimate Stat Tracker. A single person (the recorder) uses it on the sideline during a live game, holding a phone in landscape orientation. Speed and tap accuracy under distraction are the primary UX constraints — the UI must be large, clear, and unambiguous.

The app has three screens used in sequence:
1. **Game Setup** — select a pre-configured game from a server list
2. **Line Selection** — pick up to 7 active players per team before each point
3. **Live Event Entry** — record every pass, turnover, block, and goal in real time

The screen always represents the field left-to-right. The team currently attacking (moving left → right) is always shown on the left side of the screen. After each point the attacking direction flips automatically — the app derives this from the event log; the recorder never sets it manually.

The app is designed for landscape orientation on a phone. Tablet use is also viable. All interactions are taps — no swipe gestures.

---

### Screen 3 — Live Event Entry

All Screen 3 states share this base layout unless a state description below says otherwise:

- **Two-zone landscape layout.** The player zone occupies roughly two-thirds of the screen; the live event log occupies the remaining third (exact split TBD).
- **Player zone:** Up to 7 tappable name buttons showing only the team currently in possession. Names are large enough to tap accurately while standing.
- **Persistent Event button:** Always visible (except states 3e, 3f, 3g, 3h). Opens a submenu for Injury Sub, Half Time, and End Game.
- **Persistent Undo button:** Always visible. Reverses the last log entry.
- **Live event log:** Always visible. Shows the most recent entries for the current point; recorder can glance to verify.
- **Field direction cue:** A subtle label or arrow pair (e.g. "← Defending | Attacking →") to orient the recorder.

#### 3a — Awaiting Puller

Generate a low-fidelity wireframe for a landscape phone screen. This is the Live Event Entry screen of the Ultimate Stat Tracker app, in state 3a — Awaiting Puller.

The pulling team's 7 player name buttons fill the player zone. No player is selected and no contextual menu is open. The recorder's only valid action is to tap a player name to designate the puller — there are no other action buttons in the player zone. The Event button and Undo button are visible. The event log is visible but empty or shows entries from the previous point. A subtle field direction label is shown.

#### 3b — Puller Selected

Generate a low-fidelity wireframe for a landscape phone screen. This is the Live Event Entry screen of the Ultimate Stat Tracker app, in state 3b — Puller Selected.

One player name in the player zone is highlighted or visually selected. An explosion (contextual action menu) appears attached to that player with exactly two options: **Pull** and **Pull Bonus**. No pass or other options appear — these are the only valid actions at this moment. Other player names are dimmed but still visible. The Event button and Undo button are visible. The event log is visible.

#### 3c — Pass Chain

Generate a low-fidelity wireframe for a landscape phone screen. This is the Live Event Entry screen of the Ultimate Stat Tracker app, in state 3c — Pass Chain (normal possession mode).

The possessing team's 7 player name buttons fill the player zone. No player is selected yet. Show a second version of this screen where one player has been tapped and an explosion is open, offering three directional options: **Centre** (simple pass / dismiss), **Left** (Receiver Error), and **Right** (which expands to Throw Away, Defensive Block, Goal). The explosion should make invalid actions absent — only these options appear. The Event button and Undo button are visible. The event log shows the pull entry and any prior passes.

#### 3e — Defensive Block Pick

Generate a low-fidelity wireframe for a landscape phone screen. This is the Live Event Entry screen of the Ultimate Stat Tracker app, in state 3e — Defensive Block Pick.

This is a visually distinct mode from the normal pass chain — the UI must make it unmistakably clear that the recorder is now picking the blocker from the defending team, not continuing a pass. Use a strong visual signal: a contrasting background colour in the player zone, a prominent overlay banner reading something like "Who made the block?" or "Pick Blocker", or a modal-style treatment. The player zone now shows the defending team's 7 names (possession has not yet flipped). Tapping a name directly records the block — there is no explosion menu. The Event button is hidden. The Undo button and event log are visible.

#### 3f — Point Over

Generate a low-fidelity wireframe for a landscape phone screen. This is the Live Event Entry screen of the Ultimate Stat Tracker app, in state 3f — Point Over.

The player zone is empty or dimmed — no names are shown. The current score is displayed prominently (e.g. "Team A 5 — Team B 4"). A brief confirmation of the goal scorer is shown (e.g. "Goal: Player Name"). The event log shows the complete point sequence including the Goal entry. A "Next Point" button or auto-advance cue is visible. The Event button and Undo button are not relevant here.

#### 3g — Half Time

Generate a low-fidelity wireframe for a landscape phone screen. This is the Live Event Entry screen of the Ultimate Stat Tracker app, in state 3g — Half Time.

The player zone is empty or dimmed. A "Half Time" banner is prominently displayed. The current score is shown. An ends-switched notice is shown — indicating which team now attacks which direction in the second half. The event log shows the Half Time entry appended. A button or auto-advance cue leads to Line Selection for the second half. No Event button.

#### 3h — End Game

Generate a low-fidelity wireframe for a landscape phone screen. This is the Live Event Entry screen of the Ultimate Stat Tracker app, in state 3h — End Game.

The player zone is empty. The final score is displayed prominently. The event log is shown as closed or read-only — no further entries are possible. An **Export** button is the primary call to action. No Event button, no Undo button. A "Game Over" or "Session Closed" label is visible.

---

### Screen 2 — Line Selection

#### 2a — Between Points

Generate a low-fidelity wireframe for a landscape phone screen. This is the Line Selection screen of the Ultimate Stat Tracker app, in state 2a — Between Points.

Both teams' full rosters are displayed — two columns or two panels side by side, one per team. The recorder taps names to select up to 7 active players per team. Selected names are highlighted. A **Confirm Line** button becomes active once at least one player is selected per side. If fewer than 7 players are selected for either team, a warning badge or message appears near the Confirm button (recorder can still proceed). The event log is not visible on this screen.

#### 2b — Injury Sub (mid-point)

Generate a low-fidelity wireframe for a landscape phone screen. This is the Line Selection screen of the Ultimate Stat Tracker app, in state 2b — Injury Sub (mid-point).

Only the affected team's current active line is shown (7 players). One player is swapped out (shown as departing or greyed) and one player from the bench is selected to come in. A **Confirm Sub** button is visible. A context label makes clear this is a mid-point substitution, not a full line reset. The other team's lineup is not shown. The event log is not visible.

---

### Screen 1 — Game Setup

#### 1a — No Game Selected

Generate a low-fidelity wireframe for a landscape phone screen. This is the Game Setup screen of the Ultimate Stat Tracker app, in state 1a — No Game Selected.

A list of pre-configured game names is shown (fetched from a server). The recorder taps a game to select it. No player names, no event log, no score — just the list. A simple header or title identifies this as the game selection view.

#### 1b — Game In Progress

Generate a low-fidelity wireframe for a landscape phone screen. This is the Game Setup screen of the Ultimate Stat Tracker app, in state 1b — Game In Progress.

A summary card for the selected game is shown: team names, current score, and start time. A prominent **Record** or **Continue** button leads into Live Event Entry. If the game is already finished, an **Export** button is shown instead of (or alongside) the Record button. No event log is visible here.

---

## Open Questions

- See [screen-states.md](screen-states.md) for full state breakdown
- [ ] Does Line Selection happen on a dedicated screen or inline within Event Entry?
- [ ] Exact layout of the two zones (player zone top vs bottom, log placement)
- [ ] Visual design of screen state changes (colour shift, overlay, or other)
- [ ] How is the live event log displayed — full scroll, last N entries, collapsible?
- [ ] How is the editing/amend experience surfaced from the log?
