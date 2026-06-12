# Module Extraction Correction — The Northern Watchtower 09

This correction addresses the first Module Viewer extraction.

## What was wrong

The original `data/modules/northern-watchtower-09.json` was only a first-pass extraction. It had all 30 room records, but it only carried a small primary subset of door records and therefore failed as a table-ready module reference.

The source PDF room listings contain many more room-side entries than the first extraction exposed. Rooms often list duplicate side entries, unlinked entries, trapped entries, secret entries, and reciprocal entries that all matter at the table.

## Corrective runtime behavior

`module-viewer.js` now loads module correction patches for `northern-watchtower-09` before rendering.

The viewer now:

- Loads six Northern Watchtower room-door patch files.
- Loads one extraction-status patch.
- Merges patch rooms, doors, and door hotspots into the base module data.
- Uses `room.doorIds` so a room panel displays the exact doors and entries listed under that room.
- Displays traps, tricks, monsters, treasure, and listed doors separately.
- Still falls back to physical door connections if a module does not provide `doorIds`.

## Patch files added

- `data/modules/patches/northern-watchtower-09-door-pass-rooms-1-5.json`
- `data/modules/patches/northern-watchtower-09-door-pass-rooms-6-10.json`
- `data/modules/patches/northern-watchtower-09-door-pass-rooms-11-15.json`
- `data/modules/patches/northern-watchtower-09-door-pass-rooms-16-20.json`
- `data/modules/patches/northern-watchtower-09-door-pass-rooms-21-25.json`
- `data/modules/patches/northern-watchtower-09-door-pass-rooms-26-30.json`
- `data/modules/patches/northern-watchtower-09-extraction-status.json`

## Corrected extraction status

- Rooms: 30/30 room records extracted with room-side door listings preserved.
- Doors: 90/90 room-side door/entry records extracted from the PDF room listings.
- Hotspots: 30 room label hotspots and 90 door hotspots present.

## Map correction

`data/modules/northern-watchtower-09-map.svg` has been replaced with a rendered page-one map image from the source PDF. The prior map asset was not a useful visible map.

## Remaining refinement

Some reciprocal room-side entries share the same physical map coordinate where the printed map shows a single doorway. That is expected for this correction pass. Later visual polish may separate overlapping click targets or add a small stacked-door selector at shared map positions.
