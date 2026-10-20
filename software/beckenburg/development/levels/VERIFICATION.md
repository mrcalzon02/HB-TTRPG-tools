# Level revision verification — 2026-10-20

The wall/stair revision passes 14 focused level checks and 27 affected compatibility checks against the integrated Java 17 package. Actual outputs are preserved under `verification/`. Runtime views were visually inspected after rebuilding; the gallery contains 36 original game-camera captures with CRT/grain effects disabled for inspection only.

## Corrected defects

- Opposing rooms previously shared a wall plane; full plaster faces also remained behind lower timber panels. Walls now have 160mm sections and mutually exclusive finish bands. Frames are authored once per opening. A farmhouse bedroom door was moved away from its wall corner after the surface check caught a frame overlap.
- Floor/ceiling tiles previously clipped stair holes by tile centres. Exact aperture edges now split both decks, and the last tread stops at the landing. Both flights have handrails; deck openings have three-sided guards with matching collision. The house basement flight moved 300mm to preserve its doorway approach.
- Kitchen/bath/corridor walls use glazed wall tiles, distinct from floor tiles. Plain plaster has no baked timber trim. Adjoining low roof eaves stop before taller rooms; the gym no longer shows an intruding roof edge or hall material.
- Switches, breakers and wall props mount against finished wall faces. Source furniture pivots and original UVs are retained. Generic decorative books use `book_mp_2`, avoiding the Tier I investigation book.
- The van safe zone is its current narrowed cargo interior. The arrival street stays exterior, supported ground. Frenzy seals operate at the actual cargo threshold. The online runner's current van, street architecture and checksum-pinned original GGBot textures are integrated.
- Original mesh front faces, mouse movement, strafe and spatial sound now use one camera orientation. Stereo/coarse sound direction is checked against screen position.

## Verified scope and limits

House has a ground-floor room loop, private upper floor and cellar. Farm has a separate house, barn, hayloft and tool shed. School has classrooms, upper circulation/library/assembly space, nurse/cafeteria wings, a tall gym and service cellar. Shared authored coordinates drive geometry, swept navigation, spawns, doors/windows, circuits, acoustics and interaction sockets. The three editable `.blend` files are rebuilt from runtime triangles, not separate presentation models. Their revisions and hashes are in `delivery-manifest.json`.

These checks establish the reported geometry and gameplay contracts; they do not establish a completed native interactive Windows playthrough or a clean game-wide release gate. Farm/school exterior detailing and room-specific dressing still need further art review. Mansion, Prison, Asylum, Academy, College and Church remain locked development layouts. The current van's further work remains coordinated with the online runner.

## Broader regression audit

The last complete sweep, before final fixture/schema migrations and the latest van integration, passed 103/155 checks. Of its 52 failures, 20 have subsequently been rechecked and now pass. The remaining 32 failed in that sweep and have not been rerun after the final changes; 32 of them also failed on baseline `b89e3bbc`. This is an audit trail, not a claim that the complete suite is green. The raw baseline comparison includes outputs and source hashes.

Fixtures were migrated from old flat-map coordinates to authored XYZ positions; packet expectations now include map revisions/elevation. Public door state supports both player cameras; private hunter bodies, maps and journal state remain rejected by ghost privacy checks. Rack aiming is tested from an actual reachable operating position rather than beyond pickup range. No collision or privacy gate was disabled to pass these checks.

## Current focused and compatibility results

| Check | Result | Time |
|---|---|---|
| AuthoredLevelPhysicsTest | pass | 0.250s |
| AuthoredLevelReachabilityTest | pass | 4.937s |
| AuthoredLevelStateTest | pass | 0.219s |
| AuthoredLevelNetworkTest | pass | 3.656s |
| AuthoredLevelRitualCaseTest | pass | 0.188s |
| WorldViewHandednessTest | pass | 0.172s |
| MouseLookTest | pass | 1.218s |
| AuthoredUtilitiesTest | pass | 0.266s |
| SoloElevationTest | pass | 0.250s |
| EquipmentAssetAssignmentsTest | pass | 0.125s |
| EquipmentModelCatalogTest | pass | 1.344s |
| PackagedSourceModelsTest | pass | 2.078s |
| LevelRenderAcceptanceTest | pass | 3.562s |
| LevelSurfaceIntegrityTest | pass | 0.703s |
| HorrorAudioRoutingTest | pass | 0.156s |
| InvestigationSitesTest | pass | 0.640s |
| ArchitecturalPlansTest | pass | 0.219s |
| VictorianHouseArchitectureTest | pass | 1.250s |
| GrandSiteGeometryTest | pass | 0.203s |
| LanSiteSelectionIntegrationTest | pass | 0.328s |
| SoloEnvironmentalEvidenceTest | pass | 0.219s |
| LanClientDisconnectTest | pass | 0.610s |
| LanGracefulLeaveTest | pass | 0.109s |
| LanWorldRenderTest | pass | 1.297s |
| LanSoundTest | pass | 0.172s |
| LanGhostHearingTest | pass | 0.156s |
| VanStagingTest | pass | 0.891s |
| VanArrivalStreetTest | pass | 0.312s |
| VanStreetAndCabinProportionsTest | pass | 0.156s |
| VanModuleIntegrationTest | pass | 0.578s |
| VanNavigationVisualTest | pass | 0.297s |
| GameplaySmokeTest | pass | 0.922s |
| LanAcousticsTest | pass | 0.156s |
| LanApparitionTest | pass | 0.156s |
| LanGhostIdentityTest | pass | 0.266s |
| LanGhostIntegrationTest | pass | 0.750s |
| LanSpatialCombatTest | pass | 0.172s |
| LanSpatialEvidenceTest | pass | 0.187s |
| LanWorldIntegrationTest | pass | 0.891s |
| LanWorldTest | pass | 0.187s |
| VanHidingTest | pass | 0.172s |

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

Use `verify_levels.py --java-home <JDK17> --vehicle-archive <original August2023 GGBot ZIP>`, then `verify_compatibility.py --java-home <JDK17>`. Both use the isolated ignored `build/level-release` package. `--full-regression` runs the historical gate as well. Use `LevelVisualCapture`, `LevelSceneSource`, `build_scene.py`, `build_review.py`, then this script to regenerate the review artifacts and record actual outputs. No test binary is published with these source commits.
