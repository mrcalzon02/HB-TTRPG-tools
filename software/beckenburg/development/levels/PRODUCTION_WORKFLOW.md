# Repeatable authored-level workflow

The current order is House → Farmhouse → School. Mansion, Prison, Asylum, Academy, College and Church stay in production and locked. Reusing a parameterized cross-wing layout does not complete those six locations.

## 1. Establish the building before the asset list

Read the original board and record the actual architectural identity. Consult a primary architectural reference and record the URL, drawing/photo identity, inspected material and inspection limitations in `ARCHITECTURAL_REFERENCES.md`. Draw an original measured room plan with uses, storeys, external access and structural intent. Never treat image-generated plan numbering as geometry.

`LevelPlans.java` is the metre-based source of truth. Its 15 ordered IDs retain the protocol contract: 12 meaningful indoor zones, rear/exterior 12, approach 13 and van 14. Extra architectural spaces belong in the same authored volume only when they genuinely share circulation and semantics; do not rename identical rectangles to claim a new building. Outside ground may underlie an interior footprint, but indoor room ownership takes precedence and the renderer must avoid duplicate coplanar floors.

## 2. Make all three dimensions buildable

Record standing-surface Y separately from eye height. Every boundary opening must lie on both intended room boundaries. A door opening, glazed window and graph-only stair edge have different portal kinds. Every window is a physical aperture with a sill and frame; it does not automatically become a walk-through door.

Stairs require lower/upper room IDs, exact endpoints, continuous supporting ramp, measured treads, head clearance, a matching upper deck void and a cut in any lower ceiling that would otherwise intersect the flight. Separate stacked flights laterally where shared footprints would make direction ambiguous. Test entry and exit at both ends, not only points in the middle of a ramp.

Use a physical wall section: the nominal partition centre has an 80mm interior offset on each side. Adjacent rooms never paint two finishes on the same plane. Timber panels replace the corresponding plaster band; do not overlay a complete plaster wall with a second complete panel face. Project trim visibly from the surface. Project wall sockets and supported flat props onto the finished face, not the nominal centreline.

Split decks at exact aperture bounds, including non-integer coordinates; centre-testing metre tiles leaves false floor strips across stair openings. Clip the last tread to the opening so it cannot overlap the landing. Derive three-sided landing guards from the same void, leave the upper stair end open, and include those guards in collision. Render the stair from below and above before accepting it. Do not use a passing path graph as evidence of a safe or convincing stairwell.

## 3. Reuse real meshes without changing their identity

Select actual source GLBs from the owner archive. Record source name/hash, source axis, native bounds, pivot, material/UV images and the intended physical use. Keep original archives read-only. Import only the used subset into runtime assets. `development/assets/rebuild_support.py` may import and uniformly scale loose props; its centre/floor normalization must not be used blindly for hinges, architectural bays or ceiling/wall fixtures.

Do not stretch a chair, radio, cabinet or wall into another object. Author a missing fitting explicitly after checking the library; identify it as authored geometry. Preserve original UVs and texture character. Source-preserving reduction is acceptable when a genuinely suitable source exceeds the measured runtime budget.

Measured examples:

| Source | Native bounds or dimensions | Placement consequence |
|---|---|---|
| `sofa_1` | X ±1.3m, Y0–1.16m, Z−.005–1.0m | Origin is at the back; collision centre is local Z+.4975m. |
| `armchair_1` | X ±.747m, Y0–1.067m, Z0–.99m | Collision centre is local Z+.495m. Rotate this offset with the source. |
| `tv_table_1_4` | 1.64m wide, .74m high, Z−.32–.22m | At uniform .8 scale the supported surface is Y+.592m. |
| `dinner_table_1` | 1.7 × .86 high × 1.1m | Book and dish origins sit just above Y+.86m. |
| `shelf_mp_6` | .82 × 1.29 high × .22m | Use a shallow wall-adjacent footprint; it is not a 2m-wide bookcase. |
| `bed_4` | approx 2.74 × .962 high × 2.29m | Uniform .82 scale gives a .789m maximum headboard height; the mattress is around native Y.65m and the quilt is authored at Y.67m. |
| `door_1_loose` | Leaf approximately X−1..0m, 2.1m high | Keep the hinge origin. Do not centre a swinging leaf. |
| `window_*_single` | Complete nominal 4m × 3m wall bay | It is not a small standalone window insert. |
| `ceiling_lamp_*` | Native top mounting plane Y0, mesh below | Mount at the ceiling; floor normalization would make it hang incorrectly. |

Runtime yaw uses X′=cos(yaw)X−sin(yaw)Z and Z′=sin(yaw)X+cos(yaw)Z. Local positive-Z source offsets therefore move world X by minus sin(yaw). Source mesh origins stay intact; authoritative colliders use the transformed actual centre. Flat wall props have explicit wall support and facing. A table-supported object follows its table if clearance authoring relocates that table.

## 4. Furnish for use and circulation

Keep furniture out of doorway approaches, stair head volumes, floor voids and spawn pads. `clearCirculation()` checks these clearances deterministically and retains uniform source scale. Inspect the final placements; an automatic clear position is not by itself a convincing furnished composition. Keep seating, hearth, table and wall decoration in understandable groups. Rugs are thin surfaces. Pictures and switches mount flush to real walls; books, dishes and photos have actual supporting furniture. A kitchen counter is a fitted appliance/cabinet asset, not a recoloured box presented as a library source.

