# P00 development integration — first playable source slice
Date: 2026-10-15. Stage P00 remains **blocked on binary art archival and Windows checks**, even if this source slice reaches GitHub main.

## Scope of this slice
Java 17 new classes `HouseMap`, `SceneRenderer`, `InvestigationSession`, `ProfileStore`, `InvestigationGame` plus automated `GameplaySmokeTest` and optional `GuiSmokeTest`. The original `BeckenburgPrototype` stays intact for comparison. New build scripts select `InvestigationGame` as JAR entrypoint. This deliberately avoids claiming an entire 3D game production engine or LAN infrastructure.

## Required evidence
- JDK 21 `javac --release 17`, headless gameplay smoke test and jar packaging.
- Linux virtual-display Swing launch → menu action → live first-person panel → screenshot.
- Inspect a real frame to ensure perspective geometry, floor, furniture, HUD are visible and game is not a featureless fill.
- Read back all committed Java source files, scripts and documentation from main; record exact commit SHA.
- Separate blocker: full-resolution PNG art and functioning website gallery are NOT verified remotely; do not mark P00 complete.

## Follow-on dependency work
- P00: binary art import and gallery fix, branch authoritative state/receipt; clean Windows graphical install test.
- P01: replace or justify the temporary Java2D renderer with tested hardware 3D engine and import pipeline.
- P06/P09: authoritative simulation event/command definitions and AI/human ghost parity.
- P07/P08/P10: LAN host/join, snapshots, filtered ghost observations and player-ghost controls.
- P13/P14/P16: instrument calibration, evidence counterfeits, multi-phase spatial rituals.
