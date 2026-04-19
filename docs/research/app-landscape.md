# App Landscape
## Ultimate Stat Tracker

**Version:** 0.2
**Last Updated:** 2026-04-18
**Source:** Research prompted by Myall Hinge

> These are all community tools doing good work for Ultimate Frisbee. This is not a competitive analysis — it is a map of the ecosystem to understand where this project sits and what gap it fills.

---

## Verdict

**PenUltimate covered the 2024 Parity League requirements and is the closest functional reference point for this project.** The improvements we want — validated state machine, multi-user WebSocket sync, server-backed rosters, and a more guided low-error UX — are the justification for building something new rather than continuing to use it.

Statto is the most impressive app in the space — field position tracking, rich analytics, actively maintained — but it costs money, is iOS only, and the pitch diagram entry may be too slow and complex for casual sideline use.

Ulti-Stats appears not to collect stats at all despite the name.

This project produces clean per-player export data that can feed downstream uses like Parity League salary calculations, but the app itself is a general-purpose Ultimate Frisbee stat recorder.

The main risk is not duplication. It is whether the improvements over PenUltimate are worth the build effort. The answer depends on how much multi-user sync and data integrity matter to the league.

---

## Apps & Platforms

### 1. [Statto](https://statto.app/) — iOS only, $9.99 after trial *(Referred by Myall Hinge)*
- **What it is:** iOS app for live and post-game stat tracking via a pitch diagram interface. Actively maintained — last updated July 2025.
- **Stats tracked:** Goals, assists, blocks, turnovers, plus/minus, completion %, average pass distance, heatmaps, scoring efficiency, **field position**
- **UX:** Tap locations on a pitch diagram to log events; coach-focused with real-time lineup adjustment view
- **Review:** Impressive — field position tracking included and the analytics are rich. Costs money and the input model may be too detailed/slow for casual sideline use in a community league context.
- **Where this project differs:** iOS only (no Android); pitch diagram entry may be too complex for non-technical recorders; paid; no multi-user sync

---

### 2. [UltiAnalytics](https://www.ultianalytics.com/) — ⚠️ Effectively defunct on Android
- **What it is:** Was the most feature-complete live stat tracker — iOS + Android app + web platform. **Pulled from Google Play March 2024.**
- **Stats tracked:** Passes, drops, assists, goals, Ds, throwaways, playing time, wind conditions
- **UX:** Live entry via mobile; events viewable and undoable; gender-based player transitions
- **Where this project differs:** No validated state machine; no multi-user sync; Android version gone

---

### 3. [PenUltimate](https://penultimateapp.com/)
- **What it is:** Mobile-first sideline stat tracker — no login, works offline, designed for one-handed use
- **Stats tracked:** Goals, assists, passes, blocks, turnovers
- **UX:** Fast one-handed entry; works at scrimmage or tournament level
- **Review:** Met the 2024 Parity League requirements. The closest reference point for this project — improvements wanted are: server sync, multi-user, validated state machine, and better data integrity guarantees.
- **Where this project differs:** Offline/local only — no server sync, no multi-user; no validated state machine

---

### 4. [U-STAT](https://u-stat.app/) — Free, no login
- **What it is:** Free mobile app, data stored locally on device
- **Stats tracked:** Goals, assists, drops, turnovers; derived metrics (player impact, team efficiency, point length); gender ratio; game timers (hardcap, softcap, halftime)
- **UX:** Import roster via USAU team link; timer-driven game management
- **Where this project differs:** Local-only; no pass chain tracking; no validated state machine

---

### 5. [Shown Space](https://shownspace.com/) — Analytics platform, not a recorder *(Referred by Myall Hinge)*
- **What it is:** ML-powered analytics platform — consumes stat data, does not capture it
- **Stats tracked:** aEC (contribution), WPA (Win Probability Added), xCP/CPOE, possession timelines, heatmaps
- **UX:** Web dashboard — leaderboards, scouting reports, StatChat
- **Where this project differs:** Not a recording tool; complementary rather than competing — could theoretically consume this project's export

---

### 6. [Leaguevine](https://www.leaguevine.com/)
- **What it is:** League stats platform — post-game stat entry and tracking across leagues/seasons
- **Stats tracked:** Completions, completion %, throwaways, goals, assists, Ds, plus/minus (overall, offensive, defensive), playing time
- **UX:** Web-based; appears to be post-game entry rather than live sideline
- **Where this project differs:** Not a live sideline tool; no multi-user sync

---

### 7. [Ultirzr](https://www.ultirzr.app/)
- **What it is:** Search and discovery platform for teams, tournaments, and players — rankings, matchups, API
- **Stats tracked:** Tournament results, rankings
- **Where this project differs:** Not a stat recording tool at all — complementary discovery/rankings layer

---

### 8. [Ulti-Stats](https://ulti-stats.web.app/) *(Referred by Myall Hinge)*
- **What it is:** Lightweight web app — minimal public information
- **Review:** Does not appear to collect stats despite the name.
- **Where this project differs:** Not applicable — does not appear to be a functioning stat recorder

---

### 9. [The Ultmt App](https://www.theultmtapp.com/) *(Referred by Myall Hinge)*
- **What it is:** iOS and Android app — landing page only, no public feature documentation
- **Where this project differs:** Cannot assess — insufficient public information

---

## Summary Comparison

| | This Project | Statto | UltiAnalytics | PenUltimate | U-STAT | Shown Space |
|---|---|---|---|---|---|---|
| Live sideline entry | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Validated state machine | ✅ | ❌ | ❌ | ❌ | ❌ | — |
| Multi-user WebSocket sync | ✅ | ❌ | ❌ | ❌ | ❌ | — |
| Pass chain tracking | ✅ | ✅ | ✅ | ✅ | ❌ | — |
| Android-first | ✅ | ❌ | ⚠️ defunct | ✅ | ✅ | — |
| Free | ✅ | ❌ | — | ✅ | ✅ | — |
| Advanced analytics | ❌ export only | ✅ | partial | ❌ | partial | ✅ |
| Still actively maintained | ✅ | ✅ | ⚠️ | ? | ✅ | ✅ |
