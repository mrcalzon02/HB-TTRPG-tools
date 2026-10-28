# The authored-environment production method

## Purpose and scope

The method turns a location concept into a coherent, playable environment through repeated construction, observation and correction. Every pass has a purpose, a source of truth, an inspection scale and a recorded exit condition. The order matters because later detail depends on earlier geometry. It is expensive to dress a room whose staircase, foundations or service circulation still need moving.

This is a distillation of a developing project, not a claim that every Beckenburg map has completed every gate. Its strongest result is a repeatable way to expose and repair defects while preserving the distinction between planning, native authoring, real runtime output and human approval. Some maps are blockouts, others have substantial native detail, and individual runtime systems have targeted verification. Those states must remain visible.

## 1. Recover context before construction

Read repository instructions, the current milestone, the latest dated handoff, the defect ledger and relevant source/export manifests. Record checkout, branch, exact revision and dirty files. Preserve concurrent work. Find the actual active checkout rather than assuming a remembered folder is current. A duplicate rebuild can erase weeks of fit-out or quietly split geometry, collision and lighting between incompatible versions.

Choose a bounded milestone with a concrete result: for example, correct the creek culvert opening and its collision, or refine the boat while preserving its placement. Record the baseline, affected systems, proposed checks and captures. Keep broader completion goals separate from this batch. If a user requests a breadth pass, advance existing maps one named stage and retain each map's open risks; do not describe a shared template as many finished locations.

The handoff is executable context: exact artifacts, commands and outcomes; what is accepted, what merely passed a diagnostic; unresolved defects; next unfinished action. Conversation history is supporting context, not the only copy of production knowledge.

## 2. Location identity and measured planning

Give each map an authored lore name and a stable machine ID. The mission selector should display the lore name; shorthand such as house or school remains an internal family. A placeholder selection image must be labeled as such until replaced by an actual roadside or van-perspective capture.

Define normal use, occupants, period, geography, access, services, architectural identity and the interruption that made the site interesting. Consult references appropriate to the place. Record the source URL, drawing or photograph identity, what was inspected and what remains uncertain. Draw an original measured plan; numbering in a generated image is not reliable geometry.

Create a map-specific asset needs list: standard furnishings, installed fixtures, utilities, unique working machinery, vegetation, clutter, narrative objects and interactive pieces. Each item needs a physical purpose, approximate dimensions, support, placement constraints and reuse/authoring decision. A sawmill needs a logway and a saw arranged to cut the moving log. A small workshop bandsaw does not acquire that purpose merely by being placed beside a log carriage.

Rough blockouts reserve relationships and route capacity. They are cheap design instruments. Do not treat colored area rectangles, a navigation graph or room names as a built environment. Preserve them as a baseline while real terrain and architecture replace their provisional affordances.

## 3. Terrain first, including interior-heavy locations

Establish units, axes, origin, height range, drainage, water level, boundaries, buildable pads and access from the canonical vehicle. Mark the playable area and off-site scenery separately. Author slopes and embedded paths rather than floating route ribbons over a flat plane. Walked paths often cut into their surroundings; beaches need sand, gravel or rock transitions rather than grass continuing into water.

Apply the **desquareify gate** after rough blocking. Remove zone-shaped pads and rectangular material stamps from the actual terrain. Shape the playable footprint into meaningful lobes, constrictions, coves and approaches. A loose rectangle with wobbly corners is still a rectangle. Straight edges need a physical reason such as a building, retaining wall or engineered road.

Use hedges, stone walls, banks, fences, fallen timber and landform to frame the site, while explicit player blockers protect water and dangerous edges. Visual boundaries and physics boundaries must agree. A berm should read as earth with varied cross-sections, believable slopes and material continuity. Repeated gravel blobs stuck to a dirt-colored vertical wall do not make a natural bank.

Unify the site and distance: foreground ground, banks, near vegetation, distant trees, haze and sky should share a controlled palette and scale. Billboard foliage can fill distant canopy gaps while existing dimensional trees remain. Near foliage needs believable density without turning every shrub into a hiding location. Far scenery should extend the world beyond the berm without implying reachable terrain.

