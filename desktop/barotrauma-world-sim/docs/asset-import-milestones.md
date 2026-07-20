# Barotrauma Local Asset Integration Milestones

This plan governs how the desktop toolbox discovers and uses media from a Barotrauma installation already present on the user's computer. The term **import** means importing index metadata and logical-role mappings into the toolbox. Official media files remain in the local game installation and are not copied into the repository, desktop database, installer, cache, backup, or export.

## Current inventory evidence

The retained 2026-07-19 scan records:

| Inventory | Count |
|---|---:|
| All install files | 3,189 |
| Graphical candidates | 823 |
| Categorized media candidates | 2,003 |
| Music | 54 |
| Ambience | 16 |
| Creature audio | 533 |
| General sound effects | 509 |
| UI audio | 16 |
| Backgrounds and banners | 43 |
| Creature elements | 167 |
| Map elements | 162 |
| Item elements | 341 |
| UI elements, including fonts | 99 |
| Effects, particles, and lights | 59 |
| Other indexed media awaiting review | 4 |

The authoritative planning inputs are:

```text
data/barotrauma/tools/asset-index/all-files.csv
data/barotrauma/tools/asset-index/graphical-assets.csv
data/barotrauma/tools/asset-index/importable-assets.csv
data/barotrauma/tools/asset-index/index-summary.txt
```

Only normalized `RelativePath` values are portable. A desktop installation must join those paths to its own validated donor `Content` root and must reject traversal or any result outside that root.

## Milestone A — Install inventory and category index

**Status: complete.**

- Keep the read-only Windows scan entry point under `data/barotrauma/tools`.
- Inventory the complete installation without changing game files.
- Retain a graphics-only CSV for visual review.
- Retain a categorized media CSV for desktop integration planning.
- Cover images, compiled XNB candidates, OGG and other audio, fonts, and video.
- Keep forward-slash relative paths for cross-platform resolution.

Exit evidence is the checked-in scan summary and categorized CSV.

## Milestone B — Desktop local index loader

**Status: complete.**

- Build a dependency-free reader for the categorized index schema.
- Re-scan or validate the user's selected installation during desktop setup.
- Treat the retained snapshot as role-planning input, never as proof that a file exists locally.
- Validate extension, media type, category, size bounds, readable path, and containment beneath the selected donor root.
- Record game version or content fingerprint so stale mappings can be detected after updates.
- Exclude `LocalMods`, autosaves, player submarines, and other user-created content from automatic mappings unless the user explicitly opts in.
- Publish immutable catalog queries; do not expose a mutable filesystem collection to Swing panels.

The exit gate is a verification fixture showing valid resolution, missing-file handling, traversal rejection, stale-snapshot reporting, and fallback behavior.

## Milestone C — Graphical role expansion

**Status: next asset milestone.**

- Bind donor/fallback roles into the World Map, station economy, submarine registry, player transit, encounters, crew, cargo, and workshop surfaces.
- Expand the four initial roles into explicit background, UI, map, creature, item, submarine, station, geology, and effect roles.
- Decode and scale images off the Swing Event Dispatch Thread.
- Cache only decoded in-memory display results for the running process; do not copy donor files to disk.
- Preserve an original neutral fallback for every required role.

The exit gate requires every participating screen to remain usable with a valid donor install, a partial install, a moved install, and fallback-only mode.

## Milestone D — Music, ambience, and sound

**Status: planned.**

- Add one application audio service for music, ambience, UI feedback, creature cues, and general effects.
- Require explicit enablement before first playback.
- Provide independent music, ambience, and effects volume plus global mute.
- Stop and release playback resources when a world closes or the application exits.
- Avoid overlapping duplicate tracks when navigation changes.
- Fall silent without blocking the interface when donor files disappear or decoding is unsupported.
- Keep playback choices cosmetic; simulation results and deterministic replay must not depend on audio.

The exit gate covers mute/volume persistence, missing files, unsupported codecs, rapid navigation, shutdown cleanup, and fallback-only operation.

## Milestone E — Map, creature, and content-aware presentation

**Status: planned.**

- Map biome and location backgrounds to normalized world regions.
- Map creature imagery and cues to known creature identifiers rather than filename guesses alone.
- Map item and equipment art through canonical catalogue identifiers.
- Use UI atlases only through reviewed crop or sprite metadata; do not present entire sheets accidentally.
- Keep unknown and ambiguous candidates visible in a developer review report rather than auto-binding them.

The exit gate is a reviewed logical-role manifest with no duplicate required role, no unresolved required fallback, and deterministic selection for a fixed donor version.

## Milestone F — Packaging and update hardening

**Status: planned.**

- Confirm installers contain no official Barotrauma media and no developer-machine donor path.
- Revalidate mappings after Barotrauma or the desktop client updates.
- Report removed, moved, added, and category-changed candidates without deleting user preferences silently.
- Keep donor configuration out of portable world exports and backups.
- Document that use requires the user's own legitimate local Barotrauma installation.

The exit gate includes an installer-content audit, upgrade test, moved-library test, and clean-machine fallback-only test.
