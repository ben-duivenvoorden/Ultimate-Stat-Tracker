# Game States

Complete reference for all possible game phases in Ultimate Stat Tracker.

## States

### pre-game
**Description:** Initial state before the game begins.

**Conditions:**
- No events have been recorded
- Line selection for the first point has not been confirmed
- rawLog is empty

**Available actions:**
- Confirm starting line via line-selection screen

**Transitions:**
- → awaiting-pull (when first line is confirmed)

**UI behavior:**
- Shows game setup and line selection screens
- Live entry screen not available

---

### awaiting-pull
**Description:** A point has started and the pulling team is ready to pull.

**Conditions:**
- `point-start` event has been recorded for current point
- `pull` or `pull-bonus` event has not been recorded
- Pull phase (disc not yet in play)

**Available actions:**
- Select pulling player
- Record pull (with optional bonus)
- Perform injury substitution
- Access stoppages menu (foul, pick, timeout, half-time, end-game)

**Transitions:**
- → in-play (when pull is recorded)
- → point-over (if timeout or foul during pull phase)
- → half-time (if half-time limit reached)
- → game-over (if game-over triggered)

**UI behavior:**
- Active team: defending team (other team from pulling team)
- Player selection mode: pull (for selecting puller)
- Only pull and pull-bonus buttons visible (if enabled)
- Stoppages menu available at bottom

---

### in-play
**Description:** A point is actively in progress. The disc is in play and possession changes may occur.

**Conditions:**
- `point-start` event has been recorded
- `pull` or `pull-bonus` event has been recorded
- No `goal` event recorded for current point yet
- Half-time and game-over have not been triggered

**Available actions:**
- Record incomplete (receiver error)
- Record turnovers (throw away, stall, block, intercept)
- Record defensive actions (block, intercept)
- Perform injury substitution
- Access stoppages menu (foul, pick, timeout, half-time, end-game)
- Record goal

**Transitions:**
- → point-over (when goal is scored)
- → half-time (if half-time limit reached during play)
- → game-over (if game-over triggered)

**UI behavior:**
- Active team: team currently in possession
- Action pane displays all turnover and goal options
- Stoppages menu available
- Player panes show current possession team actively
- Opponent team pane hidden behind action overlay

---

### point-over
**Description:** A goal has been scored and the point is complete. Awaiting line selection for next point.

**Conditions:**
- `goal` event has been recorded for current point
- Next point line has not been confirmed
- Game has not ended

**Available actions:**
- Confirm line for next point
- Perform injury substitution for next point
- Access stoppages menu (foul, pick, timeout, half-time, end-game)

**Transitions:**
- → awaiting-pull (when next line is confirmed)
- → half-time (if half-time limit reached)
- → game-over (if game-over triggered)

**UI behavior:**
- Displays terminal panel showing:
  - Current score
  - Goal scorer name
  - Both team names and colors
  - Next point / continue button
- Live entry screen shows terminal panel instead of action pane
- Line selection screen available for sub changes

---

### half-time
**Description:** Game is paused at half-time break. 

**Conditions:**
- Half-time has been triggered
- Either manually or via reaching half-time point limit
- Game has not ended

**Available actions:**
- Confirm line for resuming play
- Proceed to next half

**Transitions:**
- → awaiting-pull (when second half line is confirmed)
- → game-over (if game-over triggered)

**UI behavior:**
- Terminal panel displayed (like point-over)
- Shows "— Half Time —" marker in event log

---

### game-over
**Description:** Game has concluded. Final stats and score are finalized.

**Conditions:**
- `end-game` event has been recorded
- Score has reached cap (scoreCapAt) or game-over was manually triggered

**Available actions:**
- View final stats
- Export game data
- Return to game selection
- No recording actions available

**Transitions:**
- None (game is complete)

**UI behavior:**
- Terminal panel displayed with final score
- All recording buttons disabled
- Event log shows "— Game Over —" marker
- Stats/export options available

---

## State Machine Diagram

```
┌─────────┐
│pre-game │
└────┬────┘
     │ (confirm line)
     ▼
┌──────────────┐
│awaiting-pull │◄─────┐
└────┬─────────┘      │
     │                │
     │ (record pull)  │ (timeout/foul)
     ▼                │
┌──────────┐    ┌───────────┐
│ in-play  │───►│point-over │
└─┬────────┘    └─────┬─────┘
  │                   │
  │ (goal)            │ (confirm line)
  │         ┌─────────┴────────┐
  │         │ (half-time)      │
  │         ▼                  ▼
  │    ┌─────────┐       ┌──────────────┐
  └───►│ half-time│      │awaiting-pull │
       └────┬────┘       └──────────────┘
            │
            │ (confirm line)
            ▼
       (repeats in-play loop)

(game-over triggered from any state → game-over)
```

## Event Log Markers

Each game state produces distinctive markers in the event log:

- `— Point Started —` : Entering awaiting-pull
- `Pull · PlayerName` : Pull recorded (in-play)
- `Pull Bonus · PlayerName` : Pull bonus recorded
- `→ PlayerName` : Possession change
- `Receiver Error · PlayerName` : Incomplete
- `Throw Away · PlayerName` : Turnover
- `Stall · PlayerName` : Stall turnover
- `Block · PlayerName` : Defensive block
- `Intercept · PlayerName` : Defensive intercept
- `Goal · PlayerName` : Point scored (→ point-over)
- `— Half Time —` : Half-time reached
- `— Game Over —` : Game ended

---

## Recording Guard Rules

All recording actions are protected by `canRecord(state, eventType)`:

**in-play requires:**
- gamePhase === 'in-play'
- discHolder !== null (for turnovers/goals)

**awaiting-pull requires:**
- gamePhase === 'awaiting-pull'
- selPuller !== null (for pull)

**Stoppages** (foul, pick, timeout) allowed in:
- awaiting-pull or in-play phases

**Block/Intercept pick requires:**
- uiMode === 'block-pick' or 'intercept-pick'
- Possession is with opposite team

---

## Migration Rules

When moving between states, the following rules apply:

1. **point-start** → Moves from pre-game/point-over to awaiting-pull
2. **pull/pull-bonus** → Moves from awaiting-pull to in-play
3. **goal** → Moves from in-play to point-over
4. **half-time** → Explicit state change from any in-progress state
5. **end-game** → Explicit state change to game-over from any state
