# Level revision verification — 2026-10-20

The lived-in dressing, physical hiding cupboards and clean/worn asset revision passes 15 focused level checks and 27 affected compatibility checks against the integrated Java 17 package. Actual outputs are preserved under `verification/`. Runtime views were visually inspected after rebuilding; the gallery contains 48 original game-camera captures with CRT/grain effects disabled for inspection only.

## Current asset and dressing delivery

- The school plant contains three retired riveted coal boilers at the back, two later oil-fired sectional boilers and three modern condensing units toward the front. Flues, separated retired steam lines and paired active headers, circulation pumps, expansion vessel, suspended ventilation, electrical switchgear, coal/ash handling, service workbench and spares use measured room coordinates. Stair and breaker approaches remain usable.
- House and farm have room-specific furniture and supported belongings: inherited displays, sideboards, card-table corner, ottoman, trunk, linens, toys, pantry and root-cellar stores, barn/workshop furniture and native source cabinets. The room placement helper retains wall support, source bounds, windows and door/stair clearance.
- Eighteen walk-in cupboards are scattered across the three sites (house 5, farm 7, school 6). Their actual geometry and hollow collision follow the same deterministic hiding-density setting. A 0% cupboard disappears completely; 100% makes all potential cupboards present. Hiding requires physically entering the correct-floor interior. Solo movement exposes the player; LAN host/client and ghost views share presence without disclosing hunter hiding state.
- Twenty-one original asset families have two separate diffuse-texture versions, 42 GLBs total. The clean GLBs, Blender files and previews are preserved byte-for-byte. Worn models keep exactly the same vertices, normals, UVs, index buffers and pivots; every diffuse image is changed. Runtime uses the worn set. The texture pass reduces saturation and adds soft ingrained dirt, fine chips, oxidation, water tracks, faded cloth, handled timber and foxed paper. Oversized binary noise patches were removed after inspecting them in rooms. `verification/worn-assets-results.json` records actual family-by-family verification.
- Three original CC0 libraries provide individual GLBs, editable Blender sources, real preview renders and native Blender Asset Browser libraries, in clean and worn versions. Every entry, model metadata, native asset and ZIP license explicitly states CC0 1.0 Universal. The 27 unchanged archive props used as additional game scenery retain their separate source licensing and are excluded from these CC0 downloads. Public-file, embedded-image, ZIP/hash, local-link and native embedded-preview validators were run against the generated libraries.
- Editable complete levels show all potential cupboards for authoring (100%); runtime still follows the selected contract. Their geometry comes directly from the runtime export, including the worn materials. The clean/worn comparison uses actual Blender model renders with identical studio lighting.


Live publication was read back at 2026-10-20T19:09:40.101340+00:00: the public CC0 page, all three manifests/licenses, all 42 individual GLBs and all three ZIPs matched the validated local publication. Actual downloaded-byte SHA-256 values are preserved in `verification/live-libraries-results.json`. The published asset checkpoint is `df31bff5829a6bc8e3ee9d158570ce2e138d1fae`.

## Retained architectural corrections

- Opposing rooms previously shared a wall plane; full plaster faces also remained behind lower timber panels. Walls now have 160mm sections and mutually exclusive finish bands. Frames are authored once per opening. A farmhouse bedroom door was moved away from its wall corner after the surface check caught a frame overlap.
- Floor/ceiling tiles previously clipped stair holes by tile centres. Exact aperture edges now split both decks, and the last tread stops at the landing. Both flights have handrails; deck openings have three-sided guards with matching collision. The house basement flight moved 300mm to preserve its doorway approach.
- Kitchen/bath/corridor walls use glazed wall tiles, distinct from floor tiles. Plain plaster has no baked timber trim. Adjoining low roof eaves stop before taller rooms; the gym no longer shows an intruding roof edge or hall material.
- Switches, breakers and wall props mount against finished wall faces. Source furniture pivots and original UVs are retained. Generic decorative books use `book_mp_2`, avoiding the Tier I investigation book.
- The van safe zone is its current narrowed cargo interior. The arrival street stays exterior, supported ground. Frenzy seals operate at the actual cargo threshold. The online runner's current van, street architecture and checksum-pinned original GGBot textures are integrated.
- Original mesh front faces, mouse movement, strafe and spatial sound now use one camera orientation. Stereo/coarse sound direction is checked against screen position.

