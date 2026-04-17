# Ultimate Stat Tracker

A sideline stat recording app for Ultimate Frisbee — fast, validated, and usable by anyone.

Built for **Parity League**: per-player stats recorded live so General Managers can trade players under a salary cap between games.

---

## Project Status

🟡 **Phase 0 — Requirements Gathering**

---

## Key Decisions

- **UI:** Google Stitch (web-first)
- **Transport:** WebSockets only — all communication is uniform, one protocol
- **Data:** Append-only event log — amendments are new entries, nothing mutated
- **Validation:** App only presents valid next actions — invalid sequences are impossible
- **Multi-user:** Multiple recorders per game, all synced via WebSocket session
- **Session persistence:** Leave and rejoin any time — full state restored on reconnect

---

## Documentation

| File | Description |
|---|---|
| [docs/MOC.md](docs/MOC.md) | Map of Content — start here |
| [docs/requirements/product-requirements.md](docs/requirements/product-requirements.md) | Master requirements, goals, open questions |
| [docs/requirements/features.md](docs/requirements/features.md) | Core feature definitions |
| [docs/requirements/architecture.md](docs/requirements/architecture.md) | Server design, protocols, event log model |
| [docs/requirements/sport-context.md](docs/requirements/sport-context.md) | Ultimate Frisbee rules relevant to stat keeping |
| [docs/requirements/validation-rules.md](docs/requirements/validation-rules.md) | Event state machine and integrity rules |
| [docs/requirements/user-stories.md](docs/requirements/user-stories.md) | User stories by role |
| [docs/design/screens.md](docs/design/screens.md) | Screen list and field orientation logic |
| [docs/design/screen-states.md](docs/design/screen-states.md) | Every possible screen state with transitions |

---

## Continuing in Claude Code

Load this repo and upload the docs to your Claude Project for full context.
The key open questions are in [product-requirements.md](docs/requirements/product-requirements.md).
