# TGMC maps in SS14

Start **SS14 Local Server**, then **SS14 TGMC Maps** from the applications menu. The chooser shows the command for your selected map and opens the editor.

Open the game console with the backtick key, then enter one of these commands. Use a new map number for each additional map, or restart the server when switching to avoid keeping several large maps in memory.

| Map | Load in editor | Native objects |
|---|---|---:|
| Tyson Station | `mapping 1000 Maps/TGMC/Tyson_Station.yml false` | 10,366 |
| Port Hamburg | `mapping 1000 Maps/TGMC/Port_Hamburg.yml false` | 37,304 |
| SS Ourang Medan | `mapping 1000 Maps/TGMC/SS_Ourang_Medan.yml false` | 6,606 |
| Vapor Processing | `mapping 1000 Maps/TGMC/Vapor_Processing.yml false` | 4,854 |

F5 opens the entity picker; F6 the tile picker; F7 admin tools. The map origin is placed at a clear floor near the middle so the mapping command starts you inside the layout. Maps begin paused for editing.

Save edits with `savemap 1000 my-map-edited.yml`. Saves go to `/home/adminis/Documents/Data/Tools/SS14/server-data`. The SS14 backup launcher now backs up both saved edits and the converted source maps.

For a local simulation check, save first, then run `mapinit 1000` and `unpausemap 1000`. Spawn a human with F5 and use the admin possess action for an interactive test. Use a fresh loaded copy for testing and keep your editing copy paused.

## Local play

Start **SS14 TGMC Local Game**, choose a map, wait for Ready, then open **SS14 Map Editor** to connect and join as a character. This runs native SS14 Sandbox on the selected layout. Stop any other SS14 server first, because both use port 1212. Close the game client and press Ctrl+C in the hosting terminal when finished.

## What the conversion preserves

One TGMC tile becomes one SS14 tile. Floors, walls, major obstacles, windows, doors, water, furniture, equipment locations, and the overall map footprint are retained. SS14 assets provide the graphics and interactions. Original DMM files remain in the TGMC workspace. Lattice becomes native SS14 lattice tiles; TGMC water becomes native water with movement slowdown over a supported ground tile. Lattice support is added under space-mounted structures so SS14 can anchor them and connect their pipes and cables. The reports list these added support cells.

These are **local mapping and exploration sandboxes**. APC-powered machines are supplied independently (`needsPower: false`) and doors start unrestricted. This lets you edit and try equipment before rebuilding power distribution, access roles, and atmos networks around SS14 mechanics. Floors begin with room-temperature air, outdoors use a breathable map atmosphere, and gravity is enabled. Original pipe positions are translated to native pipe shapes and layers; a full engineering simulation still needs network redesign and testing.

TGMC AI navigation, xenomorph spawns, objectives, and dropship rules are game-specific and are not SS14 game modes. Local game-map prototypes provide Captain, Passenger, Station Engineer, and Medical Doctor jobs for Sandbox. These maps are not added to public station rotation. No files were pushed to GitHub. The per-map reports in this folder list every source type, native substitution, and omission. Some specialized devices, effects, and equipment have no reliable equivalent and are left for manual adaptation rather than replaced with nonfunctional props.

Hamburg has roughly 37,000 objects and will be slowest on this laptop. Start with Vapor or Ourang and run one map at a time.

## Sources and recovery

TGMC base commit: d17228095d2bbc94359acaf7421119a60c672261. Tyson, Hamburg, and Ourang were restored from your 2019 fork commit 0561be01eb281e44787e46af55cd0f13478c3e9a. Vapor is the current upstream layout. SS14 base commit: 07c0caa76bf941d2a5ed53b827c0bc25f16eb162; Robust engine 292.0.0. TGMC source attribution and licenses remain with the original backups; native SS14 graphics remain in their existing resource tree.

`convert.py` recreates the generated ports from the source cell snapshots and pinned prototype catalogue. It overwrites those generated YAML files: save manual edits under a different filename first. Detailed validation results are recorded in `VALIDATION.md`.