## Verified scope and limits

House has a ground-floor room loop, private upper floor and cellar. Farm has a separate house, barn, hayloft and tool shed. School has classrooms, upper circulation/library/assembly space, nurse/cafeteria wings, a tall gym and service cellar. Shared authored coordinates drive geometry, swept navigation, spawns, doors/windows, circuits, acoustics and interaction sockets. The three editable `.blend` files are rebuilt from runtime triangles, not separate presentation models. Their revisions and hashes are in `delivery-manifest.json`.

These checks establish the reported geometry and gameplay contracts; they do not establish a completed native interactive Windows playthrough or a clean game-wide release gate. The new room dressing has been inspected in actual renderer captures, but further art review and native performance review remain appropriate. At 960×600 with inspection effects disabled, warm software-renderer captures took roughly 130–350ms per view on this machine, with slower first-frame asset loading; these are inspection timings, not a target-resolution interactive frame-rate claim. Mansion, Prison, Asylum, Academy, College and Church remain locked development layouts. The current van's further work remains coordinated with the online runner.

## Broader regression audit

The last complete sweep, before final fixture/schema migrations and the latest van integration, passed 103/155 checks. Of its 52 failures, 20 have subsequently been rechecked and now pass. The remaining 32 failed in that sweep and have not been rerun after the final changes; 32 of them also failed on baseline `b89e3bbc`. This is an audit trail, not a claim that the complete suite is green. The raw baseline comparison includes outputs and source hashes.

Fixtures were migrated from old flat-map coordinates to authored XYZ positions; packet expectations now include map revisions/elevation. Public door state supports both player cameras; private hunter bodies, maps and journal state remain rejected by ghost privacy checks. Rack aiming is tested from an actual reachable operating position rather than beyond pickup range. No collision or privacy gate was disabled to pass these checks.

## Current focused and compatibility results

| Check | Result | Time |
|---|---|---|
| AuthoredLevelPhysicsTest | pass | 0.328s |
| AuthoredLevelReachabilityTest | pass | 7.016s |
| AuthoredLevelStateTest | pass | 0.265s |
| AuthoredLevelNetworkTest | pass | 3.704s |
| AuthoredLevelRitualCaseTest | pass | 0.218s |
| WorldViewHandednessTest | pass | 0.188s |
| MouseLookTest | pass | 1.203s |
| AuthoredUtilitiesTest | pass | 0.297s |
| SoloElevationTest | pass | 0.265s |
| EquipmentAssetAssignmentsTest | pass | 0.141s |
| EquipmentModelCatalogTest | pass | 1.500s |
| PackagedSourceModelsTest | pass | 2.672s |
| LevelRenderAcceptanceTest | pass | 4.766s |
| LevelSurfaceIntegrityTest | pass | 0.734s |
| LivedLevelDressingTest | pass | 1.219s |
| HorrorAudioRoutingTest | pass | 0.188s |
| InvestigationSitesTest | pass | 0.984s |
| ArchitecturalPlansTest | pass | 0.281s |
| VictorianHouseArchitectureTest | pass | 1.594s |
| GrandSiteGeometryTest | pass | 0.250s |
| LanSiteSelectionIntegrationTest | pass | 0.360s |
| SoloEnvironmentalEvidenceTest | pass | 0.265s |
| LanClientDisconnectTest | pass | 0.610s |
| LanGracefulLeaveTest | pass | 0.125s |
| LanWorldRenderTest | pass | 1.656s |
| LanSoundTest | pass | 0.187s |
| LanGhostHearingTest | pass | 0.203s |
| VanStagingTest | pass | 1.063s |
| VanArrivalStreetTest | pass | 0.343s |
| VanStreetAndCabinProportionsTest | pass | 0.219s |
| VanModuleIntegrationTest | pass | 0.703s |
| VanNavigationVisualTest | pass | 0.360s |
| GameplaySmokeTest | pass | 1.203s |
| LanAcousticsTest | pass | 0.187s |
| LanApparitionTest | pass | 0.188s |
| LanGhostIdentityTest | pass | 0.375s |
| LanGhostIntegrationTest | pass | 0.781s |
| LanSpatialCombatTest | pass | 0.219s |
| LanSpatialEvidenceTest | pass | 0.234s |
| LanWorldIntegrationTest | pass | 0.953s |
| LanWorldTest | pass | 0.203s |
| VanHidingTest | pass | 0.187s |

