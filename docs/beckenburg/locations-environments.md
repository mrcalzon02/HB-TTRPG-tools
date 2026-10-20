# The Beckenburg Project — 3D Environment, Sites and Zone Authoring
Status: design. The nine site categories are a location roadmap, **not nine shipped maps**.

## Site graph and zone data contract
Every authored site has stable map ID/version, metadata (era, climate, occupancy history), exterior staging/insertion/extraction points, world origin and measured scale, one or more floors, room polygons or volumes, vertical connectors, door/threshold links, traversal graph, spectral shortcuts, breaker/electrical circuits, lighting/heat/ventilation controls, physics prop groups, sound occlusion volumes, ritual anchor sockets and narrative clues. A ZoneRecord includes id, display name, floor, bounds, parent region, tags, adjacency, doors/portals, safe/unsafe spawn sets, eligible evidence emitters, local ambience, placeable surface categories, haunt affinity and validation metadata.

Room boundaries are authoritative for ghost roaming and rituals but must not cause visual pop or exploit when crossing a threshold. Rooms are not rigid square tiles: stairwells, shafts, courtyards, closets and balconies need explicit vertical logic. Ghost path graph may differ from hunter physical path but must remain constrained and legible. Every hunter should be able to verbally describe a room name that matches the map legend.

### Marked zones (minimum semantics)
Entry/Safe Staging; Public Hallway; Private Room; Utility; Basement; Attic; Cell/Containment; Religious/Consecrated; Institutional Hall; Classroom/Study; Medical/Ward; Exterior; Anchor Candidate; Ritual Eligible; Dangerous Hazard. Tags are composable. A hot zone is an emergent ghost state, not a permanent level tag. Mission map overlay and optional physical map show floor, named rooms, completed sweep markers, team pins and uncertain readings. Ghost does not automatically know hunter marker contents.

### Level creation pipeline
1. Research archetype and building function, create floor graph and room list with physical dimensions.
2. Graybox first-person routes, visibility, evacuation timing, door widths, stairs and plausible occupancy.
3. Assign semantic zones, prop sockets, breakable objects, electrical circuits, vent/temperature model and audio portal graph.
4. Place ghost anchors, possible alternate anchor candidates and fair ghost portal network; test path connectivity.
5. Place accessible ritual zones and believable clue distribution, including environmental confounders and non-ritual red herrings.
6. Create reusable architecture/prop kit (original meshes and textures), trim meshes, LOD, light bakes where compatible and collisions.
7. Test all hunter body variants, object handling, lines of sight, audio/lighting evidence and player-controlled ghost action reach.
8. Simulate ghost archetypes, events, hunt escape, co-op path capacity and network object stress; fix failures before detail polish.
9. Profile memory, draw calls, light count, GPU and physics budget; add occlusion and scene streaming only when measured.
10. Finalize environmental storytelling, readable signage, map key, accessibility markers, spawn/extraction integrity and content manifest.

## First complete reference site — Suburban house
Rooms: front approach and van staging, foyer, hallway, living room, kitchen, bathroom, master bedroom, small bedroom, basement and rear yard. At least two navigable pursuit loops, at least one retreat route, clustered but not guaranteed ghost anchor candidates. Door/prop physics interaction, breaker, heat/vent influence, initial evidence sockets, ritual-valid floor. All critical areas must be readable through physical signage, floor map and player language. No inaccessible evidence spawns.

## Site categories and mechanical identities
**Houses:** compact layouts, intimate haunt routes, ordinary object evidence and beginner pathing; different room graphs prevent identical memorized solutions.

**Mansions:** wings, vertical galleries, complex electrical districts, long sightlines, statuary, multiple anchor hypotheses and higher search burden; avoid excessive dead ends.

**Prisons:** cell blocks, gates, security rooms, echo corridors and inaccessible-but-visible zones; door-control systems must not allow permanent hunter entrapment by ghost.

**Asylums:** ward corridors, treatment rooms, seclusion spaces and medical utilities; historical sensitivity and fictional presentation without trivializing real patients or illnesses.

**Schools:** classrooms, labs, assembly areas and maintenance corridors; distinctive bell/audio systems and broad but navigable floors.

**Farmhouses:** farmhouse + barns/outbuildings, exposed exterior routes, heating variation, livestock history and wind interference; storms create measurable natural confounders.

**Academies:** esoteric studies, libraries, lecture halls and ritual-capable spaces; access by keys and optional lore puzzles.

**Colleges:** larger campus facility clusters, residence/classroom crossover, multiple departments and long-distance observations; split into manageable mission zones.

**Churches:** naves, crypts, towers, vestry, graveyard and consecration/ritual contrasts; role-sensitive but not Cleric-exclusive success.

## Proposed remote and wilderness expansion

See [Wilderness and Remote Investigation Roster](environments/WILDERNESS_AND_REMOTE_SITE_ROSTER.md) for thirteen **unimplemented** named sites, including log cabins and a logging camp, a lakeside campground, a fictional ancestral canyon cave complex, a mine, a fire lookout, isolated coastal facilities and more. Distinct histories do not prescribe ghost identity or evidence. Campaign and companion reuse is covered in [Solo Campaign, Allies and Ghost Campaign](CAMPAIGN_AND_ALLIED_INVESTIGATORS_DESIGN.md). These proposals do not displace the nine initial-release site families.

## Castle Beckenburg — headquarters and player lobby
**Canonical setting name:** **Castle Beckenburg**. The working game title, **The Beckenburg Project**, is named after this castle. Castle Beckenburg is the persistent player lobby and supernatural investigation headquarters: a relatively peaceful refuge between dangerous expeditions. Use **Castle Beckenburg** for the location in player-facing text, maps, lore and future environment work; use **The Beckenburg Project** for the game/project identity. This is a naming and worldbuilding clarification, not a claim that all castle features are implemented.

A persistent navigable medieval castle adapted with present-day expedition technology: great hall briefing, map/assignment office, equipment armory, machine and chemistry workshop, archive and ghost-lore study, chapel/sanctuary, infirmary, captured relic vault, radio/network operation room and restoration gallery. The castle visually progresses as reclaimed sites provide materials, staff and reputation. Castle interactions must not block fast mission matchmaking; players may interact with short functional menus. Host owns authoritative campaign state for LAN and exposes mission eligibility.

## 3D art and environment quality targets
A visually coherent stylized-realistic horror aesthetic with believable material age, darkness without crushed blacks, disciplined high-dynamic-range lighting, close-range prop affordances, sufficient object silhouettes in low light and sound-conductive room construction. All resource counts are performance targets chosen after S1 benchmarks, not invented budgets. Modular trims support nine categories without endless duplicate corridors. Keep geometry and collision separate when needed. Avoid costly physics on every decorative asset: classify props as static, interactable, throwable and breakable.

## Zone and map verification checklist
All rooms have unique IDs/names and valid floor; every door connects both intended zones; no unreachable hunter or ghost anchor; all key clues and ritual anchors physically accessible; no spawn inside collision or ghost trap; no world-edge gaps; consistent network transforms; no ghost move beyond allowed portal; occlusion and reverb audibly reflect doors; electrical topology references valid circuits; gameplay safe paths allow retreat; all hazards telegraph. Produce deterministic test-level package before scaling to more sites.