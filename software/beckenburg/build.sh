#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
mkdir -p build
rm -rf build/classes build/test
mkdir -p build/classes build/test
javac --release 17 -encoding UTF-8 -d build/classes src/main/java/org/beckenburg/*.java
# The shipped JAR and the test classpath must include the actual in-game sprite resource.
test -s assets/runtime/directional-sprites.zip
mkdir -p build/classes/org/beckenburg
cp assets/runtime/directional-sprites.zip build/classes/org/beckenburg/directional-sprites.zip
# Compact v3 ghost sprite archive is committed as nine GitHub-safe binary parts.
# Reassemble deterministically for both tests and the distributable JAR.
# Missing parts are a build failure, not a silent Banshee placeholder.
for n in 00 01 02 03 04 05 06 07 08; do
  test -s "assets/runtime/ghost-sprite-parts/ghost-sprite-expansion-v3.zip.part$n" || {
    echo "Missing ghost sprite part $n"; exit 1;
  }
done
cat assets/runtime/ghost-sprite-parts/ghost-sprite-expansion-v3.zip.part0[0-8] > build/classes/org/beckenburg/ghost-sprite-expansion-v3.zip
# Bundle the verified CC BY 4.0 PSX UI source ZIP with the actual runtime classes.
test -s assets/runtime/ui/psx-horror-ui-free-assets.zip || { echo 'Missing PSX Horror UI runtime archive'; exit 1; }
cp assets/runtime/ui/psx-horror-ui-free-assets.zip build/classes/org/beckenburg/psx-horror-ui-free-assets.zip
mkdir -p build/classes/org/beckenburg/music
for track in "ambient-cold-unresolved-drone.zip" "ambient-sombra-profunda.zip" "castle-candlelit-shadows.zip" "hunt-final-surge.zip" "ritual-final-strike.zip.0" "ritual-final-strike.zip.1" "ritual-of-ash.zip.0" "ritual-of-ash.zip.1"; do
  test -s "assets/runtime/music/$track" || { echo "Missing authored soundtrack $track"; exit 1; }
  cp "assets/runtime/music/$track" "build/classes/org/beckenburg/music/$track"
done
# Optional CC0 NOX recorded Foley subset (only reviewed WAVs, never the 988 MB source ZIP).
if [ -d assets/runtime/sfx ]; then
  mkdir -p build/classes/org/beckenburg/sfx
  for sample in assets/runtime/sfx/*.wav; do
    [ -f "$sample" ] || continue
    cp "$sample" "build/classes/org/beckenburg/sfx/$(basename "$sample")"
  done
fi
# Licensed in-game subset, not the upstream paid PSX asset archive.
mkdir -p build/classes/org/beckenburg/models
for name in light_switch_1 ceiling_lamp_1_off door_1_loose shelf_mp_6 chair_mp_5 ceiling_lamp_1_on cross_mp_2 flashlight_mp_1 armchair_1 sofa_1 dinner_table_1 wardrobe_mp_1 display_cabinet_mp_2 tv_mp_1 tv_table_1_4 lamp_3_on lamp_3_off ceiling_lamp_4_on ceiling_lamp_4_off pc_keyboard_mp_1 vape_mp_1 dosimeter_1 dosimeter_2 walkie_talkie_2 handheld_tablet_1 monitoring_screen_mp_1 pc_mp_1 button_12 book_mp_1 open_book_mp_1 dosimeter_4 walkie_talkie_1 exploration_emf_detector exploration_flashlight exploration_flashlight_poquet exploration_photo_camera exploration_spirit_box exploration_thermal_camera exploration_thermometer exploration_voice_recorder ggbot_car08_van_shell ggbot_car01 ggbot_car05 ggbot_car07 kenney_road_asphalt_straight kenney_road_asphalt_side kenney_road_asphalt_damaged kenney_detail_light_single kenney_detail_dumpster_closed kenney_detail_bench kenney_detail_barrier_type_a blender_sound_recorder_1 blender_sound_recorder_2 blender_sound_recorder_3; do
    test -s "assets/runtime/models/${name}.glb"
    cp "assets/runtime/models/${name}.glb" "build/classes/org/beckenburg/models/${name}.glb"
done
# Deliver all curated Blender equipment housings and their physical state meshes.
# The package acceptance test validates every resource and its real embedded texture.
for model in assets/runtime/models/blender_*.glb; do
    test -s "$model"
    cp "$model" "build/classes/org/beckenburg/models/$(basename "$model")"
done
# Authored environment models and unchanged source texture images.
for name in bed_4 bed_5 bed_1 bed_2 bedside_table_1 toilet_mp_1 carpet_mp_1 photo_frame_mp_1 painting_1 clock_1 wooden_crate_1 pipe_1 book_mp_2 plate_mp_1 lamp_1_on lamp_1_off lamp_2_on lamp_2_off lamp_5_on lamp_5_off ceiling_lamp_2_on ceiling_lamp_2_off ceiling_lamp_mp_1_on ceiling_lamp_mp_1_off; do
    test -s "assets/runtime/models/${name}.glb"
    cp "assets/runtime/models/${name}.glb" "build/classes/org/beckenburg/models/${name}.glb"
done
for model in assets/runtime/models/level_*.glb; do
    test -s "$model"
    cp "$model" "build/classes/org/beckenburg/models/$(basename "$model")"
done
mkdir -p build/classes/org/beckenburg/level-textures
while IFS= read -r name || [ -n "$name" ]; do
    name="${name%$'\r'}"
    test -s "assets/runtime/models/${name}.glb"
    cp "assets/runtime/models/${name}.glb" "build/classes/org/beckenburg/models/${name}.glb"
done < assets/runtime/level-clutter-models.txt
cp assets/runtime/level-textures/*.png build/classes/org/beckenburg/level-textures/
# Manufacture missing tier housings and PSX texture atlases as actual GLBs.
# Deterministic Java 17 authoring; no Python/Blender dependency on Windows.
java -Djava.awt.headless=true -cp build/classes org.beckenburg.TierModelForge build/classes/org/beckenburg/models
# Keep the CC0 source in assets/source; ship only its 15 texture-embedded meshes.
java -Djava.awt.headless=true -cp build/classes org.beckenburg.KenneyMedievalAssets assets/source/kenney_retro-medieval-kit.zip build/classes/org/beckenburg/models

# Preserve offline owner archive support; pin the public CC0 source on first build.
mkdir -p build/source
if [[ -s assets/source/psx_style_cars_by_ggbot_august2023.zip ]]; then
    cp assets/source/psx_style_cars_by_ggbot_august2023.zip build/source/ggbot-original.zip
fi
if [[ ! -s build/source/ggbot-original.zip ]]; then
    curl --fail --location --retry 3 --max-time 50 \
        -o build/source/ggbot-original.zip \
        https://opengameart.org/sites/default/files/psx_style_cars_by_ggbot_august2023.zip
fi
java -Djava.awt.headless=true -cp build/classes org.beckenburg.GgBotVehicleTextures \
    build/source/ggbot-original.zip assets/runtime/models build/classes/org/beckenburg/models
javac --release 17 -encoding UTF-8 -cp build/classes -d build/test src/test/java/org/beckenburg/*.java
# Verify authored multi-storey levels and actual packaged scenery.
for check in AuthoredLevelPhysicsTest AuthoredLevelReachabilityTest AuthoredLevelStateTest AuthoredLevelNetworkTest AuthoredLevelRitualCaseTest AuthoredUtilitiesTest SoloElevationTest EquipmentAssetAssignmentsTest LevelRenderAcceptanceTest WorldViewHandednessTest LevelSurfaceIntegrityTest LivedLevelDressingTest LooseClutterTest LooseClutterNetworkTest; do
    java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg."$check"
done
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.GraphicsOptionsTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.PsxPipelineTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.PsxHorrorUiTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.SoundtrackAudioTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.SoundCoverageTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.HorrorAudioRoutingTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.HorrorAudioRoutingTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.CastleHubIntegrationTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.BeckenburgUpdatesTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.HeldMeshViewTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.GlbPropsTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.EvidenceSignalsTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.MissionWeatherTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.RecordedWeatherTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.HardEvidenceQuotaTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.AncientGhostVariantsTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.AdditionalEvidenceTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.ContractRewardsTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.EmfSilenceTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.GhostWritingTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.EquipmentRegistryTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.EquipmentTiersTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.EquipmentStoreDescriptionsTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.FieldEquipmentTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.InstrumentActivationTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.TieredMediaAndPowerTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.TieredUvAndFirelightTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.ImportedEquipmentModelsTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.PackagedSourceModelsTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.EquipmentModelCatalogTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.FieldSoundRecorderTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanSoundRecorderIntegrationTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.RecorderModelsTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.TierModelForgeTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.VanCargoDoorTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanDotsProjectorsTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.OptionalEvidenceReadingsTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.GhostEvidenceMatrixTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanFieldEquipmentIntegrationTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanMeasuredEvidenceTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.SoloEnvironmentalEvidenceTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.GhostBehaviorTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanGhostIdentityTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanRiteNetworkTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanGhostPursuitTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanGhostHearingTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanGhostHearingIntegrationTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanGhostTakeoverIntegrationTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanCaseDepartureTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanIncapacitationTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanEvidenceJournalTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanCaseFileIntegrationTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanSpatialEvidenceTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanSpatialEvidenceIntegrationTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanIncapacitationHudTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanGuestDepartureIntegrationTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanResumeStoreTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanClientWelcomeTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanHostOwnerRecoveryTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanSecureOwnerAdmissionTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanHostAuthorizationRegressionTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanSessionResumeIntegrationTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanOutboundQueueTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanNetworkLatencyTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanHostAccessIntegrationTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanNetworkDiagnosticsTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanRitualDefenseTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanRitualDefenseIntegrationTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanGhostHearingHudTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanGhostAnimationTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanGhostAnimationIntegrationTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanSoundTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanSoundIntegrationTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanCaseFileHudTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanSoundHudTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanAcousticsTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanGhostSearchTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanGhostLegacyHearingIntegrationTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanGhostSpatialTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanSpatialCombatTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanTelegraphedStrikeTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanTelegraphedStrikeIntegrationTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanTelegraphedHudTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanApparitionTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.GhostSpriteAtlasIntegrationTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.DirectionalSpritesIntegrationTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanApparitionRenderTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanApparitionIntegrationTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanGhostIntegrationTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.MouseLookTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanWorldControlsTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.EquipmentSelectionTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.SiteSelectionTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.InvestigationSitesTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.GrandSiteGeometryTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.ArchitecturalPlansTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.VictorianHouseArchitectureTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanSiteSelectionIntegrationTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.CameraAimTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.EquipmentSightTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.SoloEquipmentUseTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.BeckenburgInstallIdentityTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.BeckenburgProfileImportTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.GameplaySmokeTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanFieldJournalIntegrationTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.VanHidingTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.VanTelemetryTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.FieldSuppliesTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.CustomContractTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LobbyGhostAvatarTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanHunterNameplateTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanPrivateHunterNamesTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanChatTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanChatIntegrationTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanVoiceCodecTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanVoiceRelayTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanVoiceHostIntegrationTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanVoiceClientHandshakeTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanGhostLobbySecrecyTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanSixHunterVanTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.GhostActiveBehaviorTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.FieldJournalTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.ManualEvidenceJournalTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.VanDiegeticCrtTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.ManualEvidenceHudTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.GhostTraitsTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.HunterCountersTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.GhostDomainTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.GhostFrenzyTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.MaterialAtlasTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.TeamCalloutTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.VanStagingTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.VanNavigationVisualTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.GhostPracticeTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanProtocolTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanClientDisconnectTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanGracefulLeaveTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanCaseTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanCaseIntegrationTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanWorldTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanWorldIntegrationTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanWorldRenderTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanLobbyTest
if [ -f src/test/java/org/beckenburg/SmokeTest.java ]; then java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.SmokeTest; fi
jar --create --file build/beckenburg-game.jar --main-class org.beckenburg.InvestigationGame -C build/classes org/beckenburg
printf '%s\n' 'Built build/beckenburg-game.jar'
if [ "${1:-}" = run ]; then java -jar build/beckenburg-game.jar; fi
