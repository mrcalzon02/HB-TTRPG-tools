@echo off
setlocal
cd /d "%~dp0"
where javac >nul 2>nul || (echo Java 17+ JDK required & exit /b 1)
if exist build\classes rmdir /s /q build\classes
if exist build\test rmdir /s /q build\test
if not exist build\classes mkdir build\classes
if not exist build\test mkdir build\test
> build\sources-main.txt (
  for %%F in (src\main\java\org\beckenburg\*.java) do @echo "src/main/java/org/beckenburg/%%~nxF"
)
> build\sources-tests.txt (
  for %%F in (src\test\java\org\beckenburg\*.java) do @echo "src/test/java/org/beckenburg/%%~nxF"
)
javac --release 17 -encoding UTF-8 -d build\classes @build\sources-main.txt || exit /b 1
if not exist assets\runtime\directional-sprites.zip (echo ERROR: required in-game sprite assets missing & exit /b 1)
if not exist build\classes\org\beckenburg mkdir build\classes\org\beckenburg
copy /Y assets\runtime\directional-sprites.zip build\classes\org\beckenburg\directional-sprites.zip >nul || exit /b 1
if not exist build\classes\org\beckenburg\models mkdir build\classes\org\beckenburg\models
for %%M in (light_switch_1 ceiling_lamp_1_off door_1_loose shelf_mp_6 chair_mp_5 ceiling_lamp_1_on cross_mp_2 flashlight_mp_1) do (
  if not exist assets\runtime\models\%%M.glb (echo ERROR: required licensed model %%M missing & exit /b 1)
  copy /Y assets\runtime\models\%%M.glb build\classes\org\beckenburg\models\%%M.glb >nul || exit /b 1
)
javac --release 17 -encoding UTF-8 -cp build\classes -d build\test @build\sources-tests.txt || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.CastleHubIntegrationTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.BeckenburgUpdatesTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.HeldMeshViewTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.GlbPropsTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.EvidenceSignalsTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.EmfSilenceTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.GhostWritingTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.EquipmentRegistryTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanMeasuredEvidenceTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.SoloEnvironmentalEvidenceTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.GhostBehaviorTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanGhostIdentityTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanRiteNetworkTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanGhostPursuitTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanGhostHearingTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanGhostHearingIntegrationTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanGhostTakeoverIntegrationTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanCaseDepartureTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanIncapacitationTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanEvidenceJournalTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanCaseFileIntegrationTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanSpatialEvidenceTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanSpatialEvidenceIntegrationTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanIncapacitationHudTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanGuestDepartureIntegrationTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanResumeStoreTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanClientWelcomeTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanHostOwnerRecoveryTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanSecureOwnerAdmissionTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanHostAuthorizationRegressionTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanSessionResumeIntegrationTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanOutboundQueueTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanNetworkLatencyTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanHostAccessIntegrationTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanNetworkDiagnosticsTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanRitualDefenseTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanRitualDefenseIntegrationTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanGhostHearingHudTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanGhostAnimationTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanGhostAnimationIntegrationTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanSoundTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanSoundIntegrationTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanCaseFileHudTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanSoundHudTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanAcousticsTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanGhostSearchTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanGhostLegacyHearingIntegrationTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanGhostSpatialTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanSpatialCombatTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanTelegraphedStrikeTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanTelegraphedStrikeIntegrationTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanTelegraphedHudTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanApparitionTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.DirectionalSpritesIntegrationTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanApparitionRenderTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanApparitionIntegrationTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanGhostIntegrationTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.MouseLookTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanWorldControlsTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.EquipmentSelectionTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.SiteSelectionTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.SoloEquipmentUseTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.CameraAimTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.EquipmentSightTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.BeckenburgInstallIdentityTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.BeckenburgProfileImportTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.GameplaySmokeTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanFieldJournalIntegrationTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.VanHidingTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.VanTelemetryTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.FieldSuppliesTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.CustomContractTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LobbyGhostAvatarTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanHunterNameplateTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanPrivateHunterNamesTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanChatTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanChatIntegrationTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanVoiceCodecTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanVoiceRelayTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanVoiceHostIntegrationTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanVoiceClientHandshakeTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanGhostLobbySecrecyTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanSixHunterVanTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.GhostActiveBehaviorTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.FieldJournalTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.ManualEvidenceJournalTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.GhostEvidenceMatrixTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.ManualEvidenceHudTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.GhostTraitsTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.HunterCountersTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.GhostDomainTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.MaterialAtlasTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.TeamCalloutTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.VanStagingTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.VanNavigationVisualTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.GhostPracticeTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanProtocolTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanClientDisconnectTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanCaseTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanCaseIntegrationTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanWorldTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanWorldIntegrationTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanWorldRenderTest || exit /b 1
java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.LanLobbyTest || exit /b 1
if exist src\test\java\org\beckenburg\SmokeTest.java java -Djava.awt.headless=true -ea -cp build\classes;build\test org.beckenburg.SmokeTest || exit /b 1
jar --create --file build\beckenburg-game.jar --main-class org.beckenburg.InvestigationGame -C build\classes org\beckenburg || exit /b 1
echo Built build\beckenburg-game.jar
if /I "%~1"=="run" java -jar build\beckenburg-game.jar
