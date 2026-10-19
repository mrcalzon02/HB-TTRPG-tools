# Beckenburg — physical equipment asset integration, October 18 2026

**Source of truth:** owner-provided [PSX Mega Pack expanded source](https://drive.google.com/drive/folders/1a_Shb7jPYuD38gBXrHS2bSlQV-gSiTLr) and [Classic64 archive](https://drive.google.com/file/d/1-NoqEBe79Hax4WDpCEyADEHl6JgkErnk/view). PSX pack was purchased for commercial in-game use, with one owner-confirmed licence covering all of its elements. The full purchased archive stays on Drive; **only twelve selected working GLB sources have been committed to the project**, not the entire pack. Do not relabel generic placeholder art as these assets.

The real GLBs are committed under `software/beckenburg/assets/runtime/models/`, present in `GlbProps`' bounded source allowlist, and copied into both Windows and Unix builds. Source binary data was read back from GitHub, including its blob SHA. The listed SHA-256 hashes are of original downloaded Drive file bytes, verified via binary inspection. No fake preview images were substituted.

| Owner source GLB | SHA-256 prefix | Actual planned/connected use | Source/renderer status |
|---|---|---|---|
| `vape_mp_1.glb` | `fea628ab07a43988` | Tier I D.O.T.S. projector chassis and deployed in-room emitter | Packaged and in scene; event-driven host projector code |
| `dosimeter_1.glb` | `40d70b2723153fa1` | Tier I EMF reader | Packaged, held device renderer and van rack |
| `dosimeter_2.glb` | `e284911ff0d03a9` | Tier II EMF reader | Packaged and held renderer |
| `dosimeter_4.glb` | `e4cbe5842520c7a9` | Tier III EMF reader | Packaged and held renderer |
| `walkie_talkie_1.glb` | `292145f3edd230ba` | Tier I spirit box | Packaged, held renderer; actual vocal event scan |
| `walkie_talkie_2.glb` | `cd8b549f7209f975` | Upgraded spirit box, with improved readout/response | Packaged, held renderer and van |
| `handheld_tablet_1.glb` | `079192aed33c5f15` | Multi-purpose numerical thermometer/advanced sensor shell | Packaged, held renderer and van |
| `monitoring_screen_mp_1.glb` | `5027390e7d005b5a` | Van monitoring system, separately authored display component | Packaged and visible in van; **live display UV texture still outstanding** |
| `pc_mp_1.glb` | `ff42beeb03ed78db` | Van command/sensor computer | Packaged and visible; **interactive monitor surface still outstanding** |
| `button_12.glb` | `5b1b74c3c82f9aea` | Van door actuator | Packaged and positioned at real physical button; E action toggles host-owned door collision |
| `book_mp_1.glb` | `77d525437c8a825c` | Closed, carried/van writing book | Packaged and rendered |
| `open_book_mp_1.glb` | `1b7199f26c1313f6` | Placed/open writing book | Packaged and rendered in deployed room; **authored page decals still outstanding** |

There is no `dosimeter_3.glb` in the **complete 146-file** Items & Weapons folder inventory; 1, 2 and 4 are the three real source variants. Do not create an imaginary variant 3 or describe it as inspected. `handheld_tablet_1` is a reusable model *body*, not multiple separate licensed assets.

## Working-tier inventory and interaction contract

`FieldEquipment.java`, `LanHost.java`, `LanClient.java` and `LanWorldPanel.java` connect a four-slot hunter loadout to the authoritative van equipment rack. The six currently enabled equipment IDs are **EMF_READER, THERMOMETER, SPIRIT_BOX, UV_LIGHT, GHOST_WRITING_BOOK and DOTS_PROJECTOR**. All six have Tier I–III states from `EquipmentTiers`. The source tier affects detection radius, refresh interval, display presentation and proposed pricing where applicable. Purchases share the same host-owned balance as medical supplies; Tier III cannot be purchased before Tier II; equipment changes are restricted to the physical rack. These are **source-level gameplay features** requiring compile and multiplayer smoke-test acceptance. The other 36 catalog items are not allowed through the functional equipment store until a backend exists.

The held EMF reader uses three distinct verified GLBs. Spirit box upgrades use both verified radio shells. The tablet is the current digital thermometer chassis. The physical writing book switches between the closed model while carried and open model when placed in a room. UV still has an illustrated foreground body until a suitable owner-supplied mesh is selected. Additional tier-specific hardware shells, charge and battery systems and truly dynamic UV/text/page materials are not yet finished.

**D.O.T.S. is not just a shell:** `LanDotsProjectors` validates a hunter's in-room position, placement/retrieval, projector range and tier; `SceneRenderer` emits a sparse floor light grid from the actual placed model. Only a real, host-authorized, species-compatible **MANIFEST** or **SIGNATURE** event inside that field generates a PASS; ordinary empty projections are not ghost evidence. Genuine PASS records enter the normal automatic casefile. Player checklist entries still require manual ticking. The projected ghost trace uses its actual host-owned position, not a guessed hotspot.

**Van door:** `button_12` is positioned beside the cargo opening. Interacting with it using E sends `VANDOOR` to the server, checks actual distance, updates shared door state and applies/clears physical cargo collision. Closing the door is rejected if the new collision surface would overlap a hunter. Each hunter sees the synchronized door state, including on reentering the world view.

## Classic64 scan

The original owner-supplied `- Classic 64 Asset Pack 0.6.zip` was opened for an archive-only inventory: **937 archive entries, 130 .blend models, 383 PNGs and 349 JPEGs**. Relevant models include electrical junction boxes, electrical amp/control panels, thermostat and heater panels, electrical open/closed panels, warehouse shelves, filing and log papers, a rolling tool chest, protective railing, generators and varied books. Most of this pack is **.blend, not .glb**, and Blender conversion is unavailable in this execution runtime. These are **verified available assets**, not automatically Java-ready. Curate and convert only appropriate meshes with their embedded/associated original textures, and add their source hashes plus headless renderer test before claiming in-game use.

## Acceptance and regression gates

Two additional tests have been registered in both `build.sh` and `build.cmd`: `ImportedEquipmentModelsTest` (12 real meshes, visible raster output and actual tier variant selection) and `VanCargoDoorTest` (door button reach, rotated installations, real movement collision and rendered shutter). `LanDotsProjectorsTest` checks genuine ghost-only projection and retrieval. `FieldEquipmentTest` and `LanFieldEquipmentIntegrationTest` cover tier ownership, purchases, shared wallet, slot use, instrument measurement/logbook, and ghost-seat privacy. All live new readings are observations only; no false paranormal indications, no automatic proof, no journal auto-tick.

**Read-back of committed source and binary blobs succeeded. Fresh Java compilation, execution of tests on a clean checkout, Windows graphic inspection, UV authoring, full multiplayer acceptance and a release build are still unverified.** Do not mark all 42 items complete: the other 36 need real event producers, model/display work, interactions, stock, replication and tests before the equipment expansion or doubling ghost roster becomes a production stage.