Inspect an overhead silhouette, oblique aerial views, arrival at the actual van, standing and crouched paths, and cross-sections through steep or wet areas. Check grades, supported feet, capsule movement, foundation contact and water barriers. A nice overhead view can hide a sheer bank or an impassable route. Terrain acceptance requires both physical and visual evidence.

## 4. Architecture and service systems

Build against accepted terrain. Geometry, room ownership, collision, apertures, stairs, fixtures, acoustic zones, spawns and vehicle connection must derive from shared authored coordinates. Keep feet elevation distinct from eye elevation. A level can have a good plan and still fail vertically.

Walls, floors and roofs need physical thickness and correctly oriented visible undersides. Separate adjacent finishes rather than layering full coplanar faces. Openings must actually cut the surfaces they cross. Stairs need a continuous supporting surface, treads, head clearance, lower-ceiling clearance, an exact upper deck void and guards that leave the route open. Inspect from above, below and both landings. Graph connectivity cannot establish that a player fits through the stairwell.

Doors need correct hinge origin, mounted elevation, frame relationship, swing sweep, open/closed collision and shadow state. Do not normalize their pivots like floor-standing props. Inspect an elevated storey and multiple door states; a leaf that looks acceptable closed may vanish or detach when opened.

Plan power before decorative lamps. Place physically supported fittings, switches, cables or distribution where needed, and an operable breaker. A remote site still needs a generator and distribution plan if ghost activity can trip the electrical system. Source-running and breaker state are separate. Battery, oil and fire sources retain their own supply semantics. The vehicle has its own interior supply; a site blackout should not accidentally erase the player's working base.

Reserve routes, cupboard interiors, evidence access, ritual areas and spawn clearances before large furniture. Use actual swept movement from the vehicle to required destinations. Verify operating poses and aim rays for controls in darkness as well as light. Networked state must use the host's authoritative door, power, object and encounter data.

## 5. Supplementary models as environment engineering

Search the real source library first. For a candidate, inspect its native bounds, pivot, axis convention, material slots, normals, UVs and texture images. Record source identity and hash. Keep originals intact and make explicit derivatives. A library model's semantic purpose and visible quality form the minimum benchmark for new models around it.

Author a missing model for its job. Start with scale, silhouette and functional parts, then joint continuity, curves, thickness, supports and assembly. Organic statues need a coherent sculptural surface, not visibly disconnected primitive limbs. A boat needs an actual inner hull curve; seats and oars must fit it. A culvert needs an exposed opening through terrain, not a tube buried behind an uncut bank.

Inspect the model in isolation and in its installed setting. Check underside, back, close silhouette, normals, UV orientation, repeated textures, contact shadows and interaction distances. Keep native pivots for hinges and fixtures. Uniform scale may be appropriate; stretching unrelated furniture into machinery is not.

Only then refine surfaces: purposeful material families, local wear, dirt accumulation, joints, edges, paint variation and believable aging. Preserve clean and worn variants where reuse matters. If a wear-only pass is intended, compare vertices, normals, indices, UVs and transforms to prove geometry stayed unchanged. Do not repaint a source texture to hide an importer flip or a lighting error.

Export source assets and runtime derivatives with a manifest. Reopen the delivered files and compare their transforms, bounds, object IDs, packed textures and geometry against the authoritative export. A successful exporter invocation is insufficient if the saved scene omitted fixtures or packed the wrong images.

## 6. Placement, density and repeated refinement

Place major furniture and facilities for understandable use: seating around a hearth, storage near work, toilets and bins where a path destination needs a reason, a landmark at a terminating trail. A campground needs enough camps and support equipment to read as a campground. Repeating two tents or aligning every tent north–south makes the site feel provisional.

Add meaningful groups of small objects supported by the actual desk, shelf, mattress or ground part. Test rotated footprints, overhang and clearance, not only origin height. A bed's headboard maximum is not its sleeping surface. Recheck supported children when a parent table moves. Keep door approaches, sight lines, ritual zones and movement routes open.

Refine in loops: place a useful batch, capture it, inspect errors at the appropriate scale, fix and repeat affected checks. More clutter is not automatically more quality. Sparse sites may need vegetation and rocks, but a failed model silhouette or crude texture needs repair before another pile of props. Track quantities and purpose by zone so dressing has a reason and remaining model work is visible.

