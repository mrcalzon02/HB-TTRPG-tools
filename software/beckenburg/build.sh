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
# Licensed in-game subset, not the upstream paid PSX asset archive.
mkdir -p build/classes/org/beckenburg/models
for name in light_switch_1 ceiling_lamp_1_off door_1_loose shelf_mp_6 chair_mp_5 ceiling_lamp_1_on cross_mp_2 flashlight_mp_1; do
    test -s "assets/runtime/models/${name}.glb"
    cp "assets/runtime/models/${name}.glb" "build/classes/org/beckenburg/models/${name}.glb"
done
javac --release 17 -encoding UTF-8 -cp build/classes -d build/test src/test/java/org/beckenburg/*.java
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.HeldMeshViewTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.GlbPropsTest
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
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.DirectionalSpritesIntegrationTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanApparitionRenderTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanApparitionIntegrationTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanGhostIntegrationTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.MouseLookTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanWorldControlsTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.EquipmentSelectionTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.SiteSelectionTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.CameraAimTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.EquipmentSightTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.SoloEquipmentUseTest
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
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.GhostTraitsTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.HunterCountersTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.GhostDomainTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.MaterialAtlasTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.TeamCalloutTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.VanStagingTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.VanNavigationVisualTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.GhostPracticeTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanProtocolTest
java -Djava.awt.headless=true -ea -cp build/classes:build/test org.beckenburg.LanClientDisconnectTest
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