## Unresolved broader-suite failures

- AdditionalEvidenceTest — failed on the pre-level baseline too.
- AncientGhostVariantsTest — failed on the pre-level baseline too.
- CastleHubIntegrationTest — failed on the pre-level baseline too.
- EmfSilenceTest — failed on the pre-level baseline too.
- EquipmentSightTest — failed on the pre-level baseline too.
- EquipmentStoreDescriptionsTest — failed on the pre-level baseline too.
- FieldJournalTest — failed on the pre-level baseline too.
- GhostDomainTest — failed on the pre-level baseline too.
- HardEvidenceQuotaTest — failed on the pre-level baseline too.
- HunterCountersTest — failed on the pre-level baseline too.
- LanApparitionIntegrationTest — failed on the pre-level baseline too.
- LanCaseFileIntegrationTest — failed on the pre-level baseline too.
- LanCaseIntegrationTest — failed on the pre-level baseline too.
- LanChatIntegrationTest — failed on the pre-level baseline too.
- LanDotsProjectorsTest — failed on the pre-level baseline too.
- LanFieldEquipmentIntegrationTest — failed on the pre-level baseline too.
- LanGhostAnimationIntegrationTest — failed on the pre-level baseline too.
- LanGhostLegacyHearingIntegrationTest — failed on the pre-level baseline too.
- LanGhostPursuitTest — failed on the pre-level baseline too.
- LanGhostTakeoverIntegrationTest — failed on the pre-level baseline too.
- LanGuestDepartureIntegrationTest — failed on the pre-level baseline too.
- LanLobbyTest — failed on the pre-level baseline too.
- LanRiteNetworkTest — failed on the pre-level baseline too.
- LanRitualDefenseIntegrationTest — failed on the pre-level baseline too.
- LanSessionResumeIntegrationTest — failed on the pre-level baseline too.
- LanSixHunterVanTest — failed on the pre-level baseline too.
- LanSoundIntegrationTest — failed on the pre-level baseline too.
- LanSpatialEvidenceIntegrationTest — failed on the pre-level baseline too.
- LanTelegraphedStrikeIntegrationTest — failed on the pre-level baseline too.
- LanVoiceHostIntegrationTest — failed on the pre-level baseline too.
- ManualEvidenceHudTest — failed on the pre-level baseline too.
- ManualEvidenceJournalTest — failed on the pre-level baseline too.

## Repeat

Use `verify_levels.py --java-home <JDK17> --vehicle-archive <original August2023 GGBot ZIP>`, then `verify_compatibility.py --java-home <JDK17>`. Both use the isolated ignored `build/level-release` package. `--full-regression` runs the historical gate as well. Use `LevelVisualCapture`, `LevelDressingCapture`, `LevelSceneSource`, `build_scene.py`, `build_wear_review.py`, `build_review.py`, then this script to regenerate the review artifacts and record actual outputs. `validate_worn_assets.py` and both public-library validators read the final asset files. The final softening pass changed only diffuse image pixels; the already-passing gameplay/geometry package was refreshed for final captures. No test binary is published with these source commits.
