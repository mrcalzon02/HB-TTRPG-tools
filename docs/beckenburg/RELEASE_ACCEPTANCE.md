# Beckenburg — Release Candidate and Gold Acceptance Contract
Version 1.0 · 2026-10-15. Release decisions are based on tested **downloadable product** evidence and the single [stage ledger](stage-ledger.json), not broad claims of progress.

## Required scope inventory
- Windows Java 17 desktop application, bundled runtime, complete menu/lobby/settings and stable low-poly first-person 3D gameplay.
- One locally hosted match: precisely three playable hunter seats (Cleric, Observer, Demonologist) and one ghost seat; human or AI ghost uses the same host-validated commands.
- Ghost types: Possessive, Poltergeist, Demon, Yokai, Banshee, Wraith, Shade, Specter, Spirit, Hantu, Devil, Mimic and Twins, each with a differentiated power/evidence/counterplay package and controller-parity proof.
- At least one complete level of each location family: house, mansion, prison, asylum, school, farmhouse, academy, college, church. All with valid named room zones, ghost passage, items, audio/light/evidence sockets and physical ritual positions.
- Equipment by category: detectors, recording tools, cameras, portable ritual objects, stationary sensors, protective/banishment tools. Working readings derive from world state, not UI-only dials.
- Séances, ward placement, rituals, banishment, site cleansing, incremental injury, stress/affliction, warnings and recoverable retreat/extraction.
- Beckenburg Castle briefing, class/loadout management, currency, XP/progression, shop, repair, persistent profiles, reclaimed territories, injury care and final mission debrief.
- Authentic concept-to-mesh original artwork, licensed audio, visible correct GitHub Pages asset gallery, accessible controls/HUD, functional subtitles, local save/network safety, stable install/uninstall.

## Releases must be incremental and truly runnable
**Prototype / M0:** reconcile local/new code and original art on main; image gallery loads original images. **Solo alpha / M1:** a complete single-player mission is replayable by an independent tester. **LAN alpha / M2:** four seats complete real sessions and ghost-player controls work. **Content beta / M3–M4:** agreed 13/9/3 scope, content packs, UX and stability all pass. **RC / P30:** immutable candidate Windows installer/ZIP with bundled Java runtime and reproducible source SHA. **Gold / P31:** publish and independently download, install, host/join/play and hash-verify exact release binary.

## Release execution and evidence packet
For each candidate, store version, source commit, Java/toolchain versions, platform and GPU, source/asset SHA-256 hashes, release artifact filename/size/hash, build and test commands, captured test results, recorded pass/fail gates, known issues with severity and a release decision. A source commit on GitHub is not a downloadable build; a ZIP in a local working directory is not an uploaded installer; a successfully submitted release API request is not proven distribution. Read back the published artifact and perform a clean-client test.

## Final gating order
1. `P00` binary-art and source reconciliation; stop if source only exists locally or site images are still SVG substitutes.
2. `P01–P18` running real 3v1 gameplay; stop if host authority, AI/human parity, or the core ritual/evidence loop is not complete.
3. `P19–P25` feature and visual content complete; stop if one of 13 types, 9 categories or three classes is missing or nonfunctional.
4. `P26–P29` exhaustive regression, fairness, long-session perf/security and accessibility; stop with any P0/P1.
5. `P30` signed RC proof on **clean** supported Windows machines, not merely on developer JDK.
6. `P31` Gold go/no-go, exact published asset read-back, real clean-machine LAN test and durable documentation.

## Error budget and no-false-completion rules
Gold requires zero open P0/P1 issues, zero release-blocked stages, reproducible clean startup, stable network mission, no recurring memory growth on target hardware, verified save recovery and all game assets present. P2 issues may be disclosed only when bounded, noncritical, not a broken promise in scope and accepted in release decision. Never claim support for hardware configurations untested. Any failed stage step is blocked or active, not complete, even if other subsystems perform correctly. Local and remote versions must be compared before any milestone status changes. No bypass/stub/no-op repairs, destructive forced pushes, duplicate status ledgers or GitHub Actions introduced by default.

## Stage closeout record template
```text
Stage/microstep: Pxx.yy
Baseline main SHA: ...
Implemented files + hashes: ...
Test environment (OS, Java, GPU, participants): ...
Test commands/run IDs: ...
Positive cases: ...
Negative/adversarial cases: ...
Regression and performance: ...
Open defects: ...
Committed main SHA (verified): ...
Read-back changed blobs + published media URLs (verified): ...
Gate result: PASS / BLOCKED / UNVERIFIED
```