Switch sockets use approximately floor+1.2m and require a real reachable operating position with an unobstructed aim ray. Breakers mount on service-room walls. Ceiling and porch fixtures use the corresponding mount plane and source orientation. Choose domestic fixtures for household rooms, utility fixtures for barn, shed, cellar and boiler rooms. Evidence inspection sockets currently sit just above supported floors; never leave a generic .82m-high socket floating without a table.

## 5. Verify the actual authored scene

Compile the integrated Java sources and run the targeted architecture checks. `AuthoredLevelPhysicsTest` checks physical door closure/opening and continuous ascent/descent. Real swept navigation must start at the van and reach every room and required socket; graph connectivity alone is insufficient. `AuthoredUtilitiesTest` checks actual wall mounting and operating positions. Multiplayer checks must reproduce floor selection and door/window state from host data.

Then render actual first-person views from the runtime renderer: approach, entry, each floor, living/family room, kitchen, bathroom/wash facilities, cellar, stairs looking both ways, rear exit and every outbuilding. Inspect native material appearance, collision/visual agreement, ceilings, aperture framing, fixture backs, wall normals, floor support and readable low-light silhouettes. Render images are evidence of geometry; they do not by themselves establish native Windows interactive acceptance or performance.

`LevelSurfaceIntegrityTest` checks generated wall faces for conflicting coplanar materials, exact deck area and aperture cuts, distinct wall/floor materials, and physical/rendered landing guards. The check caught a farmhouse frame crossing the child-bedroom corner and prompted a real doorway relocation. `LevelVisualCapture` disables CRT/grain effects in its own process without saving preferences, making texture joins easier to inspect.

After packaging, export each site with `LevelSceneSource` and rebuild its editable scene using `build_scene.py`. These sources contain the runtime triangles and original UVs, rather than a separately maintained show model. Rebuild the review gallery with `build_review.py`; every gallery image is an actual runtime capture, with Blender overviews identified separately.

After fixes, repeat only the checks affected by the changes. Keep new map unlocks behind completed distinctive geometry and these checks. Record remaining missing fittings, visual problems and external-reference limitations explicitly; never substitute a passing count or renamed template for a completed level.

## 6. Dress, age and publish reusable original libraries

Independent pickup objects follow the detailed [loose-object production recipe](LOOSE_OBJECTS_WORKFLOW.md), including native dimensions, supported scatter, physical simulation, networking privacy, examination controls and gated checkpoints. Fixed decorative kits and movable objects have different contracts; record which one is being authored.

Activated phones, alarms, radios and filling sinks follow the [event-fixture production recipe](EVENT_FIXTURES_WORKFLOW.md). Reserve switches before placing support tables, fix all anchors at map creation, and test access with every potential cupboard present. Preserve separate engine-authoritative activation and ordinary player use. The original event asset archive includes models, clean/worn textures, synthesized WAVs and portable activation examples.

Record a room-specific clutter plan before building. Measure actual source bounds before placing cabinets or small objects. Reserve cupboard interiors and entrances before furniture; reserve door/stair approaches, spawns and windows. Place major furniture first, then supported small groups. The school plant is measured from the room's southwest corner: retired plant at Z16.5, oil plant at Z23, modern plant at Z32.5, with the service assembly origin at X10/Y−3/Z12. Never add one giant collision box around a network of overhead pipes.

`build_lived_assets.py` creates the original clean CC0 models, editable sources and actual mesh previews. Once approved, keep clean sources intact. `build_worn_assets.py` opens those sources and saves separate `_worn` meshes and Blender files, replacing only procedural diffuse pixels and roughness. `validate_worn_assets.py` checks the original clean GLB/Blender/preview hashes and exact clean/worn vertex, normal, UV, index and transform equality. Inspect the aged skins in rooms; a studio render alone cannot show whether the surface fits the world. `build_wear_review.py` creates a labeled comparison from the actual renders.

The runtime chooses aged skins only after support/collision placement is finished. `LevelClosets` supplies the same deterministic availability, hollow collision and physical interior test to solo and LAN play. Capture 0% and 100% availability from the same camera. Rebuild the three complete Blender scenes with all potential cupboards present for authoring; runtime availability remains difficulty-controlled.

Build native public libraries with `build_public_libraries.py`, then run `publish_libraries.py`, `validate_public_libraries.py`, and Blender's `validate_blender_libraries.py`. These package only the original authored families, in both clean/worn variants, with embedded previews, Asset Browser tags, individual GLBs/editable sources and library ZIPs. Preserve separate licensing for purchased/source-pack scenery. Commit/push, wait for the active Pages deployment, and run `verify_live_libraries.py --published-commit <asset checkpoint SHA>` to read back every individual GLB, event sound/data extra and all library ZIPs. Commit its actual download-hash record, rather than treating a source upload as confirmed website delivery.

After every final scene export, run Blender with `validate_level_scenes.py`. It reopens each saved delivery, compares architecture triangle counts and independently editable loose-object/fixture IDs, transforms and collision metadata against runtime exports, and verifies packed diffuse textures. Run `record_verification.py` only after this report and the final captures are current; scene hashes must match before the delivery manifest can be recorded.

Van size, layout, source-screen alignment and actual inventory quantities follow [the van refit workflow](VAN_REFIT_WORKFLOW.md). Native-size physical stock replaces catalog decorations; the deck, loading ramp, six local spawn pads and every station require swept movement checks.
