# Milestone 6.1 — Graphical Desktop Shell and Current-Systems Default World

**Status: Active**

This milestone continues the Desktop Passive World Observation Development Plan by making the installed Java client visually use the approved Barotrauma asset catalogue and by giving operators a canonical way to create a fresh world that begins with every currently implemented desktop authority.

## Architectural rules

- Each graphical desktop surface must construct its background, icons, panels, tabs, and buttons before the window becomes visible.
- No post-render decorator, component scanner, delayed asset mutator, or parallel Swing skin authority is permitted.
- Donor Barotrauma media remains local-only. The installed client resolves local donor media first, reviewed packaged atlases second, and independent Java2D emergency visuals last.
- Buttons use proportioned operation icons. Atlas button or panel textures are not stretched over arbitrary Swing controls.
- Generated worlds use the same version-22 normalization, forward migrations, deterministic clock, passive transaction, checkpoint, and query-only observation contracts as imported worlds.
- The generator must never clone an old SQLite database or bypass current schema initialization.

## Slice 6.1A — Construction-time desktop graphics

**Implemented in the active slice**

- One `BarotraumaDesktopTheme` consumes the existing `BarotraumaAssetCatalogue` directly.
- The primary launcher uses a reviewed application scene, semantic workspace icons, translucent operational surfaces, and proportioned action icons as part of its original component construction.
- The launcher exposes Passive World Observation as a first-class workspace rather than a disconnected command-line-only window.
- The launcher, navigation, operation cards, status surfaces, and current-system world generator use the packaged/donor graphics before becoming visible.

**Remaining implementation and acceptance**

- Convert `ObservationFoundationWindow` directly to the same construction-time scene, icon, table, tab, and control authority without creating a second observation window.
- Apply the construction-time theme to the remaining major child windows without replacing their canonical behavior.
- Capture installed-client screenshots for launcher, observation, world map, logistics, frontier, and world generation.
- Complete the full desktop verification suite and installed-client runtime review.

## Slice 6.1B — Current-systems default Europa world

**Implemented and focused-verified**

- A deterministic 24-location, 12-station Europa Operations template is defined in code.
- World creation uses `WorldStorageContracts.createWorld` and the canonical version-22 inspection and import transaction.
- One canonical initialization tick seeds station simulation, detailed and aggregate populations, logistics, civilization, observation, ecology, geology, missions, vessels, demographics, migration, and settlement-era authorities.
- The generated world is disabled and paused after initialization rather than silently starting Passive Mode.
- Partial worlds are deleted if any import, migration, initialization, checkpoint, or validation step fails.
- A graphical generator window creates the world, validates the initialized counts, and activates it through the shared `DesktopWorldSession`.
- `DefaultWorldGeneratorVerification` compiled and completed successfully in Java 17 and SQLite workflow run `30189261569` from source commit `5ad96bb8` before the suite reached a later fleet-recovery fixture failure.

**Remaining content development**

- Review station names, topology, factions, population scale, vessel roles, markets, and natural-resource distribution as a dedicated content-balancing slice.
- Add optional generation profiles without creating separate initialization pipelines.
- Add explicit generated-world evidence for starting vessel availability, market specialization, faction pressure, and settlement-growth opportunities.

## Slice 6.1C — Verification and release

**Active**

The focused generator contract requires and has exercised:

- Current database schema.
- Exactly 24 locations and 12 principal stations.
- One station simulation row, detailed NPC population row, and aggregate population row per station.
- Ecology and geology state for every location.
- Current demographic, migration, settlement, founding, disposition, and observation authorities.
- At least one committed initialization snapshot.
- Paused scheduler and disabled simulation after the first initialization tick.
- Zero foreign-key violations.

The exact desktop workflow now compiles the graphical launcher and generator and completes the generator contract. The complete suite still fails later in `FleetRecoveryAndNaturalWorldVerification` because its response vessel does not return to the expected docked state. Milestone 6.1 remains Active until that older full-suite blocker is repaired and the installed desktop runtime is reviewed from a published build.
