# Future Design Changes

Living list of design changes that are deferred from current implementation but want
to be remembered for a later iteration. Each entry: short name, motivation, sketched
approach, and any open questions.

---

## Incorporate scorer (+validation)

**Motivation.** A line confirmation today is a single trusting action — whoever taps
"Confirm" sets the on-field roster for the point. There's no record of *who* made
that call, and there's no second pair of eyes to catch a misclick (wrong player
selected, missing a player, ratio off, etc.). For competitive play (and for any
post-game audit), we want to (a) attribute each scoring action to a specific
recorder/scorer and (b) optionally require a second person to validate the line
before it goes live.

**Sketched approach.**
- Add a `scorers: Scorer[]` collection on the session — each scorer has an `id`,
  display name, and (later) an auth identity.
- Stamp each `RawEvent` with `scorerId` so attribution is logged alongside the
  game data.
- Add an optional **two-eyes line confirmation** flow:
  - Primary scorer selects line → "Confirm".
  - A confirm screen waits for a second tap from a different scorer (or a
    timer-based override).
  - The validation result is also logged as an event.

**Open questions.**
- Single-scorer mode vs multi-scorer: opt-in per game, or always?
- How to handle a single tablet shared between scorers — passcode? face cycle? no
  validation at all?
- Should validation extend beyond line confirmation (e.g. goals, defensive
  blocks)? Probably — but starts as a line-only feature.
- Where does scorer identity live in `RecordingOptions` vs `GameConfig` vs a new
  `SessionMeta`?

**Status.** Captured 2026-04-29. Not scheduled.
