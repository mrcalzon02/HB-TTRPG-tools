# Milestone 6.1 — Graphical Desktop Shell and Current-Systems Default World

**Status: Active**

This milestone continues the Desktop Passive World Observation Development Plan by making the installed Java client visually use the approved Barotrauma asset catalogue and by giving operators a canonical way to create a fresh world that begins with every currently implemented desktop authority.

## Architectural rules

- The launcher and observation surfaces construct their backgrounds, icons, panels, tabs, and buttons before the window becomes visible.
- No post-render decorator, component scanner, delayed asset mutator, or parallel Swing skin authority is permitted.
- Donor Barotrauma media remains local-only. The installed client resolves local donor media first, reviewed packaged atlases second, and independent Java2D emergency visuals last.
- Buttons use proportioned operation icons. Atlas button or panel textures are not stretched over arbitrary Swing controls.
- Generated worlds use the same version-22 normalization, forward migrations, deterministic clock, passive transaction, checkpoint, and query-only observation contracts as imported worlds.
- The generator must never clone an old SQLite database or bypass current schema initialization.

## Slice 6.1A — Construction-time desktop graphics

**Implemented in the active slice**

- One `BarotraumaDesktopTheme` consumes the existing `BarotraumaAssetCatalogue` directly.
- The primary launcher uses a reviewed application scene, semantic workspace icons, translucent operational surfaces, and proportioned action icons as part of its original component construction.
- The Passive World Observation window uses the same construction-time visual authority for its scene, title, tabs, tables, summary, controls, and window icon.
- The launcher exposes Passive World Observation as a first-class workspace rather than a disconnected command-line-only window.

**Remaining acceptance**

- Apply the same construction-time theme to the remaining major child windows without replacing their canonical behavior.
- Capture installed-client screenshots for launcher, observation, world map, logistics, frontier, and world generation.
- Run exact-head Java 17 compilation and the complete desktop verification suite.

## Slice 6.1B — Current-systems default Europa world

**Implemented in the active slice**

- A deterministic 24-location, 12-station Europa Operations template is defined in code.
- World creation uses `WorldStorageContracts.createWorld` and the canonical version-22 inspection and import transaction.
- One canonical initialization tick seeds station simulation, detailed and aggregate populations, logistics, civilization, observation, ecology, geology, missions, vessels, demographics, migration, and settlement-era authorities.
- The generated world is disabled and paused after initialization rather than silently starting Passive Mode.
- Partial worlds are deleted if any import, migration, initialization, checkpoint, or validation step fails.
- A graphical generator window creates the world, validates the initialized counts, and activates it through the shared `DesktopWorldSession`.

**Remaining acceptance**

- Execute the generator contract against SQLite on exact `main`.
- Review station names, topology, factions, population scale, vessel roles, markets, and natural-resource distribution as a dedicated content-balancing slice.
- Add optional generation profiles without creating separate initialization pipelines.

## Slice 6.1C — Verification and release

**Active**

The focused generator contract requires:

- Current database schema.
- Exactly 24 locations and 12 principal stations.
- One station simulation row, detailed NPC population row, and aggregate population row per station.
- Ecology and geology state for every location.
- Current demographic, migration, settlement, founding, disposition, and observation authorities.
- At least one committed initialization snapshot.
- Paused scheduler and disabled simulation after the first initialization tick.
- Zero foreign-key violations.

Milestone 6.1 remains Active until `toolbox.cmd verify` and the installed desktop runtime both pass from the exact published head.
