# TGMC map development

Open **TGMC Map Editor** in the applications menu to edit Tyson using StrongDMM and the current game code. Other restored maps live under `Projects/TGMC/_maps/map_files/Port_Hamburg` and `SS_Ourang_Medan`. The upstream Vapor map remains unchanged.

Open **TGMC Local Server**, choose a map, and wait for initialization. Open **TGMC Game Client** to connect to `byond://127.0.0.1:14000`. The private Wine prefix includes Microsoft VC runtime and Wine Gecko. BYOND login and interactive gameplay still need a manual check. **TGMC Code Editor** opens Geany; **TGMC Build Game** rebuilds after source changes.

**TGMC Back Up Maps** saves dated archives into `Backups/TGMC-map-edits`. Original 2019 source maps are preserved in `Backups/TGMC-original-maps`, the original GitHub fork is in `Backups/GitHub-projects/TerraGov-Marine-Corps`, and complete upstream Git history is in `Backups/TGMC-upstream/TGMC.bundle`.

Restoration uses current paths, variables, access numbers, objective markers, and AI navigation nodes. This is a local development restoration; full mission balance, crash-mode landing locations, and every shuttle interaction require playtesting before public deployment. Conversion and repair records are in this tools folder.