Hiding locations are gameplay resources. Decorative shrubs must not silently become hide sockets. In Beckenburg each investigation site shares the same maximum allowance, including indoor and outdoor candidates, and the highest difficulty can yield zero. Other games should encode their own rule explicitly and test it globally rather than accidentally varying difficulty by foliage density.

## 7. Runtime lighting, camera and material review

Use the actual renderer after export. Native authoring previews answer different questions. Capture arrival, entry, each floor, facilities, stairs both ways, outbuildings, water edges and changed models. Include a broad aerial view, human-height route views and close defect views. An aerial flyover should frame real site anchors and hand off to the correct player/vehicle pose without assuming every site has indoor room rectangles.

Review mains on, mains off, torch-only and independent light supplies. Test both sides of boundaries, below lofts, above ceilings, at corners and at grazing angles. A straight camera can conceal leakage. For a repair include a negative control that should be dark and a positive control that must stay lit; otherwise disabling light everywhere could appear to fix the problem. Check openings remain useful instead of plugging doors or stairs to achieve darkness.

Hold camera, time, exposure, render preset and non-target state constant for before/after images. Record which binary and assets produced each frame. If changing only a material, verify unaffected geometry and lighting stayed stable. A low-resolution art style still requires coherent texel density, UVs, palette, silhouette and material reading; arbitrary stripes and coarse primitive assemblies are not style requirements.

For animation record deterministic simulation times and multiple viewpoints. Check actual playback advances, not just that a poster exists or a file has metadata. Offline six-second output is not proof of twelve real-time frames per second. Physical performance needs a separate measured run on the claimed hardware.

## 8. Story detail, loose physics and optional encounters

After function and broad visual quality, tell the site's story through small supported traces: work interrupted, ownership, repairs, accumulated use and deliberate absences. Avoid evenly distributed random litter. Identify which items are fixed scenery, examinable objects or real pickups. A mesh does not become a loose physics object by naming it one; it needs mass, collision, ownership, authoritative state and persistence/reset rules appropriate to the game.

Author optional location-specific encounters separately. For example, looking into the dock water with a light could trigger an original mask-and-bubbles scene. Define observation cone, duration, distance, cooldown, reveal/hold/retreat phases, abort conditions, reset and witness synchronization. Do not present this design packet as an implemented feature. Keep optional scares distinct from ordinary evidence and scoring unless the design explicitly connects them. Use owned or properly licensed audio and models.

Recheck paths, supports, hiding allowance, photographs, interactions and authority after final scatter. Tiny props can obstruct a drawer or cover an evidence face. The story pass is the last construction phase, not an exemption from physical fitness.

## 9. Defect ledger and regression propagation

Every discovered issue receives an ID, affected maps/assets/systems, reproduction conditions, evidence, impact, cause if known, fix revision, status and regression obligation. Include wall/floor/roof/corner light bleed, unsupported items, interpenetration, bad UVs, detached doors, inaccessible controls and regressions introduced by fixes. Preserve history; a failed check is valuable production knowledge.

Distinguish discovered, reproduced, fixed in source, targeted checks passed, awaiting visual review and accepted. A shared helper repair does not mean all older maps were audited. Record a per-map matrix for old content. When requirements improve, use that matrix to upgrade older sites rather than silently raising their status.

Invalidate downstream evidence when inputs change. Terrain edits reopen foundations and routes; changed model bounds reopen colliders and supported clutter; lighting changes reopen blackout/material/evidence checks; a new camera path reopens flyover bounds and final pose; story scatter reopens routes and interactions. Re-run checks affected by the delta, then broaden only for real uncertainty or shared-system impact.

## 10. Close a milestone without losing its limits

Deliver sources, runtime exports, tests, labeled captures and a dated handoff together. Build the shared gallery from the real artifacts. Check local generated files, then remote commit containment, then deployed page and image hashes. These are three distinct delivery checks.

Record acceptance by scope: native geometry, runtime image, gameplay route, multiplayer authority, hardware performance, human visual approval. A map is only complete when its declared required gates pass and the appropriate reviewers accept them. Budget exhaustion, a successful build, a large asset count or an attractive presentation does not close those gates.

The next developer should be able to recover the exact baseline, understand what changed, rerun the checks and continue from one named unfinished action. That continuity is how repeated small passes accumulate into a coherent production rather than a sequence of disconnected demonstrations.
