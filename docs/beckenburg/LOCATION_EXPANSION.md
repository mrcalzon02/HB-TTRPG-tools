# Beckenburg investigation-map expansion (first playable slice)

Implementation commits: the original HOUSE layout remains the default. Two additional
host-authored, single-floor investigation sites are selectable in the solo prep menu
and the LAN lobby: FARMHOUSE (Abandoned Farmhouse) and SCHOOL (Ravenshade School).

## Design and scope

Both sites have twelve named indoor zones and three exterior/staging zones. They have
different physical door sockets and corner-room subdivisions, environment-material
assignments, furnishing compositions, and themed ritual markers. Every site uses the
same host-side door collision, ghost traversal constraints, six-hunter van staging,
room lighting, weather, equipment, event and ritual simulation.

This is a functional **first authored-location pass**, not a claim that the farmhouse
or school already has a unique freeform foundation, multiple floors, a roof mesh, or
complete bespoke assets. Currently the 25x31 shared zone grid and van coordinates
are reused so old host/client network frames, room-based equipment, and rituals stay
compatible. A future map-schema upgrade should add independent footprints, floors,
windows and terrain without repurposing the old house coordinates.

## Imported asset provenance and roles

`InvestigationSites` declares placement transforms and room ownership. All references
currently resolve to previously imported real GLB runtime resources, not freshly
generated placeholders: shelf_mp_6, chair_mp_5, dinner_table_1, armchair_1,
sofa_1, wardrobe_mp_1, display_cabinet_mp_2, and kenney_detail_bench.
The furniture assets come from the curated Beckenburg licensed PSX library, while
the outdoor bench is a separately indexed runtime model. Their originals and archives
remain in the shared asset library. Source/model licensing remains controlled by the
existing master asset index; this feature ships no source archives or Blender sources.
The additional user-owned `models.zip` collection remains separately indexed and
requires per-file conversion/geometry verification before newly selected models ship.

## Game integration and verification

- `HouseMap.Site` determines authored room labels, door tiles and partitions.
- `SiteCatalog.mapFor` unlocks only completed house, school and farmhouse solo sites.
- `LanLobbyWindow` host selection and `SITE|<enum>` messages synchronize room
  identity for ghost and hunter clients; replay is sent when re-opening a world view.
- `SceneRenderer.furniture` instantiates authored runtime meshes by room; material
  and ritual rendering follow selected-site context.
- `InvestigationSitesTest` checks map topology, ritual sockets and source mesh
  geometry; `LanSiteSelectionIntegrationTest` checks real TCP site selection.
- Both standard platform build scripts must execute these tests. A real Java 17
  full build and graphical walk-through are still required before release acceptance.

## Next authoring pass

Move to per-location room footprints, 2+ floors where appropriate, exterior forest
terrain, structural window modules, integrated colliders for furniture, level-specific
ambience, acoustics and spawn locations, and curated user-owned GLB model ingestion
after triangle-count, transform, scale, and licensing validation.
