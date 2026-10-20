# Environment production plan

Baseline: main `b89e3bbc`, 19 October 2026. The approved concepts are in
`assets/beckenburg/concept-art/v001/04-environments` at repository root.
The previous three ground-floor maps have room graphs, but no mission elevation.
They do not meet the requested multi-storey standard.

## Delivery contract

Finish and inspect the house first. Use its verified construction and interaction
systems for the other eight locations. Finalize, commit, upload and verify the
remote commit. Local level compilation, checks and rendered previews are authorized.
An unresolved defect remains recorded as unresolved; a rendered concept does not
establish playability.

`LevelDefinition` is the metre-based source of truth for standing surfaces,
room volumes, openings, doors, stairs, deck voids, imported furniture, oriented
collision footprints, electrical fixtures, evidence and ritual sockets, acoustic
materials, hiding places, hunter spawns and the van dock. Native source mesh pivots,
scales, embedded UV images and materials are preserved. Twelve investigation zones
retain the network evidence contract; these are actual named rooms or institutional
wings, not a spatial grid. Exterior zones remain rear grounds, approach and van.

## First location: house

Use the concept's approximately 12 by 14 metre, gabled, two-storey residence with
a full basement. Ground floor: foyer, living room, kitchen, dining room, stair hall.
Keep a pursuit loop through those five spaces. Upper floor: stair landing, main
bedroom, child's bedroom and bathroom. Basement: landing, utility and storage.
Floors stand at -3, 0 and +3 metres. Stair flights have a real 1.5 metre clear width,
4.8 metre run, measured treads, matching floor/ceiling openings and supported rails.
They must work in both directions with the host deriving elevation from support.

Build the shell and openings before furnishing. Then place source-library seating,
beds, cupboards and sanitary fixtures; fabricate fitted kitchen and missing domestic
fixtures with actual doors, handles, basins and support surfaces. Keep circulation
and door approaches clear. Books, dishes and photographs require real support.
Wood panelling, worn plaster, timber floors and tiled service rooms follow the
concept, using the source library's original texture pixels rather than flat colors.
Use domestic ceiling fixtures and lamps indoors, utility fixtures in the cellar,
and restrained exterior fixtures. Mount switch plates at reachable wall heights,
breakers on a utility wall and fixture tops against their ceiling or bracket.

## Remaining location identities

| Location | Architecture and vertical circulation | Furnishing and acoustic character |
|---|---|---|
| Mansion | Entrance hall, reception wings, grand stair, upper suites, cellar | Formal seating, library, timber reception rooms and long reverberant hall |
| Prison | Gatehouse, secure cell wings, upper gallery and lower services | Metal beds, bars, work tables, concrete/metal sound and gated portals |
| Asylum | Reception spine, treatment/ward wings, upper ward and basement plant | Institutional beds, treatment surfaces, tiled wet areas and ward absorption |
| School | Classroom wings, assembly space, stairs, upper teaching rooms and boiler room | Repeated desk/chair groups, shelves, boards; corridor versus classroom response |
| Farmhouse | Porch, family rooms, upper sleeping rooms, root cellar and barn grounds | Plain timber furniture, utility shelving and barn-appropriate practical fixtures |
| Academy | Cloister circulation, library/lecture wing, upper study rooms and crypt services | Reading tables, books, dormitory furniture and stone corridor response |
| College | Connected academic wings, lecture/library zones, upper faculty rooms and plant | Institutional work groups, archives and broad circulation |
| Church | Nave/chancel, side aisles, choir loft/tower and crypt | Pews/benches, stone and timber, high nave and enclosed crypt response |

Each definition requires its own footprint, connected graph, storeys, furniture,
fixtures, soundscape, spawn/path sockets and clear van approach. Do not ship a
catalog unlock until its definition and runtime geometry are present.

## Verification gates

1. Compile Java 17 sources and run relevant existing checks; distinguish obsolete
   flat-map expectations from actual regressions without suppressing failures.
2. Check each room spawn, all portal approaches, all stair ascent/descent routes,
   floor voids, capsule headroom, wall/prop collision and door occupancy. Closed
   doors block; opened doors permit passage; upper and lower rooms never overlap
   in room detection or interactions.
3. Check each circuit against its own switch and ceiling fixtures, breaker reach,
   every acoustic edge/closed-door loss, all evidence/ritual/hiding sockets and
   hunter/van entry and extraction routes.
4. Render actual runtime views of exterior, principal rooms, stair transitions,
   upper floor and basement. Inspect native materials, furniture scale, mounting,
   floating parts, missing faces, door apertures and light readability. Keep the
   previews available to the user.
5. Confirm network elevation and door/circuit snapshots agree between host/client.
   Package runtime meshes/textures and verify resources from the packaged classes.
6. Reconcile concurrent main changes, commit only this task, push and verify the
   remote commit. Report any remaining incomplete criteria explicitly.

## Architectural reference method

These are original fictional game locations informed by real architecture, not
claims of exact reconstructions. HABS drawing dimensions inform scale and floor
organization; photographs inform joinery, window/door rhythm and fixture context.
Keep reference imagery outside the shipped runtime. Source access and observations
are recorded in `ARCHITECTURAL_REFERENCES.md`; unavailable pages are not represented
as visually inspected. Imported source attribution and unchanged file hashes are
in `source-meshes.json` and `source-textures.json`.
